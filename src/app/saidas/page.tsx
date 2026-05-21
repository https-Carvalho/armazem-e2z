"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { getDemoStateAction, registarSaidaAction } from "@/app/actions/demo-actions";
import { useUser } from "@/context/UserContext";
import type { ProdutoComStock } from "@/lib/domain/types";

type Linha = { key: string; produtoId: string; quantidade: string };
type TipoSaida = "NORMAL" | "EMERGENCIA_EREDES" | "OVERRIDE_E2Z";

let lineCounter = 0;
const newLine = (): Linha => ({ key: `linha-${lineCounter++}`, produtoId: "", quantidade: "" });

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
  const selectedProducts = useMemo(() => new Map(produtos.map((product) => [product.id, product])), [produtos]);

  function updateLine(key: string, patch: Partial<Linha>) {
    setLinhas((current) => current.map((line) => line.key === key ? { ...line, ...patch } : line));
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
          .filter((line) => line.produtoId && line.quantidade)
          .map((line) => ({ produtoId: Number(line.produtoId), quantidade: line.quantidade })),
      });

      if (result.ok) {
        setMessage(`Saida registada. ${result.data.movimentosCriados} movimento(s) criado(s).`);
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
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Registar saida</h1>
          <p className="text-sm text-slate-500">Formulario multi-linha com validacao all-or-nothing no servidor.</p>
        </div>
        <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          Autorizacoes remotas: simulado na demo
        </span>
      </div>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <ul className="list-disc pl-5">
            {errors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          {([
            ["NORMAL", "Saida normal", "Bloqueia stock insuficiente"],
            ["EMERGENCIA_EREDES", "Emergencia E-Redes", "Admin/Gestor, motivo obrigatorio"],
            ["OVERRIDE_E2Z", "Override E2Z", "Admin/Gestor, sem emergencia"],
          ] as const).map(([value, label, description]) => (
            <button
              key={value}
              type="button"
              disabled={value !== "NORMAL" && !canAuthorize}
              aria-pressed={tipo === value}
              onClick={() => setTipo(value)}
              className={`rounded-lg border p-3 text-left text-sm ${tipo === value ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <span className="block font-semibold">{label}</span>
              <span className="text-xs opacity-80">{description}</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3">Produto</th>
                <th className="px-3 py-3 text-center">Stock</th>
                <th className="px-3 py-3 text-center">Quantidade</th>
                <th className="px-3 py-3 text-center">Unidade</th>
                <th className="px-3 py-3 text-center">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {linhas.map((line) => {
                const product = selectedProducts.get(Number(line.produtoId));
                return (
                  <tr key={line.key}>
                    <td className="px-3 py-3">
                      <select
                        value={line.produtoId}
                        onChange={(event) => updateLine(line.key, { produtoId: event.target.value, quantidade: "" })}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Selecionar produto...</option>
                        {produtos.map((item) => (
                          <option key={item.id} value={item.id}>{item.nome}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-3 text-center text-slate-600">{product ? `${product.em_armazem} ${product.unidade}` : "-"}</td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        step={product?.incremento_quantidade ?? "1"}
                        value={line.quantidade}
                        onChange={(event) => updateLine(line.key, { quantidade: event.target.value })}
                        className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm"
                      />
                    </td>
                    <td className="px-3 py-3 text-center text-slate-500">{product?.unidade ?? "-"}</td>
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setLinhas((current) => current.length === 1 ? current : current.filter((item) => item.key !== line.key))}
                        className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
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
          onClick={() => setLinhas((current) => [...current, newLine()])}
          className="mt-4 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Adicionar linha
        </button>

        {hasException && (
          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <label className="mb-1.5 block text-sm font-medium text-amber-900">Motivo obrigatorio</label>
            <textarea
              rows={3}
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              className="w-full resize-none rounded-lg border border-amber-200 px-3 py-2 text-sm"
              placeholder="Explica porque a excecao foi autorizada..."
            />
          </div>
        )}

        <div className="mt-5">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Notas</label>
          <textarea
            rows={2}
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={isPending || linhas.every((line) => !line.produtoId || !line.quantidade) || (hasException && !motivo.trim())}
            onClick={submit}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
          >
            {isPending ? "A registar..." : "Registar saida"}
          </button>
        </div>
      </section>
    </div>
  );
}
