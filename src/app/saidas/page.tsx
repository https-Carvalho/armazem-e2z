"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { getDemoStateAction, registarSaidaAction } from "@/app/actions/demo-actions";
import { useUser } from "@/context/UserContext";
import type { ProdutoComStock } from "@/lib/domain/types";

type Linha = { key: string; produtoId: string; quantidade: string };
type TipoSaida = "NORMAL" | "EMERGENCIA_EREDES" | "OVERRIDE_E2Z";

let lineCounter = 0;
const newLine = (): Linha => ({ key: `linha-${lineCounter++}`, produtoId: "", quantidade: "" });

const TIPO_CONFIG: Record<TipoSaida, { label: string; desc: string; color: string; activeColor: string }> = {
  NORMAL: {
    label: "Saída normal",
    desc: "Bloqueia stock insuficiente",
    color: "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
    activeColor: "border-blue-500 bg-blue-50 text-blue-800",
  },
  EMERGENCIA_EREDES: {
    label: "Emergência E-Redes",
    desc: "Admin/Gestor — motivo obrigatório",
    color: "border-slate-200 text-slate-600 hover:border-red-200 hover:bg-red-50",
    activeColor: "border-red-400 bg-red-50 text-red-800",
  },
  OVERRIDE_E2Z: {
    label: "Override E2Z",
    desc: "Admin/Gestor — sem emergência",
    color: "border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50",
    activeColor: "border-orange-400 bg-orange-50 text-orange-800",
  },
};

export default function SaidasPage() {
  const { user } = useUser();
  const [produtos, setProdutos] = useState<ProdutoComStock[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([newLine()]);
  const [tipo, setTipo] = useState<TipoSaida>("NORMAL");
  const [motivo, setMotivo] = useState("");
  const [notas, setNotas] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const result = await getDemoStateAction(user.perfil);
    if (result.ok) setProdutos(result.data.produtos);
    else setErrors(result.errors);
  }, [user.perfil]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const canAuthorize = user.perfil === "ADMIN" || user.perfil === "GESTOR";
  const hasException = tipo !== "NORMAL";
  const selectedProducts = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  function updateLine(key: string, patch: Partial<Linha>) {
    setLinhas((current) => current.map((l) => l.key === key ? { ...l, ...patch } : l));
  }

  function submit() {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await registarSaidaAction({
        perfil: user.perfil,
        tipo,
        motivo,
        notas,
        linhas: linhas
          .filter((l) => l.produtoId && l.quantidade)
          .map((l) => ({ produtoId: Number(l.produtoId), quantidade: l.quantidade })),
      });

      if (result.ok) {
        setMessage(`Saída registada. ${result.data.movimentosCriados} movimento(s) criado(s).`);
        setLinhas([newLine()]);
        setTipo("NORMAL");
        setMotivo("");
        setNotas("");
        await load();
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Registar saída</h1>
          <p className="text-sm text-slate-500 mt-0.5">Formulário multi-linha com validação all-or-nothing no servidor.</p>
        </div>
        <span className="w-fit flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          Autorizações remotas: simulado na demo
        </span>
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
          <ul className="list-disc pl-4 space-y-0.5">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
        {/* Tipo selector */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Tipo de saída</p>
          <div className={`grid gap-3 ${canAuthorize ? "md:grid-cols-3" : "md:grid-cols-1 max-w-sm"}`}>
            {(Object.entries(TIPO_CONFIG) as [TipoSaida, typeof TIPO_CONFIG[TipoSaida]][])
              .filter(([value]) => value === "NORMAL" || canAuthorize)
              .map(([value, config]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={tipo === value}
                  onClick={() => setTipo(value)}
                  className={`rounded-xl border-2 p-4 text-left transition-all duration-150 cursor-pointer ${
                    tipo === value ? config.activeColor : config.color
                  }`}
                >
                  <span className="block text-[13px] font-bold">{config.label}</span>
                  <span className="text-xs opacity-75 mt-0.5 block">{config.desc}</span>
                </button>
              ))}
          </div>
        </div>

        {/* Lines table */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Produtos</p>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3 text-center">Stock atual</th>
                  <th className="px-4 py-3 text-center">Quantidade</th>
                  <th className="px-4 py-3 text-center">Unidade</th>
                  <th className="px-4 py-3 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {linhas.map((line) => {
                  const product = selectedProducts.get(Number(line.produtoId));
                  return (
                    <tr key={line.key}>
                      <td className="px-4 py-3">
                        <select
                          value={line.produtoId}
                          onChange={(e) => updateLine(line.key, { produtoId: e.target.value, quantidade: "" })}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                          <option value="">Selecionar produto...</option>
                          {produtos.map((item) => (
                            <option key={item.id} value={item.id}>{item.nome}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {product ? (
                          <span className={`font-semibold tabular-nums ${Number(product.em_armazem) <= Number(product.stock_min) ? "text-red-600" : "text-slate-700"}`}>
                            {product.em_armazem} <span className="text-xs text-slate-400 font-normal">{product.unidade}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          step={product?.incremento_quantidade ?? "1"}
                          value={line.quantidade}
                          onChange={(e) => updateLine(line.key, { quantidade: e.target.value })}
                          className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center text-slate-500 font-medium">{product?.unidade ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setLinhas((c) => c.length === 1 ? c : c.filter((i) => i.key !== line.key))}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => setLinhas((c) => [...c, newLine()])}
            className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-150 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Adicionar linha
          </button>
        </div>

        {/* Exception reason */}
        {hasException && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <label className="block text-sm font-bold text-amber-900 mb-2">Motivo obrigatório</label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full resize-none rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="Explica porque a exceção foi autorizada..."
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">Notas</label>
          <textarea
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Submit */}
        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={isPending || linhas.every((l) => !l.produtoId || !l.quantidade) || (hasException && !motivo.trim())}
            onClick={submit}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
          >
            {isPending ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
                A registar...
              </>
            ) : "Registar saída"}
          </button>
        </div>
      </section>
    </div>
  );
}
