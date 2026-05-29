"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  atualizarLinhaRequisicaoAction,
  cancelarRequisicaoAction,
  confirmarRequisicaoAction,
  criarRequisicaoManualAction,
  criarRequisicaoSugeridaAction,
  getDemoStateAction,
  receberLinhaRequisicaoAction,
  removerLinhaRequisicaoAction,
} from "@/app/actions/demo-actions";
import FormattedDate from "@/components/FormattedDate";
import { useUser } from "@/context/UserContext";
import type { DemoState } from "@/lib/domain/types";

type ManualLine = { key: number; produtoId: string; quantidade: string };

const canManageProfiles = ["ADMIN", "GESTOR"] as const;

const STATUS_BADGE: Record<string, string> = {
  PENDENTE: "bg-amber-100 text-amber-700 border border-amber-200",
  RASCUNHO: "bg-slate-100 text-slate-600 border border-slate-200",
  CONFIRMADA: "bg-blue-100 text-blue-700 border border-blue-200",
  RECEBIDA_TOTAL: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  CANCELADA: "bg-red-100 text-red-500 border border-red-200",
};

const STATUS_DOT: Record<string, string> = {
  PENDENTE: "bg-amber-400",
  RASCUNHO: "bg-slate-400",
  CONFIRMADA: "bg-blue-500",
  RECEBIDA_TOTAL: "bg-emerald-500",
  CANCELADA: "bg-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  PENDENTE: "Pendente",
  RASCUNHO: "Rascunho",
  CONFIRMADA: "Confirmada",
  RECEBIDA_TOTAL: "Recebida",
  CANCELADA: "Cancelada",
};

const LINE_STATUS_BADGE: Record<string, string> = {
  PENDENTE: "bg-amber-100 text-amber-700",
  RECEBIDA_TOTAL: "bg-emerald-100 text-emerald-700",
  RECEBIDA_PARCIAL: "bg-blue-100 text-blue-700",
};

