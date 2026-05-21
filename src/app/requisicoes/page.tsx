"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  atualizarLinhaRequisicaoAction,
  cancelarRequisicaoAction,
  criarRequisicaoManualAction,
  criarRequisicaoSugeridaAction,
  getDemoStateAction,
  receberLinhaRequisicaoAction,
  removerLinhaRequisicaoAction,
} from "@/app/actions/demo-actions";
import FormattedDate from "@/components/FormattedDate";
import { useUser } from "@/context/UserContext";
import type { DemoState } from "@/lib/domain/types";

type ManualLine = {
  key: number;
  produtoId: string;
  quantidade: string;
};

const canManageProfiles = ["ADMIN", "GESTOR"] as const;

export default function RequisicoesPage() {
  const { user } = useUser();
  const [state, setState] = useState<DemoState | null>(null);
  const [receber, setReceber] = useState<Record<number, string>>({});
  const [editarPedido, setEditarPedido] = useState<Record<number, string>>({});
  const [manualOpen, setManualOpen] = useState(false);
  const [manualNotas, setManualNotas] = useState("");
  const [manualLines, setManualLines] = useState<ManualLine[]>([{ key: 1, produtoId: "", quantidade: "" }]);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const canManage = canManageProfiles.includes(user.perfil as (typeof canManageProfiles)[number]);

  const load = useCallback(async () => {
    const result = await getDemoStateAction(user.perfil);
    if (result.ok) setState(result.data);
    else setErrors(result.errors);
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
        setMessage(`Requisicao #${result.data.requisicaoId} criada com ${result.data.linhasCriadas} linha(s).`);
        await load();
      } else {
        setErrors(result.errors);
      }
    });
  }

  function addManualLine() {
    setManualLines((current) => [...current, { key: Date.now(), produtoId: "", quantidade: "" }]);
  }

  function removeManualLine(key: number) {
    setManualLines((current) => current.length === 1 ? current : current.filter((line) => line.key !== key));
  }

  function updateManualLine(key: number, values: Partial<ManualLine>) {
    setManualLines((current) => current.map((line) => line.key === key ? { ...line, ...values } : line));
  }

  function createManual() {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await criarRequisicaoManualAction({
        perfil: user.perfil,
        notas: manualNotas,
        linhas: manualLines.map((line) => ({
          produtoId: Number(line.produtoId),
          quantidade: line.quantidade,
        })),
      });
      if (result.ok) {
        setMessage(`Requisicao manual #${result.data.requisicaoId} criada com ${result.data.linhasCriadas} linha(s).`);
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
      const result = await receberLinhaRequisicaoAction({
        perfil: user.perfil,
        linhaId: lineId,
        quantidade: receber[lineId] ?? "",
      });
      if (result.ok) {
        setMessage(`Rececao registada. Linha: ${result.data.estadoLinha}.`);
        setReceber((current) => ({ ...current, [lineId]: "" }));
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
      const result = await atualizarLinhaRequisicaoAction({
        perfil: user.perfil,
        linhaId: lineId,
        quantidadePedida: editarPedido[lineId] ?? "",
      });
      if (result.ok) {
        setMessage("Linha atualizada.");
        setEditarPedido((current) => ({ ...current, [lineId]: "" }));
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
      if (result.ok) {
        setMessage("Linha removida.");
        await load();
      } else {
        setErrors(result.errors);
      }
    });
  }

  function cancelRequest(requisicaoId: number) {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await cancelarRequisicaoAction({ perfil: user.perfil, requisicaoId });
      if (result.ok) {
        setMessage(`Requisicao #${requisicaoId} cancelada.`);
        await load();
      } else {
        setErrors(result.errors);
      }
    });
  }

  const requisicoes = state?.requisicoes ?? [];
  const produtos = state?.produtos ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Requisicoes</h1>
          <p className="text-sm text-slate-500">Criacao manual, sugestao automatica e rececao parcial por linha.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending || !canManage}
            onClick={() => setManualOpen((current) => !current)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
          >
            Nova requisicao manual
          </button>
          <button
            type="button"
            disabled={isPending || !canManage}
            onClick={createSuggestion}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            Gerar sugestao automatica
          </button>
        </div>
      </div>

      {manualOpen && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-1">
            <h2 className="font-semibold text-slate-900">Requisicao manual</h2>
            <p className="text-sm text-slate-500">Adiciona os produtos e quantidades que queres pedir sem depender da sugestao.</p>
          </div>
          <div className="space-y-3">
            {manualLines.map((line, index) => {
              const selectedProduct = produtos.find((produto) => produto.id === Number(line.produtoId));
              return (
                <div key={line.key} className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_160px_auto] md:items-end">
                  <label className="text-sm font-medium text-slate-700">
                    Produto
                    <select
                      value={line.produtoId}
                      onChange={(event) => updateManualLine(line.key, { produtoId: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Selecionar produto</option>
                      {produtos.map((produto) => (
                        <option key={produto.id} value={produto.id}>
                          {produto.nome} | {produto.proprietario === "E2Z" ? "E2Z" : "E-Redes"} | stock {produto.em_armazem} {produto.unidade}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Quantidade
                    <input
                      type="number"
                      min="0"
                      step={selectedProduct?.incremento_quantidade ?? "1"}
                      value={line.quantidade}
                      onChange={(event) => updateManualLine(line.key, { quantidade: event.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder={selectedProduct?.unidade ?? "Qtd"}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={manualLines.length === 1}
                    onClick={() => removeManualLine(line.key)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Remover {index + 1}
                  </button>
                </div>
              );
            })}
          </div>
          <label className="mt-4 block text-sm font-medium text-slate-700">
            Notas
            <textarea
              value={manualNotas}
              onChange={(event) => setManualNotas(event.target.value)}
              className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Opcional"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addManualLine}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              Adicionar linha
            </button>
            <button
              type="button"
              disabled={isPending || !canManage || produtos.length === 0}
              onClick={createManual}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:bg-slate-300"
            >
              Criar requisicao
            </button>
          </div>
        </section>
      )}

      {state?.dadosIncompletos.length ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Dados incompletos fora da sugestao automatica: {state.dadosIncompletos.map((item) => item.nome).join(", ")}.
        </div>
      ) : null}

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
      {errors.length > 0 && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errors.join(" ")}</div>}

      <div className="space-y-5">
        {requisicoes.map((req) => (
          <section key={req.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="font-semibold text-slate-900">Requisicao #{req.id}</h2>
                <p className="text-xs text-slate-500">
                  Criada por {req.criado_por} em <FormattedDate iso={req.criado_em} />
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{req.estado}</span>
                {canManage && req.estado !== "CANCELADA" && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => cancelRequest(req.id)}
                    className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[940px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Produto</th>
                    <th className="px-3 py-3 text-center">Sugerido</th>
                    <th className="px-3 py-3 text-center">Pedido</th>
                    <th className="px-3 py-3 text-center">Recebido</th>
                    <th className="px-3 py-3 text-center">Estado</th>
                    <th className="px-3 py-3 text-center">Receber</th>
                    {canManage && <th className="px-3 py-3 text-center">Editar</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {req.linhas.map((line) => (
                    <tr key={line.id}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">{line.produto}</p>
                        <p className="text-xs text-slate-500">{line.proprietario === "E2Z" ? "E2Z" : "E-Redes"} | {line.unidade}</p>
                      </td>
                      <td className="px-3 py-3 text-center">{line.quantidade_sugerida === "0" ? "Manual" : line.quantidade_sugerida}</td>
                      <td className="px-3 py-3 text-center">{line.quantidade_pedida}</td>
                      <td className="px-3 py-3 text-center">{line.quantidade_recebida}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{line.estado}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={receber[line.id] ?? ""}
                            onChange={(event) => setReceber((current) => ({ ...current, [line.id]: event.target.value }))}
                            className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm"
                          />
                          <button
                            type="button"
                            disabled={isPending || !receber[line.id] || line.estado === "RECEBIDA_TOTAL"}
                            onClick={() => receiveLine(line.id)}
                            className="rounded border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                          >
                            Receber
                          </button>
                        </div>
                      </td>
                      {canManage && (
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={editarPedido[line.id] ?? ""}
                              placeholder={line.quantidade_pedida}
                              onChange={(event) => setEditarPedido((current) => ({ ...current, [line.id]: event.target.value }))}
                              disabled={line.quantidade_recebida !== "0" || req.estado === "CANCELADA"}
                              className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm disabled:bg-slate-50"
                            />
                            <button
                              type="button"
                              disabled={isPending || !editarPedido[line.id] || line.quantidade_recebida !== "0" || req.estado === "CANCELADA"}
                              onClick={() => updateLine(line.id)}
                              className="rounded border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              disabled={isPending || line.quantidade_recebida !== "0" || req.estado === "CANCELADA"}
                              onClick={() => removeLine(line.id)}
                              className="rounded border border-red-200 px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
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
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Ainda nao ha requisicoes visiveis para este perfil.
          </div>
        )}
      </div>
    </div>
  );
}
