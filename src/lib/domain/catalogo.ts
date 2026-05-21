import { Prisma, type Perfil, type PrismaClient, type Produto, type Proprietario } from "@/generated/prisma/client";
import { podeVerProprietario } from "./permissoes";
import type { DashboardData, DemoState, MovimentoResumo, ProdutoComStock, RequisicaoResumo } from "./types";

type Tx = Prisma.TransactionClient | PrismaClient;

function toText(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return null;
  return value.toString();
}

function stockEstado(stock: Prisma.Decimal, min: Prisma.Decimal) {
  if (stock.eq(0)) return "SEM_STOCK" as const;
  if (stock.lt(min)) return "CRITICO" as const;
  return "OK" as const;
}

export async function getStockMap(tx: Tx, produtoIds?: number[]) {
  const rows = await tx.movimento.groupBy({
    by: ["produto_id"],
    where: produtoIds ? { produto_id: { in: produtoIds } } : undefined,
    _sum: { quantidade: true },
  });

  return new Map(rows.map((row) => [row.produto_id, row._sum.quantidade ?? new Prisma.Decimal(0)]));
}

export async function listarProdutosComStock(tx: Tx, perfil: Perfil, search = ""): Promise<ProdutoComStock[]> {
  const termo = search.trim();
  const produtos = await tx.produto.findMany({
    where: {
      ativo: true,
      ...(termo
        ? {
            OR: [
              { nome: { contains: termo, mode: "insensitive" } },
              { codigo_e2z: { contains: termo, mode: "insensitive" } },
              { codigo_edp: { contains: termo, mode: "insensitive" } },
              { capitulo: { contains: termo, mode: "insensitive" } },
              { artigo: { contains: termo, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { localizacao: true },
    orderBy: [{ proprietario: "asc" }, { nome: "asc" }],
  });

  const visiveis = produtos.filter((produto) => podeVerProprietario(perfil, produto.proprietario));
  const stockMap = await getStockMap(tx, visiveis.map((produto) => produto.id));

  return visiveis.map((produto) => serializeProduto(produto, stockMap.get(produto.id) ?? new Prisma.Decimal(0)));
}

export function serializeProduto(
  produto: Produto & { localizacao?: { nome: string } | null },
  stock: Prisma.Decimal
): ProdutoComStock {
  return {
    id: produto.id,
    nome: produto.nome,
    codigo_e2z: produto.codigo_e2z,
    codigo_edp: produto.codigo_edp,
    capitulo: produto.capitulo,
    artigo: produto.artigo,
    proprietario: produto.proprietario,
    unidade: produto.unidade,
    dimensao_tecnica: produto.dimensao_tecnica,
    stock_min: produto.stock_min.toString(),
    stock_max: toText(produto.stock_max),
    incremento_quantidade: produto.incremento_quantidade.toString(),
    localizacao: produto.localizacao?.nome ?? null,
    em_armazem: stock.toString(),
    estado_stock: stockEstado(stock, produto.stock_min),
  };
}

export async function listarMovimentos(tx: Tx, perfil: Perfil): Promise<MovimentoResumo[]> {
  const movimentos = await tx.movimento.findMany({
    include: {
      produto: true,
      utilizador: true,
      autorizado_por: true,
    },
    orderBy: { criado_em: "desc" },
    take: 100,
  });

  return movimentos
    .filter((movimento) => podeVerProprietario(perfil, movimento.produto.proprietario))
    .map((movimento) => ({
      id: movimento.id,
      produto_id: movimento.produto_id,
      produto: movimento.produto.nome,
      proprietario: movimento.produto.proprietario,
      tipo: movimento.tipo,
      quantidade: movimento.quantidade.toString(),
      unidade: movimento.produto.unidade,
      utilizador: movimento.utilizador.nome,
      autorizado_por: movimento.autorizado_por?.nome ?? null,
      emergencia: movimento.emergencia,
      override_operacional: movimento.override_operacional,
      motivo: movimento.motivo,
      notas: movimento.notas,
      criado_em: movimento.criado_em.toISOString(),
    }));
}

export async function listarRequisicoes(tx: Tx, perfil: Perfil): Promise<RequisicaoResumo[]> {
  const requisicoes = await tx.requisicao.findMany({
    include: {
      criado_por: true,
      linhas: { include: { produto: true }, orderBy: { id: "asc" } },
    },
    orderBy: { criado_em: "desc" },
  });

  return requisicoes.map((requisicao) => ({
    id: requisicao.id,
    estado: requisicao.estado,
    criado_por: requisicao.criado_por.nome,
    criado_em: requisicao.criado_em.toISOString(),
    notas: requisicao.notas,
    linhas: requisicao.linhas
      .filter((linha) => podeVerProprietario(perfil, linha.produto.proprietario))
      .map((linha) => ({
        id: linha.id,
        produto_id: linha.produto_id,
        produto: linha.produto.nome,
        proprietario: linha.produto.proprietario,
        unidade: linha.produto.unidade,
        quantidade_sugerida: linha.quantidade_sugerida.toString(),
        quantidade_pedida: linha.quantidade_pedida.toString(),
        quantidade_recebida: linha.quantidade_recebida.toString(),
        estado: linha.estado,
      })),
  })).filter((requisicao) => requisicao.linhas.length > 0 || perfil !== "CONSULTA_EREDES");
}

export async function getDemoState(tx: Tx, perfil: Perfil): Promise<DemoState> {
  const [produtos, movimentos, requisicoes] = await Promise.all([
    listarProdutosComStock(tx, perfil),
    listarMovimentos(tx, perfil),
    listarRequisicoes(tx, perfil),
  ]);

  const hoje = new Date().toISOString().slice(0, 10);
  const produtosCriticos = produtos.filter((produto) => produto.estado_stock !== "OK");
  const dashboard: DashboardData = {
    totalProdutos: produtos.length,
    stockCriticoE2Z: produtosCriticos.filter((produto) => produto.proprietario === "E2Z").length,
    stockCriticoERedes: produtosCriticos.filter((produto) => produto.proprietario === "E_REDES").length,
    movimentosHoje: movimentos.filter((movimento) => movimento.criado_em.startsWith(hoje)).length,
    requisicoesPendentes: requisicoes.filter((req) => req.estado === "PENDENTE" || req.estado === "CONFIRMADA").length,
    produtosCriticos,
    ultimosMovimentos: movimentos.slice(0, 8),
  };

  return {
    dashboard,
    produtos,
    movimentos,
    requisicoes,
    dadosIncompletos: produtos.filter((produto) => produto.stock_max === null),
  };
}

export function proprietarioWhere(perfil: Perfil): { proprietario?: Proprietario } {
  return perfil === "CONSULTA_EREDES" ? { proprietario: "E_REDES" } : {};
}
