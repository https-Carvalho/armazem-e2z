"use client";

import { useCallback, useEffect, useState } from "react";
import { getDemoStateAction } from "@/app/actions/demo-actions";
import CurrentDate from "@/components/CurrentDate";
import { useUser } from "@/context/UserContext";
import type { DemoState, MovimentoResumo, ProdutoComStock } from "@/lib/domain/types";

function ownerBadge(owner: string) {
  return owner === "E2Z"
    ? "bg-blue-100 text-blue-800 border border-blue-200"
    : "bg-yellow-100 text-yellow-800 border border-yellow-200";
}

function stockBadge(product: ProdutoComStock) {
  if (product.estado_stock === "SEM_STOCK") return "bg-red-100 text-red-700";
  if (product.estado_stock === "CRITICO") return "bg-red-50 text-red-600";
  return "bg-emerald-50 text-emerald-700";
}

function movementBadge(movement: MovimentoResumo) {
  if (movement.emergencia) return "bg-red-100 text-red-700";
  if (movement.override_operacional) return "bg-orange-100 text-orange-700";
  if (movement.tipo === "ENTRADA" || movement.tipo === "ABERTURA") return "bg-emerald-100 text-emerald-700";
  if (movement.tipo === "AJUSTE_CONTAGEM") return "bg-purple-100 text-purple-700";
  return "bg-slate-100 text-slate-700";
}

export default function DashboardPage() {
  const { user } = useUser();
  const [state, setState] = useState<DemoState | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getDemoStateAction(user.perfil);
    if (result.ok) {
      setState(result.data);
      setErrors([]);
    } else {
      setErrors(result.errors);
    }
    setLoading(false);
  }, [user.perfil]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  const dashboard = state?.dashboard;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Demo funcional com stock calculado por movimentos.</p>
        </div>
        <CurrentDate />
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errors.join(" ")}
        </div>
      )}

      {loading && <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">A carregar dados da demo...</div>}

      {dashboard && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Kpi title="Produtos visiveis" value={dashboard.totalProdutos} tone="text-slate-900" />
            <Kpi title="Criticos E2Z" value={dashboard.stockCriticoE2Z} tone="text-red-600" />
            <Kpi title="Criticos E-Redes" value={dashboard.stockCriticoERedes} tone="text-red-600" />
            <Kpi title="Req. pendentes" value={dashboard.requisicoesPendentes} tone="text-amber-600" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <section className="xl:col-span-3 rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Stock critico</h2>
                <p className="text-xs text-slate-500">Valores vindos da soma de movimentos.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr className="text-left text-xs uppercase text-slate-500">
                      <th className="px-5 py-3">Produto</th>
                      <th className="px-3 py-3">Proprietario</th>
                      <th className="px-3 py-3 text-center">Stock</th>
                      <th className="px-3 py-3 text-center">Min.</th>
                      <th className="px-3 py-3 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboard.produtosCriticos.map((product) => (
                      <tr key={product.id}>
                        <td className="px-5 py-3 font-medium text-slate-900">{product.nome}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${ownerBadge(product.proprietario)}`}>
                            {product.proprietario === "E2Z" ? "E2Z" : "E-Redes"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center font-semibold text-red-600">{product.em_armazem} {product.unidade}</td>
                        <td className="px-3 py-3 text-center text-slate-500">{product.stock_min}</td>
                        <td className="px-3 py-3 text-center">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stockBadge(product)}`}>
                            {product.estado_stock === "SEM_STOCK" ? "Sem stock" : "Critico"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="xl:col-span-2 rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Ultimos movimentos</h2>
                <p className="text-xs text-slate-500">{dashboard.movimentosHoje} movimento(s) hoje.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {dashboard.ultimosMovimentos.map((movement) => (
                  <div key={movement.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${movementBadge(movement)}`}>
                          {movement.emergencia ? "Emergencia" : movement.override_operacional ? "Override" : movement.tipo}
                        </span>
                        <p className="mt-1 truncate text-sm font-medium text-slate-900">{movement.produto}</p>
                        <p className="text-xs text-slate-500">{movement.utilizador}</p>
                      </div>
                      <div className={`shrink-0 text-sm font-semibold ${Number(movement.quantidade) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {Number(movement.quantidade) > 0 ? "+" : ""}{movement.quantidade} {movement.unidade}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ title, value, tone }: { title: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className={`mt-1 text-3xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
