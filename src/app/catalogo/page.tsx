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
    ? "bg-blue-100 text-blue-800 border border-blue-200"
    : "bg-yellow-100 text-yellow-800 border border-yellow-200";
}

function stockColor(product: ProdutoComStock) {
  if (product.estado_stock === "SEM_STOCK") return "text-red-700 font-bold";
  if (product.estado_stock === "CRITICO") return "text-red-600 font-semibold";
  return "text-emerald-700 font-semibold";
}

function formInputClass() {
  return "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
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
  const canManage = user.perfil === "ADMIN" || user.perfil === "GESTOR";

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
    return produtos.filter((product) => owner === "TODOS" || product.proprietario === owner);
  }, [owner, produtos]);

  function openCreate() {
    setForm(emptyForm);
    setInitialForm(emptyForm);
    setErrors([]);
    setMessage("");
    setFormOpen(true);
  }

  function openEdit(product: ProdutoComStock) {
    const productForm = {
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
    setForm(productForm);
    setInitialForm(productForm);
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
    if (!window.confirm(`Desativar "${product.nome}"? O historico fica preservado.`)) return;
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
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catalogo de materiais</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} produto(s) visiveis. Stock calculado por movimentos.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openCreate}
            className="w-fit rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Novo produto
          </button>
        )}
      </div>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
      {errors.length > 0 && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errors.join(" ")}</div>}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 px-3 py-6 backdrop-blur-[1px] md:px-6">
          <section className="flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-950">{form.id ? "Editar produto" : "Novo produto"}</h2>
                  <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    Stock por movimentos
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {form.id ? "Atualiza dados de catálogo sem tocar no stock calculado." : "Cria o artigo e opcionalmente regista stock inicial como abertura."}
                </p>
              </div>
              <button type="button" onClick={() => setFormOpen(false)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Fechar
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto">
              <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-6 p-5">
                  <FormSection title="Identificação" description="Dados usados na pesquisa, relatórios e movimentos.">
                    <Field label="Designação" className="md:col-span-2">
                      <input value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} className={formInputClass()} placeholder="Ex: Cabo BT 4x25 mm²" />
                    </Field>
                    <Field label="Código E2Z">
                      <input value={form.codigo_e2z} onChange={(event) => setForm((current) => ({ ...current, codigo_e2z: event.target.value }))} className={formInputClass()} placeholder="Código interno" />
                    </Field>
                    <Field label="Código EDP/JUMP">
                      <input value={form.codigo_edp} onChange={(event) => setForm((current) => ({ ...current, codigo_edp: event.target.value }))} className={formInputClass()} placeholder="Ex: 20215102" />
                    </Field>
                  </FormSection>

                  <FormSection title="Classificação" description="Ajuda a distinguir materiais parecidos no armazém.">
                    <Field label="Proprietário">
                      <select value={form.proprietario} onChange={(event) => setForm((current) => ({ ...current, proprietario: event.target.value as "E2Z" | "E_REDES" }))} className={formInputClass()}>
                        <option value="E2Z">E2Z</option>
                        <option value="E_REDES">E-Redes</option>
                      </select>
                    </Field>
                    <Field label="Unidade">
                      <select value={form.unidade} onChange={(event) => setForm((current) => ({ ...current, unidade: event.target.value as "UN" | "M" | "ROLO" }))} className={formInputClass()}>
                        <option value="UN">UN</option>
                        <option value="M">M</option>
                        <option value="ROLO">ROLO</option>
                      </select>
                    </Field>
                    <Field label="Capítulo">
                      <input value={form.capitulo} onChange={(event) => setForm((current) => ({ ...current, capitulo: event.target.value }))} className={formInputClass()} />
                    </Field>
                    <Field label="Artigo">
                      <input value={form.artigo} onChange={(event) => setForm((current) => ({ ...current, artigo: event.target.value }))} className={formInputClass()} />
                    </Field>
                    <Field label="Dimensão técnica" className="md:col-span-2">
                      <input value={form.dimensao_tecnica} onChange={(event) => setForm((current) => ({ ...current, dimensao_tecnica: event.target.value }))} className={formInputClass()} placeholder="Ex: 16 mm², 4x25, 30/60A" />
                    </Field>
                  </FormSection>

                  <FormSection title="Regras de stock" description="Define alertas, sugestão de requisição e incrementos válidos.">
                    <Field label="Stock mínimo">
                      <input type="number" value={form.stock_min} onChange={(event) => setForm((current) => ({ ...current, stock_min: event.target.value }))} className={formInputClass()} />
                    </Field>
                    <Field label="Stock máximo">
                      <input type="number" value={form.stock_max} onChange={(event) => setForm((current) => ({ ...current, stock_max: event.target.value }))} className={formInputClass()} />
                    </Field>
                    <Field label="Incremento">
                      <input type="number" value={form.incremento_quantidade} onChange={(event) => setForm((current) => ({ ...current, incremento_quantidade: event.target.value }))} className={formInputClass()} />
                    </Field>
                    {!form.id && (
                      <Field label="Stock inicial">
                        <input type="number" value={form.stock_inicial} onChange={(event) => setForm((current) => ({ ...current, stock_inicial: event.target.value }))} className={formInputClass()} />
                      </Field>
                    )}
                  </FormSection>
                </div>

                <aside className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
                  <h3 className="text-sm font-semibold text-slate-950">Resumo</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Produto</dt>
                      <dd className="mt-1 font-medium text-slate-900">{form.nome || "Sem designação"}</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Dono</dt>
                        <dd className="mt-1">{form.proprietario === "E2Z" ? "E2Z" : "E-Redes"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Unidade</dt>
                        <dd className="mt-1">{form.unidade}</dd>
                      </div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white p-3">
                      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Reposição</dt>
                      <dd className="mt-1 text-slate-800">
                        Mín. {form.stock_min || "-"} / Máx. {form.stock_max || "-"}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4 text-xs leading-5 text-slate-500">
                    Para corrigir stock existente usa entradas, saídas, contagens ou anulações. O catálogo só define regras e identificação.
                  </p>
                </aside>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setForm(form.id ? initialForm : emptyForm)}
                  className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {form.id ? "Repor alterações" : "Limpar formulário"}
                </button>
                <button type="button" onClick={submitForm} className="min-h-11 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700">
                  {form.id ? "Guardar alterações" : "Criar produto"}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex w-fit rounded-lg border border-slate-200 bg-white p-1">
          {(["TODOS", "E2Z", "E_REDES"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={owner === value}
              onClick={() => setOwner(value)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${owner === value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {value === "TODOS" ? "Todos" : value === "E2Z" ? "E2Z" : "E-Redes"}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Pesquisar designacao, codigo, capitulo ou artigo..."
          className="w-full max-w-xl rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Designacao</th>
                <th className="px-3 py-3">Proprietario</th>
                <th className="px-3 py-3">Codigos</th>
                <th className="px-3 py-3">Capitulo</th>
                <th className="px-3 py-3">Local</th>
                <th className="px-3 py-3 text-center">Unid.</th>
                <th className="px-3 py-3 text-center">Min/Max</th>
                <th className="px-3 py-3 text-center">Em armazem</th>
                {canManage && <th className="px-3 py-3 text-right">Acoes</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="px-5 py-8 text-center text-slate-500">A carregar catalogo...</td>
                </tr>
              )}
              {!loading && filtered.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{product.nome}</p>
                    <p className="text-xs text-slate-500">{product.dimensao_tecnica ?? "Sem dimensao tecnica"}</p>
                  </td>
                  <td className="px-3 py-4">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${ownerBadge(product.proprietario)}`}>
                      {product.proprietario === "E2Z" ? "E2Z" : "E-Redes"}
                    </span>
                  </td>
                  <td className="px-3 py-4 font-mono text-xs text-slate-600">
                    <div>{product.codigo_e2z ?? "-"}</div>
                    <div>{product.codigo_edp ?? "-"}</div>
                  </td>
                  <td className="px-3 py-4 text-slate-600">{product.capitulo ?? "-"}</td>
                  <td className="px-3 py-4 text-slate-600">{product.localizacao ?? "-"}</td>
                  <td className="px-3 py-4 text-center text-slate-600">{product.unidade}</td>
                  <td className="px-3 py-4 text-center text-slate-600">{product.stock_min} / {product.stock_max ?? "-"}</td>
                  <td className={`px-3 py-4 text-center ${stockColor(product)}`}>{product.em_armazem}</td>
                  {canManage && (
                    <td className="px-3 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEdit(product)} className="rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          Editar
                        </button>
                        <button type="button" onClick={() => deactivate(product)} className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
                          Desativar
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 9 : 8} className="px-5 py-8 text-center text-slate-500">Nenhum produto encontrado.</td>
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
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      {children}
    </label>
  );
}
