"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Perfil, Proprietario, Unidade } from "@/generated/prisma/client";
import { getDemoState, listarProdutosComStock } from "@/lib/domain/catalogo";
import { concluirContagem } from "@/lib/domain/contagens";
import { anularMovimento, registarEntrada, registarSaidaBatch, type TipoSaidaDemo } from "@/lib/domain/movimentos";
import { criarProduto, atualizarProduto, definirProdutoAtivo } from "@/lib/domain/produtos";
import {
  atualizarLinhaRequisicao,
  cancelarRequisicao,
  confirmarRequisicao,
  criarRequisicaoManual,
  criarRequisicaoSugerida,
  receberLinhaRequisicao,
  removerLinhaRequisicao,
} from "@/lib/domain/requisicoes";
import type { ActionResult, DemoState, ProdutoComStock } from "@/lib/domain/types";

const pathsToRevalidate = ["/", "/catalogo", "/entradas", "/saidas", "/contagens", "/requisicoes", "/historico"];

function revalidateDemo() {
  for (const path of pathsToRevalidate) revalidatePath(path);
}

async function getUserIdByPerfil(perfil: Perfil) {
  const user = await prisma.utilizador.findFirst({ where: { perfil }, orderBy: { id: "asc" } });
  if (!user) throw new Error(`Utilizador demo com perfil ${perfil} nao encontrado. Corre o seed da demo.`);
  return user.id;
}

function toErrors(error: unknown) {
  if (error instanceof Error) return [error.message];
  return ["Erro inesperado na demo."];
}

