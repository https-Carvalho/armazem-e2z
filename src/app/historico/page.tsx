"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { anularMovimentoAction, getDemoStateAction } from "@/app/actions/demo-actions";
import FormattedDate from "@/components/FormattedDate";
import { useUser } from "@/context/UserContext";
import type { MovimentoResumo } from "@/lib/domain/types";

type FiltroTipo = "TODOS" | "ENTRADA" | "SAIDA" | "AJUSTE_CONTAGEM" | "EMERGENCIAS" | "OVERRIDES";

function movBadgeClass(movement: MovimentoResumo) {
  if (movement.emergencia) return "bg-red-100 text-red-700 border border-red-200";
  if (movement.override_operacional) return "bg-orange-100 text-orange-700 border border-orange-200";
  if (movement.tipo === "ENTRADA" || movement.tipo === "ABERTURA") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  if (movement.tipo === "AJUSTE_CONTAGEM") return "bg-purple-100 text-purple-700 border border-purple-200";
  if (movement.tipo === "ANULACAO") return "bg-slate-100 text-slate-500 border border-slate-200";
  return "bg-slate-100 text-slate-600 border border-slate-200";
}

function movLabel(movement: MovimentoResumo) {
  if (movement.emergencia) return "Emergência";
  if (movement.override_operacional) return "Override";
  if (movement.tipo === "AJUSTE_CONTAGEM") return "Ajuste cont.";
  return movement.tipo;
}

const FILTER_LABELS: Record<FiltroTipo, string> = {
  TODOS: "Todos",
  ENTRADA: "Entradas",
  SAIDA: "Saídas",
  AJUSTE_CONTAGEM: "Contagens",
  EMERGENCIAS: "Emergências",
  OVERRIDES: "Overrides",
};

export default function HistoricoPage() {
  const { user } = useUser();
  const [movimentos, setMovimentos] = useState<MovimentoResumo[]>([]);
  const [tipo, setTipo] = useState<FiltroTipo>("TODOS");
  const [owner, setOwner] = useState<"TODOS" | "E2Z" | "E_REDES">("TODOS");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const canAnnul = user.perfil === "ADMIN";

  const load = useCallback(async () => {
    const result = await getDemoStateAction(user.perfil);
    if (result.ok) setMovimentos(result.data.movimentos);
    else setErrors(result.errors);
    setLoading(false);
  }, [user.perfil]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const filtered = useMemo(() => {
    return movimentos.filter((m) => {
      const matchOwner = owner === "TODOS" || m.proprietario === owner;
      const matchTipo =
        tipo === "TODOS" ||
        m.tipo === tipo ||
        (tipo === "EMERGENCIAS" && m.emergencia) ||
        (tipo === "OVERRIDES" && m.override_operacional);
      return matchOwner && matchTipo;
    });
  }, [movimentos, owner, tipo]);

  async function annulMovement(movement: MovimentoResumo) {
    const motivo = window.prompt(`Motivo para anular o movimento #${movement.id}`);
    if (!motivo) return;
    setErrors([]);
    setMessage("");
    const result = await anularMovimentoAction({ perfil: user.perfil, movimentoId: movement.id, motivo });
    if (result.ok) {
      setMessage(`Movimento #${movement.id} anulado.`);
      await load();
    } else {
      setErrors(result.errors);
    }
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-slate-200 animate-pulse" />
          <div className="space-y-2">
            <div className="h-5 w-32 rounded bg-slate-200 animate-pulse" />
            <div className="h-3.5 w-72 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
        <div className="h-14 rounded-xl border border-slate-200 bg-white animate-pulse shadow-sm" />
        <div className="h-96 rounded-xl border border-slate-200 bg-white animate-pulse shadow-sm" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Histórico</h1>
            <p className="text-sm text-slate-500 mt-0.5">Auditoria de movimentos, emergências, overrides e contagens.</p>
          </div>
        </div>
        <span className="w-fit flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exportação CSV: simulado na demo
        </span>
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

      {/* Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filtros
          </div>

          {/* Tipo pill filters */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FILTER_LABELS) as FiltroTipo[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTipo(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  tipo === f
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          <div className="lg:ml-auto flex items-center gap-3">
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value as "TODOS" | "E2Z" | "E_REDES")}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODOS">Todos os proprietários</option>
              <option value="E2Z">E2Z</option>
              <option value="E_REDES">E-Redes</option>
            </select>
            <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 tabular-nums">
              {filtered.length} registo{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-3.5">Data</th>
                <th className="px-4 py-3.5">Produto</th>
                <th className="px-4 py-3.5">Tipo</th>
                <th className="px-4 py-3.5 text-right">Quantidade</th>
                <th className="px-4 py-3.5">Utilizador</th>
                <th className="px-4 py-3.5">Autorizado por</th>
                <th className="px-4 py-3.5">Motivo / Notas</th>
                {canAnnul && <th className="px-4 py-3.5 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((movement) => (
                <tr
                  key={movement.id}
                  className={`transition-colors duration-150 ${
                    movement.emergencia ? "bg-red-50/30 hover:bg-red-50/50" :
                    movement.override_operacional ? "bg-orange-50/30 hover:bg-orange-50/50" :
                    "hover:bg-slate-50/60"
                  }`}
                >
                  <td className="px-6 py-3.5">
                    <span className="text-xs tabular-nums text-slate-500">
                      <FormattedDate iso={movement.criado_em} showTime />
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-semibold text-slate-900">{movement.produto}</p>
                    <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold ${movement.proprietario === "E2Z" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {movement.proprietario === "E2Z" ? "E2Z" : "E-Redes"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${movBadgeClass(movement)}`}>
                      {movLabel(movement)}
                    </span>
                  </td>
                  <td className={`px-4 py-3.5 text-right font-bold tabular-nums ${Number(movement.quantidade) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {Number(movement.quantidade) > 0 ? "+" : ""}{movement.quantidade}
                    <span className="ml-1 text-xs font-normal text-slate-400">{movement.unidade}</span>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-700">{movement.utilizador}</td>
                  <td className="px-4 py-3.5 text-slate-400">{movement.autorizado_por ?? <span className="text-slate-300">—</span>}</td>
                  <td className="max-w-[200px] px-4 py-3.5">
                    <span className="block truncate text-slate-500">{movement.motivo || movement.notas || <span className="text-slate-300">—</span>}</span>
                  </td>
                  {canAnnul && (
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        disabled={movement.tipo === "ANULACAO"}
                        onClick={() => annulMovement(movement)}
                        className="rounded-lg border border-red-100 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                      >
                        Anular
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canAnnul ? 8 : 7} className="px-6 py-14 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-700">Sem registos</p>
                    <p className="mt-1 text-xs text-slate-400">Nenhum movimento para os filtros selecionados.</p>
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
