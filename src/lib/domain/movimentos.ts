import { Prisma, type Perfil, type PrismaClient, type Proprietario, type TipoMovimento } from "@/generated/prisma/client";
import { podeAlterarStock, podeAnularMovimentos, podeAutorizarExcecao } from "./permissoes";
import { getStockMap } from "./catalogo";
import { decimal, validarQuantidade } from "./quantidades";

type Tx = Prisma.TransactionClient | PrismaClient;

export type TipoSaidaDemo = "NORMAL" | "EMERGENCIA_EREDES" | "OVERRIDE_E2Z";

export type SaidaLinhaInput = {
  produtoId: number;
  quantidade: string;
};

export function validarLinhaSaida(input: {
  perfil: Perfil;
  proprietario: Proprietario;
  stockAtual: Prisma.Decimal;
  quantidade: Prisma.Decimal;
  tipo: TipoSaidaDemo;
  motivo: string;
}) {
  const insuficiente = input.quantidade.gt(input.stockAtual);

  if (!podeAlterarStock(input.perfil)) {
    return { ok: false as const, error: "Este perfil nao pode alterar stock." };
  }

  if (!insuficiente && input.tipo === "NORMAL") {
    return { ok: true as const, flags: { emergencia: false, override_operacional: false } };
  }

  if (input.tipo === "NORMAL") {
    return { ok: false as const, error: "Stock insuficiente. Pede autorizacao a Gestor/Admin." };
  }

  if (!podeAutorizarExcecao(input.perfil)) {
    return { ok: false as const, error: "Apenas Admin/Gestor pode autorizar excecoes." };
  }

  if (!input.motivo.trim()) {
    return { ok: false as const, error: "O motivo da autorizacao e obrigatorio." };
  }

  if (input.tipo === "EMERGENCIA_EREDES") {
    if (input.proprietario !== "E_REDES") {
      return { ok: false as const, error: "Emergencia E-Redes so se aplica a materiais E-Redes." };
    }
    return { ok: true as const, flags: { emergencia: true, override_operacional: false } };
  }

  if (input.tipo === "OVERRIDE_E2Z") {
    if (input.proprietario !== "E2Z") {
      return { ok: false as const, error: "Override operacional E2Z so se aplica a materiais E2Z." };
    }
    return { ok: true as const, flags: { emergencia: false, override_operacional: true } };
  }

  return { ok: false as const, error: "Tipo de saida invalido." };
}

export async function registarEntrada(tx: Tx, input: {
  utilizadorId: number;
  produtoId: number;
  quantidade: string;
  notas?: string;
}) {
  const [utilizador, produto] = await Promise.all([
    tx.utilizador.findUnique({ where: { id: input.utilizadorId } }),
    tx.produto.findUnique({ where: { id: input.produtoId } }),
  ]);

  if (!utilizador) return { ok: false as const, errors: ["Utilizador demo nao encontrado."] };
  if (!produto) return { ok: false as const, errors: ["Produto nao encontrado."] };
  if (!podeAlterarStock(utilizador.perfil)) return { ok: false as const, errors: ["Este perfil nao pode registar entradas."] };

  const quantidade = validarQuantidade({
    quantidade: input.quantidade,
    unidade: produto.unidade,
    incrementoQuantidade: produto.incremento_quantidade.toString(),
  });

  if (!quantidade.ok) return { ok: false as const, errors: [quantidade.error] };

  await tx.movimento.create({
    data: {
      produto_id: produto.id,
      tipo: "ENTRADA",
      quantidade: quantidade.value,
      utilizador_id: utilizador.id,
      notas: input.notas || null,
    },
  });

  await tx.produto.update({ where: { id: produto.id }, data: { versao: { increment: 1 } } });

  return { ok: true as const, movimentosCriados: 1 };
}

