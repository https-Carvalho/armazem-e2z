import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getStockMap } from "./catalogo";
import { podeGerirRequisicoes } from "./permissoes";
import { validarQuantidade } from "./quantidades";

export async function criarRequisicaoSugerida(db: PrismaClient, input: { utilizadorId: number }) {
  return db.$transaction(async (tx) => {
    const utilizador = await tx.utilizador.findUnique({ where: { id: input.utilizadorId } });
    if (!utilizador) return { ok: false as const, errors: ["Utilizador demo nao encontrado."] };
    if (!podeGerirRequisicoes(utilizador.perfil)) {
      return { ok: false as const, errors: ["Apenas Admin/Gestor pode criar requisicoes sugeridas."] };
    }

    const produtos = await tx.produto.findMany({ where: { ativo: true, stock_max: { not: null } } });
    const stockMap = await getStockMap(tx, produtos.map((produto) => produto.id));
    const linhas = produtos
      .map((produto) => {
        const stock = stockMap.get(produto.id) ?? new Prisma.Decimal(0);
        const sugerida = Prisma.Decimal.max(new Prisma.Decimal(0), produto.stock_max!.minus(stock));
        return { produto, stock, sugerida };
      })
      .filter(({ produto, stock, sugerida }) => stock.lt(produto.stock_min) && sugerida.gt(0));

    if (!linhas.length) return { ok: false as const, errors: ["Nao ha produtos elegiveis para sugestao automatica."] };

    const requisicao = await tx.requisicao.create({
      data: {
        criado_por_id: utilizador.id,
        estado: "CONFIRMADA",
        notas: "Requisicao sugerida automaticamente pela demo",
        confirmado_em: new Date(),
        linhas: {
          create: linhas.map(({ produto, sugerida }) => ({
            produto_id: produto.id,
            quantidade_sugerida: sugerida,
            quantidade_pedida: sugerida,
          })),
        },
      },
    });

    return { ok: true as const, requisicaoId: requisicao.id, linhasCriadas: linhas.length };
  });
}

export async function criarRequisicaoManual(db: PrismaClient, input: {
  utilizadorId: number;
  notas?: string;
  linhas: Array<{ produtoId: number; quantidade: string }>;
}) {
  return db.$transaction(async (tx) => {
    const utilizador = await tx.utilizador.findUnique({ where: { id: input.utilizadorId } });
    if (!utilizador) return { ok: false as const, errors: ["Utilizador demo nao encontrado."] };
    if (!podeGerirRequisicoes(utilizador.perfil)) {
      return { ok: false as const, errors: ["Apenas Admin/Gestor pode criar requisicoes."] };
    }

    const linhasInput = input.linhas.filter((linha) => linha.produtoId && linha.quantidade.trim());
    if (!linhasInput.length) {
      return { ok: false as const, errors: ["Adiciona pelo menos uma linha com produto e quantidade."] };
    }

    const produtoIds = [...new Set(linhasInput.map((linha) => linha.produtoId))];
    const produtos = await tx.produto.findMany({ where: { id: { in: produtoIds }, ativo: true } });
    const produtoMap = new Map(produtos.map((produto) => [produto.id, produto]));

    const linhasValidadas = [];
    const errors: string[] = [];

    for (const linha of linhasInput) {
      const produto = produtoMap.get(linha.produtoId);
      if (!produto) {
        errors.push(`Produto ${linha.produtoId} nao encontrado ou inativo.`);
        continue;
      }

      const quantidade = validarQuantidade({
        quantidade: linha.quantidade,
        unidade: produto.unidade,
        incrementoQuantidade: produto.incremento_quantidade.toString(),
      });
      if (!quantidade.ok) {
        errors.push(`${produto.nome}: ${quantidade.error}`);
        continue;
      }

      linhasValidadas.push({ produto, quantidade: quantidade.value });
    }

    if (errors.length) return { ok: false as const, errors };

    const requisicao = await tx.requisicao.create({
      data: {
        criado_por_id: utilizador.id,
        estado: "CONFIRMADA",
        notas: input.notas?.trim() || "Requisicao manual criada na demo",
        confirmado_em: new Date(),
        linhas: {
          create: linhasValidadas.map(({ produto, quantidade }) => ({
            produto_id: produto.id,
            quantidade_sugerida: new Prisma.Decimal(0),
            quantidade_pedida: quantidade,
          })),
        },
      },
    });

    return { ok: true as const, requisicaoId: requisicao.id, linhasCriadas: linhasValidadas.length };
  });
}

