"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  atualizarProdutoAction,
  criarProdutoAction,
  definirProdutoAtivoAction,
  listarProdutosAction,
} from "@/app/actions/demo-actions";
import { useUser } from "@/context/UserContext";
import type { ProdutoComStock } from "@/lib/domain/types";

type ProdutoFormState = {
  id: number | null;
  nome: string;
  codigo_e2z: string;
  codigo_edp: string;
  capitulo: string;
  artigo: string;
  proprietario: "E2Z" | "E_REDES";
  unidade: "UN" | "M" | "ROLO";
  dimensao_tecnica: string;
  stock_min: string;
  stock_max: string;
  incremento_quantidade: string;
  stock_inicial: string;
};

const emptyForm: ProdutoFormState = {
  id: null,
  nome: "",
  codigo_e2z: "",
  codigo_edp: "",
  capitulo: "",
  artigo: "",
  proprietario: "E2Z",
  unidade: "UN",
  dimensao_tecnica: "",
  stock_min: "0",
  stock_max: "",
  incremento_quantidade: "1",
  stock_inicial: "",
};

function ownerBadge(owner: string) {
  return owner === "E2Z"
    ? "bg-blue-50 text-blue-700 border border-blue-100"
    : "bg-amber-50 text-amber-700 border border-amber-100";
}

function stockColor(product: ProdutoComStock) {
  if (product.estado_stock === "SEM_STOCK") return "text-red-700 font-bold";
  if (product.estado_stock === "CRITICO") return "text-orange-600 font-bold";
  return "text-emerald-700 font-semibold";
}

