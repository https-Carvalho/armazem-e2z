"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { getDemoStateAction, registarEntradaAction } from "@/app/actions/demo-actions";
import { useUser } from "@/context/UserContext";
import type { ProdutoComStock } from "@/lib/domain/types";

export default function EntradasPage() {
  const { user } = useUser();
  const [produtos, setProdutos] = useState<ProdutoComStock[]>([]);
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [notas, setNotas] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const result = await getDemoStateAction(user.perfil);
    if (result.ok) setProdutos(result.data.produtos);
    else setErrors(result.errors);
    setLoading(false);
  }, [user.perfil]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const produto = useMemo(() => produtos.find((item) => item.id === Number(produtoId)), [produtoId, produtos]);
  const novoStock = produto && quantidade ? Number(produto.em_armazem) + Number(quantidade.replace(",", ".")) : null;

  function submit() {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await registarEntradaAction({
        perfil: user.perfil,
        produtoId: Number(produtoId),
        quantidade,
        notas,
      });
      if (result.ok) {
        setMessage("Entrada registada e movimento criado.");
        setProdutoId("");
        setQuantidade("");
        setNotas("");
        await load();
      } else {
        setErrors(result.errors);
      }
    });
  }

  const isStockOk = produto && produto.estado_stock === "OK";

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-2xl space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-slate-200 animate-pulse" />
              <div className="h-3.5 w-56 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
          <div className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse shadow-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Registar entrada</h1>
            <p className="text-sm text-slate-500 mt-0.5">Cria um movimento ENTRADA real na demo.</p>
          </div>
        </div>

        {message && (
          <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {message}
          </div>
        )}
        {errors.length > 0 && (
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {errors.join(" ")}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="p-6 space-y-5">
            {/* Product select */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Produto</label>
              <select
                value={produtoId}
                onChange={(e) => { setProdutoId(e.target.value); setQuantidade(""); }}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="">Selecionar produto...</option>
                {produtos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} — {item.em_armazem} {item.unidade}
                  </option>
                ))}
              </select>
            </div>

            {/* Product info card */}
            {produto && (
              <div className={`rounded-xl border p-4 ${isStockOk ? "border-emerald-100 bg-emerald-50/60" : "border-orange-100 bg-orange-50/60"}`}>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Stock atual</p>
                    <p className={`mt-1 text-2xl font-bold tabular-nums ${isStockOk ? "text-emerald-700" : "text-orange-700"}`}>
                      {produto.em_armazem}
                      <span className="ml-1 text-sm font-normal">{produto.unidade}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Incremento</p>
                    <p className="mt-1 text-lg font-bold text-slate-700 tabular-nums">{produto.incremento_quantidade}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Estado</p>
                    <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                      produto.estado_stock === "SEM_STOCK" ? "bg-red-100 text-red-700" :
                      produto.estado_stock === "CRITICO" ? "bg-orange-100 text-orange-700" :
                      "bg-emerald-100 text-emerald-700"
                    }`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        produto.estado_stock === "SEM_STOCK" ? "bg-red-500" :
                        produto.estado_stock === "CRITICO" ? "bg-orange-500" : "bg-emerald-500"
                      }`} />
                      {produto.estado_stock === "SEM_STOCK" ? "Sem stock" : produto.estado_stock === "CRITICO" ? "Crítico" : "OK"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quantidade</label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min="0"
                  step={produto?.incremento_quantidade ?? "1"}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  className="w-36 rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
                {produto && <span className="text-sm font-medium text-slate-500">{produto.unidade}</span>}
                {novoStock !== null && (
                  <div className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span className="text-xs font-bold text-emerald-700">Novo stock: {novoStock} {produto?.unidade}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Notas <span className="normal-case font-normal text-slate-300">(opcional)</span></label>
              <textarea
                rows={3}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Fornecedor, origem ou referência da receção..."
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 rounded-b-xl">
            <button
              type="button"
              disabled={!produtoId || !quantidade || isPending}
              onClick={submit}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
            >
              {isPending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
                  A registar...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Registar entrada
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => { setProdutoId(""); setQuantidade(""); setNotas(""); }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
