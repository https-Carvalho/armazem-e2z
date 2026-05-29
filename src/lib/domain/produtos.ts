import { Prisma, type PrismaClient, type Proprietario, type Unidade } from "@/generated/prisma/client";
import { podeGerirCatalogo } from "./permissoes";
import { decimal, validarQuantidade } from "./quantidades";

export type ProdutoCrudInput = {
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
};

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function validarProdutoInput(input: ProdutoCrudInput) {
  const errors: string[] = [];
  if (!input.nome.trim()) errors.push("A designacao do produto e obrigatoria.");
  if (!input.stock_min.trim()) errors.push("O stock minimo e obrigatorio.");
  if (!input.incremento_quantidade.trim()) errors.push("O incremento e obrigatorio.");

  let stockMin = decimal(0);
  let stockMax: Prisma.Decimal | null = null;
  let incremento = decimal(1);

  try {
    stockMin = decimal(input.stock_min.replace(",", "."));
    incremento = decimal(input.incremento_quantidade.replace(",", "."));
    if (input.stock_max?.trim()) stockMax = decimal(input.stock_max.replace(",", "."));
  } catch {
    errors.push("Stock minimo, stock maximo ou incremento invalidos.");
  }

  if (stockMin.lt(0)) errors.push("O stock minimo nao pode ser negativo.");
  if (incremento.lte(0)) errors.push("O incremento tem de ser superior a zero.");
  if (stockMax && stockMax.lte(stockMin)) errors.push("O stock maximo deve ser superior ao stock minimo.");

  return { errors, stockMin, stockMax, incremento };
}

export async function criarProduto(db: PrismaClient, input: ProdutoCrudInput & { utilizadorId: number }) {
  return db.$transaction(async (tx) => {
    const utilizador = await tx.utilizador.findUnique({ where: { id: input.utilizadorId } });
    if (!utilizador) return { ok: false as const, errors: ["Utilizador demo nao encontrado."] };
    if (!podeGerirCatalogo(utilizador.perfil)) {
      return { ok: false as const, errors: ["Apenas Admin pode criar produtos."] };
    }

    const validacao = validarProdutoInput(input);
    if (validacao.errors.length) return { ok: false as const, errors: validacao.errors };

    const stockInicial = input.stock_inicial?.trim()
      ? validarQuantidade({
          quantidade: input.stock_inicial,
          unidade: input.unidade,
          incrementoQuantidade: validacao.incremento.toString(),
        })
      : null;
    if (stockInicial && !stockInicial.ok) return { ok: false as const, errors: [stockInicial.error] };

    const produto = await tx.produto.create({
      data: {
        nome: input.nome.trim(),
        codigo_e2z: normalizeText(input.codigo_e2z),
        codigo_edp: normalizeText(input.codigo_edp),
        capitulo: normalizeText(input.capitulo),
        artigo: normalizeText(input.artigo),
        proprietario: input.proprietario,
        unidade: input.unidade,
        dimensao_tecnica: normalizeText(input.dimensao_tecnica),
        stock_min: validacao.stockMin,
        stock_max: validacao.stockMax,
        incremento_quantidade: validacao.incremento,
      },
    });

    if (stockInicial?.ok) {
      await tx.movimento.create({
        data: {
          produto_id: produto.id,
          tipo: "ABERTURA",
          quantidade: stockInicial.value,
          utilizador_id: utilizador.id,
          notas: "Stock inicial definido na criacao do produto",
        },
      });
    }

    return { ok: true as const, produtoId: produto.id };
  });
}

export async function atualizarProduto(db: PrismaClient, input: ProdutoCrudInput & { utilizadorId: number; produtoId: number }) {
  const utilizador = await db.utilizador.findUnique({ where: { id: input.utilizadorId } });
  if (!utilizador) return { ok: false as const, errors: ["Utilizador demo nao encontrado."] };
  if (!podeGerirCatalogo(utilizador.perfil)) {
    return { ok: false as const, errors: ["Apenas Admin pode editar produtos."] };
  }

  const validacao = validarProdutoInput(input);
  if (validacao.errors.length) return { ok: false as const, errors: validacao.errors };

  const produto = await db.produto.findUnique({ where: { id: input.produtoId } });
  if (!produto) return { ok: false as const, errors: ["Produto nao encontrado."] };

  await db.produto.update({
    where: { id: input.produtoId },
    data: {
      nome: input.nome.trim(),
      codigo_e2z: normalizeText(input.codigo_e2z),
      codigo_edp: normalizeText(input.codigo_edp),
      capitulo: normalizeText(input.capitulo),
      artigo: normalizeText(input.artigo),
      proprietario: input.proprietario,
      unidade: input.unidade,
      dimensao_tecnica: normalizeText(input.dimensao_tecnica),
      stock_min: validacao.stockMin,
      stock_max: validacao.stockMax,
      incremento_quantidade: validacao.incremento,
      versao: { increment: 1 },
    },
  });

  return { ok: true as const, produtoId: input.produtoId };
}

export async function definirProdutoAtivo(db: PrismaClient, input: {
  utilizadorId: number;
  produtoId: number;
  ativo: boolean;
}) {
  const utilizador = await db.utilizador.findUnique({ where: { id: input.utilizadorId } });
  if (!utilizador) return { ok: false as const, errors: ["Utilizador demo nao encontrado."] };
  if (!podeGerirCatalogo(utilizador.perfil)) {
    return { ok: false as const, errors: ["Apenas Admin pode alterar o estado do produto."] };
  }

  const produto = await db.produto.findUnique({ where: { id: input.produtoId } });
  if (!produto) return { ok: false as const, errors: ["Produto nao encontrado."] };

  await db.produto.update({
    where: { id: input.produtoId },
    data: { ativo: input.ativo, versao: { increment: 1 } },
  });

  return { ok: true as const, produtoId: input.produtoId, ativo: input.ativo };
}
