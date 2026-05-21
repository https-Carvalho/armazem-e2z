import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { listarProdutosComStock } from "./catalogo";
import { decimal, validarQuantidade } from "./quantidades";
import { podeAlterarStock } from "./permissoes";

export async function concluirContagem(db: PrismaClient, input: {
  utilizadorId: number;
  linhas: Array<{ produtoId: number; contado: string; justificacao?: string }>;
}) {
  if (!input.linhas.length) return { ok: false as const, errors: ["Preenche pelo menos uma contagem."] };

  return db.$transaction(async (tx) => {
    const utilizador = await tx.utilizador.findUnique({ where: { id: input.utilizadorId } });
    if (!utilizador) return { ok: false as const, errors: ["Utilizador demo nao encontrado."] };
    if (!podeAlterarStock(utilizador.perfil)) return { ok: false as const, errors: ["Este perfil nao pode concluir contagens."] };

    const produtosComStock = await listarProdutosComStock(tx, utilizador.perfil);
    const errors: string[] = [];
    const prepared: Array<{
      produtoId: number;
      esperado: Prisma.Decimal;
      contado: Prisma.Decimal;
      desvio: Prisma.Decimal;
      justificacao: string | null;
    }> = [];

    for (const [index, linha] of input.linhas.entries()) {
      const produto = produtosComStock.find((item) => item.id === linha.produtoId);
      if (!produto) {
        errors.push(`Linha ${index + 1}: produto nao encontrado.`);
        continue;
      }

      const quantidade = validarQuantidade({
        quantidade: linha.contado,
        unidade: produto.unidade,
        incrementoQuantidade: produto.incremento_quantidade,
      });

      if (!quantidade.ok) {
        errors.push(`Linha ${index + 1}: ${quantidade.error}`);
        continue;
      }

      const esperado = decimal(produto.em_armazem);
      const desvio = quantidade.value.minus(esperado);
      const justificacao = linha.justificacao?.trim() || null;

      if (!desvio.eq(0) && !justificacao) {
        errors.push(`Linha ${index + 1}: justifica o desvio de contagem.`);
        continue;
      }

      prepared.push({ produtoId: produto.id, esperado, contado: quantidade.value, desvio, justificacao });
    }

    if (errors.length) return { ok: false as const, errors };

    const sessao = await tx.sessaoContagem.create({
      data: { criado_por_id: utilizador.id, estado: "ABERTA" },
    });

    let movimentosCriados = 0;
    for (const linha of prepared) {
      await tx.linhaContagem.create({
        data: {
          sessao_contagem_id: sessao.id,
          produto_id: linha.produtoId,
          quantidade_esperada: linha.esperado,
          quantidade_contada: linha.contado,
          desvio: linha.desvio,
          justificacao: linha.justificacao,
        },
      });

      if (!linha.desvio.eq(0)) {
        await tx.movimento.create({
          data: {
            produto_id: linha.produtoId,
            tipo: "AJUSTE_CONTAGEM",
            quantidade: linha.desvio,
            utilizador_id: utilizador.id,
            sessao_contagem_id: sessao.id,
            motivo: linha.justificacao,
            notas: "Ajuste gerado por contagem fisica",
          },
        });
        await tx.produto.update({ where: { id: linha.produtoId }, data: { versao: { increment: 1 } } });
        movimentosCriados++;
      }
    }

    await tx.sessaoContagem.update({
      where: { id: sessao.id },
      data: { estado: "CONCLUIDA", concluido_em: new Date() },
    });

    return { ok: true as const, sessaoId: sessao.id, movimentosCriados };
  }, { isolationLevel: "Serializable" });
}