export async function anularMovimento(db: PrismaClient, input: {
  utilizadorId: number;
  movimentoId: number;
  motivo: string;
}) {
  return db.$transaction(async (tx) => {
    const utilizador = await tx.utilizador.findUnique({ where: { id: input.utilizadorId } });
    if (!utilizador) return { ok: false as const, errors: ["Utilizador demo nao encontrado."] };
    if (!podeAnularMovimentos(utilizador.perfil)) {
      return { ok: false as const, errors: ["Apenas Admin pode anular movimentos nesta demo."] };
    }
    if (!input.motivo.trim()) return { ok: false as const, errors: ["O motivo da anulacao e obrigatorio."] };

    const movimento = await tx.movimento.findUnique({ where: { id: input.movimentoId }, include: { produto: true } });
    if (!movimento) return { ok: false as const, errors: ["Movimento nao encontrado."] };
    if (movimento.tipo === "ANULACAO") return { ok: false as const, errors: ["Nao e possivel anular uma anulacao."] };

    const anulacaoExistente = await tx.movimento.findFirst({
      where: { tipo: "ANULACAO", notas: { contains: `movimento #${movimento.id}` } },
    });
    if (anulacaoExistente) return { ok: false as const, errors: ["Este movimento ja foi anulado."] };

    const anulacao = await tx.movimento.create({
      data: {
        produto_id: movimento.produto_id,
        tipo: "ANULACAO",
        quantidade: movimento.quantidade.negated(),
        utilizador_id: utilizador.id,
        motivo: input.motivo.trim(),
        notas: `Anulacao do movimento #${movimento.id}`,
      },
    });

    await tx.produto.update({ where: { id: movimento.produto_id }, data: { versao: { increment: 1 } } });

    return { ok: true as const, movimentoId: anulacao.id };
  }, { isolationLevel: "Serializable" });
}

export async function registarSaidaBatch(db: PrismaClient, input: {
  utilizadorId: number;
  tipo: TipoSaidaDemo;
  motivo?: string;
  notas?: string;
  linhas: SaidaLinhaInput[];
}) {
  if (!input.linhas.length) return { ok: false as const, errors: ["Adiciona pelo menos uma linha."] };

  return db.$transaction(async (tx) => {
    const utilizador = await tx.utilizador.findUnique({ where: { id: input.utilizadorId } });
    if (!utilizador) return { ok: false as const, errors: ["Utilizador demo nao encontrado."] };

    const produtoIds = input.linhas.map((linha) => linha.produtoId);
    const produtos = await tx.produto.findMany({ where: { id: { in: produtoIds }, ativo: true } });
    const stockMap = await getStockMap(tx, produtoIds);
    const errors: string[] = [];
    const prepared: Array<{
      produtoId: number;
      quantidade: Prisma.Decimal;
      flags: { emergencia: boolean; override_operacional: boolean };
    }> = [];

    for (const [index, linha] of input.linhas.entries()) {
      const produto = produtos.find((item) => item.id === linha.produtoId);
      if (!produto) {
        errors.push(`Linha ${index + 1}: produto nao encontrado.`);
        continue;
      }

      const quantidade = validarQuantidade({
        quantidade: linha.quantidade,
        unidade: produto.unidade,
        incrementoQuantidade: produto.incremento_quantidade.toString(),
      });

      if (!quantidade.ok) {
        errors.push(`Linha ${index + 1}: ${quantidade.error}`);
        continue;
      }

      const validacao = validarLinhaSaida({
        perfil: utilizador.perfil,
        proprietario: produto.proprietario,
        stockAtual: stockMap.get(produto.id) ?? decimal(0),
        quantidade: quantidade.value,
        tipo: input.tipo,
        motivo: input.motivo ?? "",
      });

      if (!validacao.ok) {
        errors.push(`Linha ${index + 1}: ${validacao.error}`);
        continue;
      }

      prepared.push({ produtoId: produto.id, quantidade: quantidade.value, flags: validacao.flags });
    }

    if (errors.length) return { ok: false as const, errors };

    for (const linha of prepared) {
      await tx.movimento.create({
        data: {
          produto_id: linha.produtoId,
          tipo: "SAIDA",
          quantidade: linha.quantidade.negated(),
          utilizador_id: utilizador.id,
          autorizado_por_id: linha.flags.emergencia || linha.flags.override_operacional ? utilizador.id : null,
          emergencia: linha.flags.emergencia,
          override_operacional: linha.flags.override_operacional,
          motivo: input.motivo || null,
          notas: input.notas || null,
        },
      });
      await tx.produto.update({ where: { id: linha.produtoId }, data: { versao: { increment: 1 } } });
    }

    return { ok: true as const, movimentosCriados: prepared.length };
  }, { isolationLevel: "Serializable" });
}

export function tipoMovimentoLabel(tipo: TipoMovimento) {
  const labels: Record<TipoMovimento, string> = {
    ABERTURA: "Abertura",
    ENTRADA: "Entrada",
    SAIDA: "Saida",
    AJUSTE_CONTAGEM: "Ajuste de contagem",
    ANULACAO: "Anulacao",
  };
  return labels[tipo];
}
