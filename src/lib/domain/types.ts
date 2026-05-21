import type { EstadoLinha, EstadoRequisicao, Perfil, Proprietario, TipoMovimento, Unidade } from "@/generated/prisma/client";

export type ActionResult<T> =
  | { ok: true; data: T; message?: string }
  | { ok: false; errors: string[]; fieldErrors?: Record<string, string> };

export type DemoPerfil = Perfil;

export type ProdutoComStock = {
  id: number;
  nome: string;
  codigo_e2z: string | null;
  codigo_edp: string | null;
  capitulo: string | null;
  artigo: string | null;
  proprietario: Proprietario;
  unidade: Unidade;
  dimensao_tecnica: string | null;
  stock_min: string;
  stock_max: string | null;
  incremento_quantidade: string;
  localizacao: string | null;
  em_armazem: string;
  estado_stock: "SEM_STOCK" | "CRITICO" | "OK";
};

export type MovimentoResumo = {
  id: number;
  produto_id: number;
  produto: string;
  proprietario: Proprietario;
  tipo: TipoMovimento;
  quantidade: string;
  unidade: Unidade;
  utilizador: string;
  autorizado_por: string | null;
  emergencia: boolean;
  override_operacional: boolean;
  motivo: string | null;
  notas: string | null;
  criado_em: string;
};

export type RequisicaoResumo = {
  id: number;
  estado: EstadoRequisicao;
  criado_por: string;
  criado_em: string;
  notas: string | null;
  linhas: Array<{
    id: number;
    produto_id: number;
    produto: string;
    proprietario: Proprietario;
    unidade: Unidade;
    quantidade_sugerida: string;
    quantidade_pedida: string;
    quantidade_recebida: string;
    estado: EstadoLinha;
  }>;
};

export type DashboardData = {
  totalProdutos: number;
  stockCriticoE2Z: number;
  stockCriticoERedes: number;
  movimentosHoje: number;
  requisicoesPendentes: number;
  produtosCriticos: ProdutoComStock[];
  ultimosMovimentos: MovimentoResumo[];
};

export type DemoState = {
  dashboard: DashboardData;
  produtos: ProdutoComStock[];
  movimentos: MovimentoResumo[];
  requisicoes: RequisicaoResumo[];
  dadosIncompletos: ProdutoComStock[];
};
