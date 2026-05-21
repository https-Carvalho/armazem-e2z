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

  const load = useCallback(async () => {
    const result = await getDemoStateAction(user.perfil);
    if (result.ok) setProdutos(result.data.produtos);
    else setErrors(result.errors);
  }, [user.perfil]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  function update(productId: number, patch: Partial<{ contado: string; justificacao: string }>) {
    setLinhas((current) => ({
      ...current,
      [productId]: { ...(current[productId] ?? { contado: "", justificacao: "" }), ...patch },
    }));
  }

  function submit() {
    setErrors([]);
    setMessage("");
    startTransition(async () => {
      const result = await concluirContagemAction({
        perfil: user.perfil,
        linhas: Object.entries(linhas)
          .filter(([, value]) => value.contado)
          .map(([produtoId, value]) => ({
            produtoId: Number(produtoId),
            contado: value.contado,
            justificacao: value.justificacao,
          })),
      });

      if (result.ok) {
        setMessage(`Contagem concluida. ${result.data.movimentosCriados} ajuste(s) criado(s).`);
        setLinhas({});
        await load();
      } else {
        setErrors(result.errors);
      }
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contagem fisica</h1>
        <p className="text-sm text-slate-500">Submete uma sessao real e cria AJUSTE_CONTAGEM para desvios.</p>
      </div>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}
      {errors.length > 0 && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{errors.join(" ")}</div>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Produto</th>
                <th className="px-3 py-3 text-center">Esperado</th>
                <th className="px-3 py-3 text-center">Contado</th>
                <th className="px-3 py-3 text-center">Desvio</th>
                <th className="px-3 py-3">Justificacao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {produtos.map((product) => {
                const line = linhas[product.id] ?? { contado: "", justificacao: "" };
                const deviation = diff(product, line.contado);
                return (
                  <tr key={product.id} className={deviation ? "bg-amber-50/40" : ""}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900">{product.nome}</p>
                      <p className="text-xs text-slate-500">{product.proprietario === "E2Z" ? "E2Z" : "E-Redes"} | {product.unidade}</p>
                    </td>
                    <td className="px-3 py-3 text-center font-semibold text-slate-700">{product.em_armazem}</td>
                    <td className="px-3 py-3 text-center">
                      <input
                        type="number"
                        min="0"
                        step={product.incremento_quantidade}
                        value={line.contado}
                        onChange={(event) => update(product.id, { contado: event.target.value })}
                        className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm"
                      />
                    </td>
                    <td className={`px-3 py-3 text-center font-semibold ${deviation === null || deviation === 0 ? "text-slate-400" : deviation > 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {deviation === null ? "-" : deviation > 0 ? `+${deviation}` : deviation}
                    </td>
                    <td className="px-3 py-3">
                      <input
                        value={line.justificacao}
                        onChange={(event) => update(product.id, { justificacao: event.target.value })}
                        disabled={!deviation}
                        placeholder={deviation ? "Obrigatorio para desvios" : "Sem desvio"}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending || Object.values(linhas).every((line) => !line.contado)}
          onClick={submit}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300"
        >
          {isPending ? "A concluir..." : "Concluir contagem"}
        </button>
        <button
          type="button"
          onClick={() => setLinhas({})}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}