export default function CatalogoPage() {
  const { user } = useUser();
  const [produtos, setProdutos] = useState<ProdutoComStock[]>([]);
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState<"TODOS" | "E2Z" | "E_REDES">("TODOS");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProdutoFormState>(emptyForm);
  const [initialForm, setInitialForm] = useState<ProdutoFormState>(emptyForm);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const canManage = user.perfil === "ADMIN";

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listarProdutosAction(user.perfil, search);
    if (result.ok) {
      setProdutos(result.data);
      setErrors([]);
    } else {
      setErrors(result.errors);
    }
    setLoading(false);
  }, [search, user.perfil]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(id);
  }, [load]);

  const filtered = useMemo(() => {
    return produtos.filter((p) => owner === "TODOS" || p.proprietario === owner);
  }, [owner, produtos]);

  function openCreate() {
    setForm(emptyForm);
    setInitialForm(emptyForm);
    setErrors([]);
    setMessage("");
    setFormOpen(true);
  }

  function openEdit(product: ProdutoComStock) {
    const pf = {
      id: product.id,
      nome: product.nome,
      codigo_e2z: product.codigo_e2z ?? "",
      codigo_edp: product.codigo_edp ?? "",
      capitulo: product.capitulo ?? "",
      artigo: product.artigo ?? "",
      proprietario: product.proprietario,
      unidade: product.unidade,
      dimensao_tecnica: product.dimensao_tecnica ?? "",
      stock_min: product.stock_min,
      stock_max: product.stock_max ?? "",
      incremento_quantidade: product.incremento_quantidade,
      stock_inicial: "",
    };
    setForm(pf);
    setInitialForm(pf);
    setErrors([]);
    setMessage("");
    setFormOpen(true);
  }

  async function submitForm() {
    setErrors([]);
    setMessage("");
    const payload = {
      perfil: user.perfil,
      nome: form.nome,
      codigo_e2z: form.codigo_e2z,
      codigo_edp: form.codigo_edp,
      capitulo: form.capitulo,
      artigo: form.artigo,
      proprietario: form.proprietario,
      unidade: form.unidade,
      dimensao_tecnica: form.dimensao_tecnica,
      stock_min: form.stock_min,
      stock_max: form.stock_max,
      incremento_quantidade: form.incremento_quantidade,
    };
    const result = form.id
      ? await atualizarProdutoAction({ ...payload, produtoId: form.id })
      : await criarProdutoAction({ ...payload, stock_inicial: form.stock_inicial });

    if (result.ok) {
      setMessage(form.id ? "Produto atualizado." : "Produto criado.");
      setForm(emptyForm);
      setFormOpen(false);
      await load();
    } else {
      setErrors(result.errors);
    }
  }

  async function deactivate(product: ProdutoComStock) {
    if (!window.confirm(`Desativar "${product.nome}"? O histórico fica preservado.`)) return;
    setErrors([]);
    setMessage("");
    const result = await definirProdutoAtivoAction({ perfil: user.perfil, produtoId: product.id, ativo: false });
    if (result.ok) {
      setMessage("Produto desativado.");
      await load();
    } else {
      setErrors(result.errors);
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Catálogo de materiais</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} produto(s) visíveis. Stock calculado por movimentos.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 w-fit rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors duration-150 cursor-pointer shadow-sm shadow-blue-200"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo produto
          </button>
        )}
      </div>

      {message && (
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {message}
        </div>
      )}
      {errors.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {errors.join(" ")}
        </div>
      )}

      {/* Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 px-3 py-6 backdrop-blur-sm md:px-6">
          <section className="flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">{form.id ? "Editar produto" : "Novo produto"}</h2>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                    Stock por movimentos
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {form.id ? "Atualiza dados de catálogo sem tocar no stock calculado." : "Cria o artigo e opcionalmente regista stock inicial."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
                Fechar
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-6 p-6">
                  <FormSection title="Identificação" description="Dados usados na pesquisa, relatórios e movimentos.">
                    <Field label="Designação" className="md:col-span-2">
                      <input value={form.nome} onChange={(e) => setForm((c) => ({ ...c, nome: e.target.value }))} className="input" placeholder="Ex: Cabo BT 4x25 mm²" />
                    </Field>
                    <Field label="Código E2Z">
                      <input value={form.codigo_e2z} onChange={(e) => setForm((c) => ({ ...c, codigo_e2z: e.target.value }))} className="input" placeholder="Código interno" />
                    </Field>
                    <Field label="Código EDP/JUMP">
                      <input value={form.codigo_edp} onChange={(e) => setForm((c) => ({ ...c, codigo_edp: e.target.value }))} className="input" placeholder="Ex: 20215102" />
                    </Field>
                  </FormSection>

                  <FormSection title="Classificação" description="Ajuda a distinguir materiais parecidos no armazém.">
                    <Field label="Proprietário">
                      <select value={form.proprietario} onChange={(e) => setForm((c) => ({ ...c, proprietario: e.target.value as "E2Z" | "E_REDES" }))} className="input cursor-pointer">
                        <option value="E2Z">E2Z</option>
                        <option value="E_REDES">E-Redes</option>
                      </select>
                    </Field>
                    <Field label="Unidade">
                      <select value={form.unidade} onChange={(e) => setForm((c) => ({ ...c, unidade: e.target.value as "UN" | "M" | "ROLO" }))} className="input cursor-pointer">
                        <option value="UN">UN</option>
                        <option value="M">M</option>
                        <option value="ROLO">ROLO</option>
                      </select>
                    </Field>
                    <Field label="Capítulo">
                      <input value={form.capitulo} onChange={(e) => setForm((c) => ({ ...c, capitulo: e.target.value }))} className="input" />
                    </Field>
                    <Field label="Artigo">
                      <input value={form.artigo} onChange={(e) => setForm((c) => ({ ...c, artigo: e.target.value }))} className="input" />
                    </Field>
                    <Field label="Dimensão técnica" className="md:col-span-2">
                      <input value={form.dimensao_tecnica} onChange={(e) => setForm((c) => ({ ...c, dimensao_tecnica: e.target.value }))} className="input" placeholder="Ex: 16 mm², 4x25, 30/60A" />
                    </Field>
                  </FormSection>

                  <FormSection title="Regras de stock" description="Define alertas, sugestão de requisição e incrementos válidos.">
                    <Field label="Stock mínimo">
                      <input type="number" value={form.stock_min} onChange={(e) => setForm((c) => ({ ...c, stock_min: e.target.value }))} className="input" />
                    </Field>
                    <Field label="Stock máximo">
                      <input type="number" value={form.stock_max} onChange={(e) => setForm((c) => ({ ...c, stock_max: e.target.value }))} className="input" />
                    </Field>
                    <Field label="Incremento">
                      <input type="number" value={form.incremento_quantidade} onChange={(e) => setForm((c) => ({ ...c, incremento_quantidade: e.target.value }))} className="input" />
                    </Field>
                    {!form.id && (
                      <Field label="Stock inicial">
                        <input type="number" value={form.stock_inicial} onChange={(e) => setForm((c) => ({ ...c, stock_inicial: e.target.value }))} className="input" />
                      </Field>
                    )}
                  </FormSection>
                </div>

                <aside className="border-t border-slate-100 bg-slate-50 p-6 lg:border-l lg:border-t-0">
                  <h3 className="text-sm font-bold text-slate-900">Resumo</h3>
                  <dl className="mt-4 space-y-4 text-sm">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Produto</dt>
                      <dd className="mt-1 font-semibold text-slate-900">{form.nome || <span className="text-slate-400 font-normal">Sem designação</span>}</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Dono</dt>
                        <dd className="mt-1 font-medium text-slate-700">{form.proprietario === "E2Z" ? "E2Z" : "E-Redes"}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Unidade</dt>
                        <dd className="mt-1 font-medium text-slate-700">{form.unidade}</dd>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Reposição</dt>
                      <dd className="mt-1 font-medium text-slate-800">
                        Mín. {form.stock_min || "–"} / Máx. {form.stock_max || "–"}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-5 text-xs leading-5 text-slate-400">
                    Para corrigir stock existente usa entradas, saídas ou contagens. O catálogo só define regras e identificação.
                  </p>
                </aside>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm(form.id ? initialForm : emptyForm)}
                  className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {form.id ? "Repor alterações" : "Limpar"}
                </button>
                <button
                  type="button"
                  onClick={submitForm}
                  className="min-h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  {form.id ? "Guardar alterações" : "Criar produto"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(["TODOS", "E2Z", "E_REDES"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={owner === value}
              onClick={() => setOwner(value)}
              className={`rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-all duration-150 cursor-pointer ${
                owner === value ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              {value === "TODOS" ? "Todos" : value === "E2Z" ? "E2Z" : "E-Redes"}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-xl">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar designação, código, capítulo ou artigo..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <th className="px-6 py-3.5">Designação</th>
                <th className="px-4 py-3.5">Proprietário</th>
                <th className="px-4 py-3.5">Códigos</th>
                <th className="px-4 py-3.5">Capítulo</th>
                <th className="px-4 py-3.5">Local</th>
                <th className="px-4 py-3.5 text-center">Unid.</th>
                <th className="px-4 py-3.5 text-center">Mín/Máx</th>
                <th className="px-4 py-3.5 text-center">Em armazém</th>
                {canManage && <th className="px-4 py-3.5 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="px-6 py-10 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      A carregar catálogo...
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filtered.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/60 transition-colors duration-150">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">{product.nome}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{product.dimensao_tecnica ?? "—"}</p>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ownerBadge(product.proprietario)}`}>
                      {product.proprietario === "E2Z" ? "E2Z" : "E-Redes"}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-slate-500">
                    <div>{product.codigo_e2z ?? "—"}</div>
                    <div className="text-slate-400">{product.codigo_edp ?? "—"}</div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{product.capitulo ?? "—"}</td>
                  <td className="px-4 py-4 text-slate-600">{product.localizacao ?? "—"}</td>
                  <td className="px-4 py-4 text-center text-slate-500 font-medium">{product.unidade}</td>
                  <td className="px-4 py-4 text-center text-slate-500">{product.stock_min} / {product.stock_max ?? "—"}</td>
                  <td className={`px-4 py-4 text-center tabular-nums ${stockColor(product)}`}>{product.em_armazem}</td>
                  {canManage && (
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => deactivate(product)}
                          className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          Desativar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-900">Nenhum produto encontrado</p>
                    <p className="text-xs text-slate-400 mt-1">Tenta ajustar o filtro ou a pesquisa.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      {children}
    </label>
  );
}