export default function RequisicoesPage() {
  const { user, can } = useUser();
  const [state, setState] = useState<DemoState | null>(null);
  const [receber, setReceber] = useState<Record<number, string>>({});
  const [editarPedido, setEditarPedido] = useState<Record<number, string>>({});
  const [manualOpen, setManualOpen] = useState(false);
  const [manualNotas, setManualNotas] = useState("");
  const [manualLines, setManualLines] = useState<ManualLine[]>([{ key: 1, produtoId: "", quantidade: "" }]);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const canManage = canManageProfiles.includes(user.perfil as (typeof canManageProfiles)[number]);
  const canCreate = can("criar_requisicao");
  const canApprove = can("aprovar_requisicao");
  const canReceive = can("receber_requisicao");

  const load = useCallback(async () => {
    const result = await getDemoStateAction(user.perfil);
    if (result.ok) setState(result.data);
    else setErrors(result.errors);
    setLoading(false);
  }, [user.perfil]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  function createSuggestion() {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await criarRequisicaoSugeridaAction(user.perfil);
      if (result.ok) {
        setMessage(`Requisição #${result.data.requisicaoId} criada como pendente com ${result.data.linhasCriadas} linha(s).`);
        await load();
      } else {
        setErrors(result.errors);
      }
    });
  }

  function addManualLine() {
    setManualLines((c) => [...c, { key: Date.now(), produtoId: "", quantidade: "" }]);
  }

  function removeManualLine(key: number) {
    setManualLines((c) => (c.length === 1 ? c : c.filter((l) => l.key !== key)));
  }

  function updateManualLine(key: number, values: Partial<ManualLine>) {
    setManualLines((c) => c.map((l) => (l.key === key ? { ...l, ...values } : l)));
  }

  function createManual() {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await criarRequisicaoManualAction({
        perfil: user.perfil,
        notas: manualNotas,
        linhas: manualLines.map((l) => ({ produtoId: Number(l.produtoId), quantidade: l.quantidade })),
      });
      if (result.ok) {
        setMessage(`Requisição manual #${result.data.requisicaoId} criada com ${result.data.linhasCriadas} linha(s).`);
        setManualOpen(false);
        setManualNotas("");
        setManualLines([{ key: 1, produtoId: "", quantidade: "" }]);
        await load();
      } else {
        setErrors(result.errors);
      }
    });
  }

  function receiveLine(lineId: number) {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await receberLinhaRequisicaoAction({ perfil: user.perfil, linhaId: lineId, quantidade: receber[lineId] ?? "" });
      if (result.ok) {
        setMessage(`Receção registada. Linha: ${result.data.estadoLinha}.`);
        setReceber((c) => ({ ...c, [lineId]: "" }));
        await load();
      } else {
        setErrors(result.errors);
      }
    });
  }

  function confirmRequest(requisicaoId: number) {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await confirmarRequisicaoAction({ perfil: user.perfil, requisicaoId });
      if (result.ok) {
        setMessage(`Requisição #${requisicaoId} confirmada.`);
        await load();
      } else {
        setErrors(result.errors);
      }
    });
  }

  function updateLine(lineId: number) {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await atualizarLinhaRequisicaoAction({ perfil: user.perfil, linhaId: lineId, quantidadePedida: editarPedido[lineId] ?? "" });
      if (result.ok) {
        setMessage("Linha atualizada.");
        setEditarPedido((c) => ({ ...c, [lineId]: "" }));
        await load();
      } else {
        setErrors(result.errors);
      }
    });
  }

  function removeLine(lineId: number) {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await removerLinhaRequisicaoAction({ perfil: user.perfil, linhaId: lineId });
      if (result.ok) { setMessage("Linha removida."); await load(); }
      else setErrors(result.errors);
    });
  }

  function cancelRequest(requisicaoId: number) {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await cancelarRequisicaoAction({ perfil: user.perfil, requisicaoId });
      if (result.ok) {
        setMessage(`Requisição #${requisicaoId} cancelada.`);
        await load();
      } else {
        setErrors(result.errors);
      }
    });
  }

  const requisicoes = state?.requisicoes ?? [];
  const produtos = state?.produtos ?? [];

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-slate-200 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-36 rounded bg-slate-200 animate-pulse" />
              <div className="h-3.5 w-72 rounded bg-slate-100 animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-32 rounded-lg bg-slate-200 animate-pulse" />
            <div className="h-10 w-44 rounded-lg bg-slate-200 animate-pulse" />
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-52 rounded-xl border border-slate-200 bg-white animate-pulse shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Requisições</h1>
            <p className="text-sm text-slate-500 mt-0.5">Criação manual, sugestão automática e receção parcial por linha.</p>
          </div>
        </div>
        {canCreate && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => setManualOpen((c) => !c)}
              className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-40 cursor-pointer ${
                manualOpen
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Nova manual
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={createSuggestion}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-100 transition-colors hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
            >
              {isPending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent inline-block" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 8v4l3 3"/><path d="M18 2l4 4-4 4"/>
                </svg>
              )}
              Sugestão automática
            </button>
          </div>
        )}
      </div>

      {/* Manual form */}
      {manualOpen && canCreate && (
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="font-bold text-slate-900">Nova requisição manual</h2>
            <p className="mt-0.5 text-sm text-slate-500">Adiciona os produtos e quantidades que queres pedir.</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-3">
              {manualLines.map((line, index) => {
                const sp = produtos.find((p) => p.id === Number(line.produtoId));
                return (
                  <div key={line.key} className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4 md:grid-cols-[minmax(0,1fr)_160px_auto] md:items-end">
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Linha {index + 1} — Produto
                      </span>
                      <select
                        value={line.produtoId}
                        onChange={(e) => updateManualLine(line.key, { produtoId: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecionar produto</option>
                        {produtos.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nome} | {p.proprietario === "E2Z" ? "E2Z" : "E-Redes"} | {p.em_armazem} {p.unidade}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quantidade</span>
                      <input
                        type="number"
                        min="0"
                        step={sp?.incremento_quantidade ?? "1"}
                        value={line.quantidade}
                        onChange={(e) => updateManualLine(line.key, { quantidade: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={sp?.unidade ?? "Qtd"}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={manualLines.length === 1}
                      onClick={() => removeManualLine(line.key)}
                      className="rounded-lg border border-red-100 px-3 py-2 text-sm font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addManualLine}
              className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 transition-all hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Adicionar linha
            </button>

            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Notas <span className="normal-case font-normal text-slate-300">(opcional)</span>
              </label>
              <textarea
                value={manualNotas}
                onChange={(e) => setManualNotas(e.target.value)}
                className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Motivo, urgência ou observações..."
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4 rounded-b-xl">
            <button
              type="button"
              disabled={isPending || !canCreate || produtos.length === 0}
              onClick={createManual}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Criar requisição
            </button>
            <button
              type="button"
              onClick={() => { setManualOpen(false); setManualLines([{ key: 1, produtoId: "", quantidade: "" }]); setManualNotas(""); }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </section>
      )}

      {state?.dadosIncompletos.length ? (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <svg className="mt-0.5 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Dados incompletos fora da sugestão automática: {state.dadosIncompletos.map((i) => i.nome).join(", ")}.
        </div>
      ) : null}

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

      {/* Requisition list */}
      <div className="space-y-4">
        {requisicoes.map((req) => (
          <section key={req.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Req header */}
            <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-semibold text-slate-400">#{req.id}</span>
                    <h2 className="font-bold text-slate-900">Requisição</h2>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_BADGE[req.estado] ?? "bg-slate-100 text-slate-600"}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[req.estado] ?? "bg-slate-400"}`} />
                      {STATUS_LABEL[req.estado] ?? req.estado}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    por <span className="font-medium text-slate-500">{req.criado_por}</span> · <FormattedDate iso={req.criado_em} />
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canApprove && (req.estado === "PENDENTE" || req.estado === "RASCUNHO") && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => confirmRequest(req.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-40 cursor-pointer"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Confirmar
                  </button>
                )}
                {canApprove && req.estado !== "CANCELADA" && req.estado !== "RECEBIDA_TOTAL" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => cancelRequest(req.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100 disabled:opacity-40 cursor-pointer"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* Lines table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-sm">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/60 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3">Produto</th>
                    <th className="px-4 py-3 text-center">Sugerido</th>
                    <th className="px-4 py-3 text-center">Pedido</th>
                    <th className="px-4 py-3 text-center">Recebido</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    {canReceive && <th className="px-4 py-3 text-center">Receber</th>}
                    {canManage && <th className="px-4 py-3 text-center">Editar</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {req.linhas.map((line) => (
                    <tr key={line.id} className="transition-colors duration-150 hover:bg-slate-50/60">
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-slate-900">{line.produto}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${line.proprietario === "E2Z" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                            {line.proprietario === "E2Z" ? "E2Z" : "E-Redes"}
                          </span>
                          <span className="text-xs text-slate-400">{line.unidade}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center tabular-nums text-slate-500">
                        {line.quantidade_sugerida === "0" ? <span className="italic text-slate-300">Manual</span> : line.quantidade_sugerida}
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold tabular-nums text-slate-700">{line.quantidade_pedida}</td>
                      <td className="px-4 py-3.5 text-center font-semibold tabular-nums text-emerald-700">{line.quantidade_recebida}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${LINE_STATUS_BADGE[line.estado] ?? "bg-slate-100 text-slate-600"}`}>
                          {line.estado === "RECEBIDA_TOTAL" ? "Recebida" : line.estado === "RECEBIDA_PARCIAL" ? "Parcial" : line.estado}
                        </span>
                      </td>
                      {canReceive && (
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={receber[line.id] ?? ""}
                              onChange={(e) => setReceber((c) => ({ ...c, [line.id]: e.target.value }))}
                              disabled={req.estado === "PENDENTE" || req.estado === "RASCUNHO" || req.estado === "CANCELADA" || line.estado === "RECEBIDA_TOTAL"}
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm tabular-nums transition-all disabled:bg-slate-50 disabled:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              disabled={isPending || !receber[line.id] || req.estado === "PENDENTE" || req.estado === "RASCUNHO" || req.estado === "CANCELADA" || line.estado === "RECEBIDA_TOTAL"}
                              onClick={() => receiveLine(line.id)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                            >
                              Receber
                            </button>
                          </div>
                        </td>
                      )}
                      {canManage && (
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={editarPedido[line.id] ?? ""}
                              placeholder={line.quantidade_pedida}
                              onChange={(e) => setEditarPedido((c) => ({ ...c, [line.id]: e.target.value }))}
                              disabled={line.quantidade_recebida !== "0" || req.estado === "CANCELADA"}
                              className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm tabular-nums disabled:bg-slate-50 disabled:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              disabled={isPending || !editarPedido[line.id] || line.quantidade_recebida !== "0" || req.estado === "CANCELADA"}
                              onClick={() => updateLine(line.id)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-30 cursor-pointer"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              disabled={isPending || line.quantidade_recebida !== "0" || req.estado === "CANCELADA"}
                              onClick={() => removeLine(line.id)}
                              className="rounded-lg border border-red-100 px-2 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                            >
                              Remover
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {requisicoes.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-14 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-slate-700">Sem requisições</p>
            <p className="mt-1 text-xs text-slate-400">Ainda não há requisições visíveis para este perfil.</p>
            {canCreate && (
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 cursor-pointer"
              >
                Criar primeira requisição
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