export async function getDemoStateAction(perfil: Perfil): Promise<ActionResult<DemoState>> {
  try {
    const data = await getDemoState(prisma, perfil);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function listarProdutosAction(perfil: Perfil, search = ""): Promise<ActionResult<ProdutoComStock[]>> {
  try {
    const data = await listarProdutosComStock(prisma, perfil, search);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function criarProdutoAction(input: {
  perfil: Perfil;
  nome: string;
  codigo_e2z?: string | null;
  codigo_edp?: string | null;
  capitulo?: string | null;
  artigo?: string | null;
  proprietario: Proprietario;
  unidade: Unidade;
  dimensao_tecnica?: string | null;
  stock_min: string;
  stock_max?: string | null;
  incremento_quantidade: string;
  stock_inicial?: string | null;
}): Promise<ActionResult<{ produtoId: number }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(input.perfil);
    const result = await criarProduto(prisma, { ...input, utilizadorId });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return { ok: true, data: { produtoId: result.produtoId }, message: "Produto criado." };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function atualizarProdutoAction(input: {
  perfil: Perfil;
  produtoId: number;
  nome: string;
  codigo_e2z?: string | null;
  codigo_edp?: string | null;
  capitulo?: string | null;
  artigo?: string | null;
  proprietario: Proprietario;
  unidade: Unidade;
  dimensao_tecnica?: string | null;
  stock_min: string;
  stock_max?: string | null;
  incremento_quantidade: string;
}): Promise<ActionResult<{ produtoId: number }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(input.perfil);
    const result = await atualizarProduto(prisma, { ...input, utilizadorId });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return { ok: true, data: { produtoId: result.produtoId }, message: "Produto atualizado." };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function definirProdutoAtivoAction(input: {
  perfil: Perfil;
  produtoId: number;
  ativo: boolean;
}): Promise<ActionResult<{ produtoId: number; ativo: boolean }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(input.perfil);
    const result = await definirProdutoAtivo(prisma, { ...input, utilizadorId });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return { ok: true, data: { produtoId: result.produtoId, ativo: result.ativo }, message: result.ativo ? "Produto reativado." : "Produto desativado." };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function registarEntradaAction(input: {
  perfil: Perfil;
  produtoId: number;
  quantidade: string;
  notas?: string;
}): Promise<ActionResult<{ movimentosCriados: number }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(input.perfil);
    const result = await registarEntrada(prisma, {
      utilizadorId,
      produtoId: input.produtoId,
      quantidade: input.quantidade,
      notas: input.notas,
    });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return { ok: true, data: { movimentosCriados: result.movimentosCriados }, message: "Entrada registada." };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function registarSaidaAction(input: {
  perfil: Perfil;
  tipo: TipoSaidaDemo;
  motivo?: string;
  notas?: string;
  linhas: Array<{ produtoId: number; quantidade: string }>;
}): Promise<ActionResult<{ movimentosCriados: number }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(input.perfil);
    const result = await registarSaidaBatch(prisma, {
      utilizadorId,
      tipo: input.tipo,
      motivo: input.motivo,
      notas: input.notas,
      linhas: input.linhas,
    });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return { ok: true, data: { movimentosCriados: result.movimentosCriados }, message: "Saida registada." };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function concluirContagemAction(input: {
  perfil: Perfil;
  linhas: Array<{ produtoId: number; contado: string; justificacao?: string }>;
}): Promise<ActionResult<{ sessaoId: number; movimentosCriados: number }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(input.perfil);
    const result = await concluirContagem(prisma, { utilizadorId, linhas: input.linhas });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return {
      ok: true,
      data: { sessaoId: result.sessaoId, movimentosCriados: result.movimentosCriados },
      message: "Contagem concluida.",
    };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function criarRequisicaoSugeridaAction(perfil: Perfil): Promise<ActionResult<{ requisicaoId: number; linhasCriadas: number }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(perfil);
    const result = await criarRequisicaoSugerida(prisma, { utilizadorId });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return {
      ok: true,
      data: { requisicaoId: result.requisicaoId, linhasCriadas: result.linhasCriadas },
      message: "Requisicao sugerida criada.",
    };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function criarRequisicaoManualAction(input: {
  perfil: Perfil;
  notas?: string;
  linhas: Array<{ produtoId: number; quantidade: string }>;
}): Promise<ActionResult<{ requisicaoId: number; linhasCriadas: number }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(input.perfil);
    const result = await criarRequisicaoManual(prisma, {
      utilizadorId,
      notas: input.notas,
      linhas: input.linhas,
    });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return {
      ok: true,
      data: { requisicaoId: result.requisicaoId, linhasCriadas: result.linhasCriadas },
      message: "Requisicao manual criada.",
    };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function receberLinhaRequisicaoAction(input: {
  perfil: Perfil;
  linhaId: number;
  quantidade: string;
}): Promise<ActionResult<{ estadoLinha: string; estadoRequisicao: string }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(input.perfil);
    const result = await receberLinhaRequisicao(prisma, {
      utilizadorId,
      linhaId: input.linhaId,
      quantidade: input.quantidade,
    });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return {
      ok: true,
      data: { estadoLinha: result.estadoLinha, estadoRequisicao: result.estadoRequisicao },
      message: "Rececao registada.",
    };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function confirmarRequisicaoAction(input: {
  perfil: Perfil;
  requisicaoId: number;
}): Promise<ActionResult<{ requisicaoId: number }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(input.perfil);
    const result = await confirmarRequisicao(prisma, { utilizadorId, requisicaoId: input.requisicaoId });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return { ok: true, data: { requisicaoId: result.requisicaoId }, message: "Requisicao confirmada." };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function atualizarLinhaRequisicaoAction(input: {
  perfil: Perfil;
  linhaId: number;
  quantidadePedida: string;
}): Promise<ActionResult<{ linhaId: number }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(input.perfil);
    const result = await atualizarLinhaRequisicao(prisma, {
      utilizadorId,
      linhaId: input.linhaId,
      quantidadePedida: input.quantidadePedida,
    });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return { ok: true, data: { linhaId: result.linhaId }, message: "Linha atualizada." };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function removerLinhaRequisicaoAction(input: {
  perfil: Perfil;
  linhaId: number;
}): Promise<ActionResult<{ requisicaoId: number }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(input.perfil);
    const result = await removerLinhaRequisicao(prisma, { utilizadorId, linhaId: input.linhaId });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return { ok: true, data: { requisicaoId: result.requisicaoId }, message: "Linha removida." };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function cancelarRequisicaoAction(input: {
  perfil: Perfil;
  requisicaoId: number;
}): Promise<ActionResult<{ requisicaoId: number }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(input.perfil);
    const result = await cancelarRequisicao(prisma, { utilizadorId, requisicaoId: input.requisicaoId });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return { ok: true, data: { requisicaoId: result.requisicaoId }, message: "Requisicao cancelada." };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}

export async function anularMovimentoAction(input: {
  perfil: Perfil;
  movimentoId: number;
  motivo: string;
}): Promise<ActionResult<{ movimentoId: number }>> {
  try {
    const utilizadorId = await getUserIdByPerfil(input.perfil);
    const result = await anularMovimento(prisma, {
      utilizadorId,
      movimentoId: input.movimentoId,
      motivo: input.motivo,
    });

    if (!result.ok) return { ok: false, errors: result.errors };
    revalidateDemo();
    return { ok: true, data: { movimentoId: result.movimentoId }, message: "Movimento anulado." };
  } catch (error) {
    return { ok: false, errors: toErrors(error) };
  }
}
