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

  const load = useCallback(async () => {
    const result = await getDemoStateAction(user.perfil);
    if (result.ok) setProdutos(result.data.produtos);
    else setErrors(result.errors);
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

  return (
    <div className="max-w-3xl p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Registar entrada</h1>
        <p className="text-sm text-slate-500">Cria um movimento ENTRADA real na demo.</p>
      </div>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
      {errors.length > 0 && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errors.join(" ")}</div>}

      <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Produto</label>
          <select
            value={produtoId}
            onChange={(event) => {
              setProdutoId(event.target.value);
              setQuantidade("");
            }}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Selecionar produto...</option>
            {produtos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome} - {item.em_armazem} {item.unidade}
              </option>
            ))}
          </select>
          {produto && (
            <p className="mt-2 text-xs text-slate-500">
              Stock atual: <span className="font-semibold text-slate-700">{produto.em_armazem} {produto.unidade}</span>
              {" "}Incremento: <span className="font-semibold">{produto.incremento_quantidade}</span>
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Quantidade</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              step={produto?.incremento_quantidade ?? "1"}
              value={quantidade}
              onChange={(event) => setQuantidade(event.target.value)}
              className="w-36 rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-500">{produto?.unidade}</span>
          </div>
          {novoStock !== null && (
            <p className="mt-2 text-xs text-slate-500">
              Novo stock apos entrada: <span className="font-semibold text-emerald-700">{novoStock} {produto?.unidade}</span>
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Notas</label>
          <textarea
            rows={3}
            value={notas}
            onChange={(event) => setNotas(event.target.value)}
            placeholder="Fornecedor, origem ou referencia da rececao..."
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={!produtoId || !quantidade || isPending}
            onClick={submit}
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:bg-slate-300"
          >
            {isPending ? "A registar..." : "Registar entrada"}
          </button>
          <button
            type="button"
            onClick={() => {
              setProdutoId("");
              setQuantidade("");
              setNotas("");
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
}
