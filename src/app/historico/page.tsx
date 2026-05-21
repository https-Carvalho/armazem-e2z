"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { anularMovimentoAction, getDemoStateAction } from "@/app/actions/demo-actions";
import FormattedDate from "@/components/FormattedDate";
import { useUser } from "@/context/UserContext";
import type { MovimentoResumo } from "@/lib/domain/types";

type FiltroTipo = "TODOS" | "ENTRADA" | "SAIDA" | "AJUSTE_CONTAGEM" | "EMERGENCIAS" | "OVERRIDES";

function badge(movement: MovimentoResumo) {
  if (movement.emergencia) return "bg-red-100 text-red-700";
  if (movement.override_operacional) return "bg-orange-100 text-orange-700";
  if (movement.tipo === "ENTRADA" || movement.tipo === "ABERTURA") return "bg-emerald-100 text-emerald-700";
  if (movement.tipo === "AJUSTE_CONTAGEM") return "bg-purple-100 text-purple-700";
  return "bg-slate-100 text-slate-700";
}

function label(movement: MovimentoResumo) {
  if (movement.emergencia) return "Emergencia";
  if (movement.override_operacional) return "Override";
  if (movement.tipo === "AJUSTE_CONTAGEM") return "Ajuste cont.";
  return movement.tipo;
}

export default function HistoricoPage() {
  const { user } = useUser();
  const [movimentos, setMovimentos] = useState<MovimentoResumo[]>([]);
  const [tipo, setTipo] = useState<FiltroTipo>("TODOS");
  const [owner, setOwner] = useState<"TODOS" | "E2Z" | "E_REDES">("TODOS");
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const canAnnul = user.perfil === "ADMIN" || user.perfil === "GESTOR";

  const load = useCallback(async () => {
    const result = await getDemoStateAction(user.perfil);
    if (result.ok) setMovimentos(result.data.movimentos);
    else setErrors(result.errors);
  }, [user.perfil]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const filtered = useMemo(() => {
    return movimentos.filter((movement) => {
      const matchOwner = owner === "TODOS" || movement.proprietario === owner;
      const matchTipo =
        tipo === "TODOS" ||
        movement.tipo === tipo ||
        (tipo === "EMERGENCIAS" && movement.emergencia) ||
        (tipo === "OVERRIDES" && movement.override_operacional);
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Historico</h1>
          <p className="text-sm text-slate-500">Auditoria real de movimentos, emergencias, overrides e contagens.</p>
        </div>
        <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          Exportacao CSV: simulado na demo
        </span>
      </div>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
      {errors.length > 0 && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errors.join(" ")}</div>}

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center">
        <select value={tipo} onChange={(event) => setTipo(event.target.value as FiltroTipo)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="TODOS">Todos os movimentos</option>
          <option value="ENTRADA">Entradas</option>
          <option value="SAIDA">Saidas</option>
          <option value="AJUSTE_CONTAGEM">Contagens</option>
          <option value="EMERGENCIAS">Emergencias E-Redes</option>
          <option value="OVERRIDES">Overrides E2Z</option>
        </select>
        <select value={owner} onChange={(event) => setOwner(event.target.value as "TODOS" | "E2Z" | "E_REDES")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="TODOS">Todos os proprietarios</option>
          <option value="E2Z">E2Z</option>
          <option value="E_REDES">E-Redes</option>
        </select>
        <p className="text-sm text-slate-500">{filtered.length} registo(s)</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Data</th>
                <th className="px-3 py-3">Produto</th>
                <th className="px-3 py-3">Tipo</th>
                <th className="px-3 py-3 text-center">Quantidade</th>
                <th className="px-3 py-3">Utilizador</th>
                <th className="px-3 py-3">Autorizado por</th>
                <th className="px-3 py-3">Motivo / notas</th>
                {canAnnul && <th className="px-3 py-3 text-right">Acoes</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((movement) => (
                <tr key={movement.id}>
                  <td className="px-5 py-3"><FormattedDate iso={movement.criado_em} showTime /></td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-900">{movement.produto}</p>
                    <p className="text-xs text-slate-500">{movement.proprietario === "E2Z" ? "E2Z" : "E-Redes"}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge(movement)}`}>{label(movement)}</span>
                  </td>
                  <td className={`px-3 py-3 text-center font-semibold ${Number(movement.quantidade) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {Number(movement.quantidade) > 0 ? "+" : ""}{movement.quantidade} {movement.unidade}
                  </td>
                  <td className="px-3 py-3 text-slate-700">{movement.utilizador}</td>
                  <td className="px-3 py-3 text-slate-500">{movement.autorizado_por ?? "-"}</td>
                  <td className="px-3 py-3 text-slate-500">{movement.motivo || movement.notas || "-"}</td>
                  {canAnnul && (
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        disabled={movement.tipo === "ANULACAO"}
                        onClick={() => annulMovement(movement)}
                        className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                      >
                        Anular
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canAnnul ? 8 : 7} className="px-5 py-8 text-center text-slate-500">Sem movimentos para os filtros selecionados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