export async function receberLinhaRequisicao(db: PrismaClient, input: {
  utilizadorId: number;
  linhaId: number;
  quantidade: string;
}) {
  return db.$transaction(async (tx) => {
    const utilizador = await tx.utilizador.findUnique({ where: { id: input.utilizadorId } });
    if (!utilizador) return { ok: false as const, errors: ["Utilizador demo nao encontrado."] };
    if (!podeGerirRequisicoes(utilizador.perfil)) {
      return { ok: false as const, errors: ["Apenas Admin/Gestor pode receber requisicoes."] };
    }

    const linha = await tx.linhaRequisicao.findUnique({
      where: { id: input.linhaId },
      include: { produto: true, requisicao: { include: { linhas: true } } },
    });
    if (!linha) return { ok: false as const, errors: ["Linha de requisicao nao encontrada."] };
    if (linha.requisicao.estado === "CANCELADA") {
      return { ok: false as const, errors: ["Nao e possivel receber uma requisicao cancelada."] };
    }
    if (linha.estado === "RECEBIDA_TOTAL") {
      return { ok: false as const, errors: ["Esta linha ja foi recebida na totalidade."] };
    }

    const quantidade = validarQuantidade({
      quantidade: input.quantidade,
      unidade: linha.produto.unidade,
      incrementoQuantidade: linha.produto.incremento_quantidade.toString(),
    });
    if (!quantidade.ok) return { ok: false as const, errors: [quantidade.error] };

    const totalRecebido = linha.quantidade_recebida.plus(quantidade.value);
    if (totalRecebido.gt(linha.quantidade_pedida)) {
      const restante = linha.quantidade_pedida.minus(linha.quantidade_recebida);
      return { ok: false as const, errors: [`A quantidade recebida excede o pedido. Restante: ${restante.toString()} ${linha.produto.unidade}.`] };
    }

    const estado = totalRecebido.gte(linha.quantidade_pedida) ? "RECEBIDA_TOTAL" : "RECEBIDA_PARCIAL";

    await tx.movimento.create({
      data: {
        produto_id: linha.produto_id,
        tipo: "ENTRADA",
        quantidade: quantidade.value,
        utilizador_id: utilizador.id,
        linha_requisicao_id: linha.id,
        notas: `Rececao da requisicao #${linha.requisicao_id}`,
      },
    });

    await tx.linhaRequisicao.update({
      where: { id: linha.id },
      data: { quantidade_recebida: totalRecebido, estado },
    });
    await tx.produto.update({ where: { id: linha.produto_id }, data: { versao: { increment: 1 } } });

    const linhasAtualizadas = await tx.linhaRequisicao.findMany({ where: { requisicao_id: linha.requisicao_id } });
    const novoEstadoReq = linhasAtualizadas.every((item) => item.id === linha.id ? estado === "RECEBIDA_TOTAL" : item.estado === "RECEBIDA_TOTAL")
      ? "RECEBIDA_TOTAL"
      : "RECEBIDA_PARCIAL";

    await tx.requisicao.update({ where: { id: linha.requisicao_id }, data: { estado: novoEstadoReq } });

    return { ok: true as const, estadoLinha: estado, estadoRequisicao: novoEstadoReq };
  }, { isolationLevel: "Serializable" });
}

