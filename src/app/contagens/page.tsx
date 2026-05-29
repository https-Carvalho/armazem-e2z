"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { concluirContagemAction, getDemoStateAction } from "@/app/actions/demo-actions";
import { useUser } from "@/context/UserContext";
import type { ProdutoComStock } from "@/lib/domain/types";

type LinhaContagemState = Record<number, { contado: string; justificacao: string }>;

function diff(product: ProdutoComStock, counted: string) {
  if (!counted) return null;
  return Number(counted.replace(",", ".")) - Number(product.em_armazem);
}

export default function ContagensPage() {
  const { user } = useUser();
  const [produtos, setProdutos] = useState<ProdutoComStock[]>([]);
  const [linhas, setLinhas] = useState<LinhaContagemState>({});
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

  function update(productId: number, patch: Partial<{ contado: string; justificacao: string }>) {
    setLinhas((c) => ({
      ...c,
      [productId]: { ...(c[productId] ?? { contado: "", justificacao: "" }), ...patch },
    }));
  }

  function submit() {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await concluirContagemAction({
        perfil: user.perfil,
        linhas: Object.entries(linhas)
          .filter(([, v]) => v.contado)
          .map(([produtoId, v]) => ({ produtoId: Number(produtoId), contado: v.contado, justificacao: v.justificacao })),
      });
      if (result.ok) {
        setMessage(`Contagem concluída. ${result.data.movimentosCriados} ajuste(s) criado(s).`);
        setLinhas({});
        await load();
      } else {
        setErrors(result.errors);
      }
    });
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-slate-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-slate-200 animate-pulse" />
            <div className="h-3.5 w-64 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="h-80 rounded-xl border border-slate-200 bg-white animate-pulse shadow-sm" />
      </div>
    );
  }

  const hasAnyCount = Object.values(linhas).some((l) => l.contado);
  const deviationsCount = Object.entries(linhas).filter(([id, v]) => {
    const product = produtos.find((p) => p.id === Number(id));
    if (!product || !v.contado) return false;
    return diff(product, v.contado) !== 0;
  }).length;
  const countedCount = Object.values(linhas).filter((l) => l.contado).length;

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Contagem física</h1>
            <p className="text-sm text-slate-500 mt-0.5">Submete uma sessão real e cria AJUSTE_CONTAGEM para desvios.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {countedCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              {countedCount} produto(s) contado(s)
            </span>
          )}
          {deviationsCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              {deviationsCount} desvio(s)
            </span>
          )}
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Produto</th>
                <th className="px-4 py-3.5 text-center">Esperado</th>
                <th className="px-4 py-3.5 text-center">Contado</th>
                <th className="px-4 py-3.5 text-center">Desvio</th>
                <th className="px-4 py-3.5">Justificação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {produtos.map((product) => {
                const line = linhas[product.id] ?? { contado: "", justificacao: "" };
                const deviation = diff(product, line.contado);
                const hasDeviation = deviation !== null && deviation !== 0;
                return (
                  <tr
                    key={product.id}
                    className={`transition-colors duration-150 ${hasDeviation ? "bg-amber-50/40" : line.contado ? "bg-emerald-50/20" : "hover:bg-slate-50/60"}`}
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{product.nome}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${product.proprietario === "E2Z" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {product.proprietario === "E2Z" ? "E2Z" : "E-Redes"}
                        </span>
                        <span className="text-xs text-slate-400">{product.unidade}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="font-bold tabular-nums text-slate-700">{product.em_armazem}</span>
                      <span className="ml-1 text-xs text-slate-400">{product.unidade}</span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input
                        type="number"
                        min="0"
                        step={product.incremento_quantidade}
                        value={line.contado}
                        onChange={(e) => update(product.id, { contado: e.target.value })}
                        className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm tabular-nums transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300"
                        placeholder="—"
                      />
                    </td>
                    <td className="px-4 py-4 text-center">
                      {deviation === null ? (
                        <span className="text-slate-300 font-medium">—</span>
                      ) : deviation === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          OK
                        </span>
                      ) : (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${deviation > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                          {deviation > 0 ? `+${deviation}` : deviation}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <input
                        value={line.justificacao}
                        onChange={(e) => update(product.id, { justificacao: e.target.value })}
                        disabled={!hasDeviation}
                        placeholder={hasDeviation ? "Obrigatório para desvios..." : "Sem desvio"}
                        className={`w-full rounded-lg border px-3 py-2 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          hasDeviation
                            ? "border-amber-200 bg-white focus:border-amber-300"
                            : "cursor-default border-transparent bg-transparent text-slate-400"
                        }`}
                      />
                    </td>
                  </tr>
                );
              })}
              {produtos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-400">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
                      <span className="text-sm">A carregar produtos...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <button
            type="button"
            disabled={isPending || !hasAnyCount}
            onClick={submit}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
          >
            {isPending ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
                A concluir...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>
                Concluir contagem
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setLinhas({})}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
          >
            Limpar
          </button>
          {hasAnyCount && (
            <p className="ml-auto text-xs text-slate-400">
              {deviationsCount > 0 ? `${deviationsCount} desvio(s) requer(em) justificação` : "Todos os desvios justificados"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