export async function atualizarLinhaRequisicao(db: PrismaClient, input: {
  utilizadorId: number;
  linhaId: number;
  quantidadePedida: string;
}) {
  return db.$transaction(async (tx) => {
    const utilizador = await tx.utilizador.findUnique({ where: { id: input.utilizadorId } });
    if (!utilizador) return { ok: false as const, errors: ["Utilizador demo nao encontrado."] };
    if (!podeGerirRequisicoes(utilizador.perfil)) {
      return { ok: false as const, errors: ["Apenas Admin/Gestor pode editar requisicoes."] };
    }

    const linha = await tx.linhaRequisicao.findUnique({
      where: { id: input.linhaId },
      include: { produto: true, requisicao: true },
    });
    if (!linha) return { ok: false as const, errors: ["Linha de requisicao nao encontrada."] };
    if (linha.requisicao.estado === "CANCELADA" || linha.requisicao.estado === "RECEBIDA_TOTAL") {
      return { ok: false as const, errors: ["Esta requisicao ja nao pode ser editada."] };
    }
    if (linha.quantidade_recebida.gt(0)) {
      return { ok: false as const, errors: ["Linhas ja recebidas nao podem alterar a quantidade pedida."] };
    }

    const quantidade = validarQuantidade({
      quantidade: input.quantidadePedida,
      unidade: linha.produto.unidade,
      incrementoQuantidade: linha.produto.incremento_quantidade.toString(),
    });
    if (!quantidade.ok) return { ok: false as const, errors: [quantidade.error] };

    await tx.linhaRequisicao.update({
      where: { id: linha.id },
      data: { quantidade_pedida: quantidade.value },
    });

    return { ok: true as const, linhaId: linha.id };
  });
}

export async function removerLinhaRequisicao(db: PrismaClient, input: {
  utilizadorId: number;
  linhaId: number;
}) {
  return db.$transaction(async (tx) => {
    const utilizador = await tx.utilizador.findUnique({ where: { id: input.utilizadorId } });
    if (!utilizador) return { ok: false as const, errors: ["Utilizador demo nao encontrado."] };
    if (!podeGerirRequisicoes(utilizador.perfil)) {
      return { ok: false as const, errors: ["Apenas Admin/Gestor pode remover linhas."] };
    }

    const linha = await tx.linhaRequisicao.findUnique({ where: { id: input.linhaId }, include: { requisicao: true } });
    if (!linha) return { ok: false as const, errors: ["Linha de requisicao nao encontrada."] };
    if (linha.quantidade_recebida.gt(0)) {
      return { ok: false as const, errors: ["Linhas ja recebidas nao podem ser removidas."] };
    }
    if (linha.requisicao.estado === "CANCELADA" || linha.requisicao.estado === "RECEBIDA_TOTAL") {
      return { ok: false as const, errors: ["Esta requisicao ja nao pode ser editada."] };
    }

    const totalLinhas = await tx.linhaRequisicao.count({ where: { requisicao_id: linha.requisicao_id } });
    if (totalLinhas <= 1) return { ok: false as const, errors: ["A requisicao deve manter pelo menos uma linha."] };

    await tx.linhaRequisicao.delete({ where: { id: linha.id } });
    return { ok: true as const, requisicaoId: linha.requisicao_id };
  });
}

export async function cancelarRequisicao(db: PrismaClient, input: {
  utilizadorId: number;
  requisicaoId: number;
}) {
  return db.$transaction(async (tx) => {
    const utilizador = await tx.utilizador.findUnique({ where: { id: input.utilizadorId } });
    if (!utilizador) return { ok: false as const, errors: ["Utilizador demo nao encontrado."] };
    if (!podeGerirRequisicoes(utilizador.perfil)) {
      return { ok: false as const, errors: ["Apenas Admin/Gestor pode cancelar requisicoes."] };
    }

    const requisicao = await tx.requisicao.findUnique({
      where: { id: input.requisicaoId },
      include: { linhas: true },
    });
    if (!requisicao) return { ok: false as const, errors: ["Requisicao nao encontrada."] };
    if (requisicao.estado === "CANCELADA") return { ok: false as const, errors: ["A requisicao ja esta cancelada."] };
    if (requisicao.linhas.some((linha) => linha.quantidade_recebida.gt(0))) {
      return { ok: false as const, errors: ["Requisicoes com rececoes registadas nao podem ser canceladas nesta demo."] };
    }

    await tx.requisicao.update({ where: { id: requisicao.id }, data: { estado: "CANCELADA" } });
    return { ok: true as const, requisicaoId: requisicao.id };
  });
}
