"use client";

import { useCallback, useEffect, useState } from "react";
import { getDemoStateAction } from "@/app/actions/demo-actions";
import CurrentDate from "@/components/CurrentDate";
import { useUser } from "@/context/UserContext";
import type { DemoState, MovimentoResumo, ProdutoComStock } from "@/lib/domain/types";

function ownerBadge(owner: string) {
  return owner === "E2Z"
    ? "bg-blue-50 text-blue-700 border border-blue-100"
    : "bg-amber-50 text-amber-700 border border-amber-100";
}

function stockBadge(product: ProdutoComStock) {
  if (product.estado_stock === "SEM_STOCK") return "bg-red-100 text-red-700";
  if (product.estado_stock === "CRITICO") return "bg-orange-100 text-orange-700";
  return "bg-emerald-100 text-emerald-700";
}

function stockLabel(product: ProdutoComStock) {
  if (product.estado_stock === "SEM_STOCK") return "Sem stock";
  if (product.estado_stock === "CRITICO") return "Crítico";
  return "OK";
}

function movementBadge(movement: MovimentoResumo) {
  if (movement.emergencia) return "bg-red-100 text-red-700 border border-red-200";
  if (movement.override_operacional) return "bg-orange-100 text-orange-700 border border-orange-200";
  if (movement.tipo === "ENTRADA" || movement.tipo === "ABERTURA") return "bg-emerald-100 text-emerald-700 border border-emerald-200";
  if (movement.tipo === "AJUSTE_CONTAGEM") return "bg-purple-100 text-purple-700 border border-purple-200";
  return "bg-slate-100 text-slate-600 border border-slate-200";
}

function movementLabel(movement: MovimentoResumo) {
  if (movement.emergencia) return "Emergência";
  if (movement.override_operacional) return "Override";
  return movement.tipo;
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
    <div className="p-6 md:p-8 space-y-7">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Visão geral do stock calculado por movimentos.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <CurrentDate />
        </div>
      </div>

      {errors.length > 0 && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <svg className="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {errors.join(" ")}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-slate-200 bg-white animate-pulse shadow-sm" />
          ))}
        </div>
      )}

      {dashboard && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Kpi
              title="Produtos visíveis"
              value={dashboard.totalProdutos}
              tone="text-slate-900"
              bg="bg-slate-100"
              iconColor="text-slate-600"
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                </svg>
              }
            />
            <Kpi
              title="Críticos E2Z"
              value={dashboard.stockCriticoE2Z}
              tone={dashboard.stockCriticoE2Z > 0 ? "text-red-600" : "text-slate-900"}
              bg={dashboard.stockCriticoE2Z > 0 ? "bg-red-100" : "bg-slate-100"}
              iconColor={dashboard.stockCriticoE2Z > 0 ? "text-red-600" : "text-slate-600"}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              }
            />
            <Kpi
              title="Críticos E-Redes"
              value={dashboard.stockCriticoERedes}
              tone={dashboard.stockCriticoERedes > 0 ? "text-red-600" : "text-slate-900"}
              bg={dashboard.stockCriticoERedes > 0 ? "bg-red-100" : "bg-slate-100"}
              iconColor={dashboard.stockCriticoERedes > 0 ? "text-red-600" : "text-slate-600"}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              }
            />
            <Kpi
              title="Req. pendentes"
              value={dashboard.requisicoesPendentes}
              tone={dashboard.requisicoesPendentes > 0 ? "text-amber-600" : "text-slate-900"}
              bg={dashboard.requisicoesPendentes > 0 ? "bg-amber-100" : "bg-slate-100"}
              iconColor={dashboard.requisicoesPendentes > 0 ? "text-amber-600" : "text-slate-600"}
              icon={
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
              }
            />
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            {/* Critical stock table */}
            <section className="xl:col-span-3 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 text-[15px]">Stock crítico</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Soma de movimentos por produto.</p>
                </div>
                <span className="rounded-full bg-red-50 border border-red-100 px-2.5 py-1 text-xs font-semibold text-red-600">
                  {dashboard.produtosCriticos.length} produto(s)
                </span>
              </div>
              {dashboard.produtosCriticos.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-slate-900">Tudo em ordem</p>
                  <p className="text-xs text-slate-500 mt-1">Nenhum produto com stock crítico.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-left text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                        <th className="px-6 py-3">Produto</th>
                        <th className="px-4 py-3">Proprietário</th>
                        <th className="px-4 py-3 text-center">Stock</th>
                        <th className="px-4 py-3 text-center">Mín.</th>
                        <th className="px-4 py-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {dashboard.produtosCriticos.map((product) => (
                        <tr key={product.id} className="hover:bg-slate-50/60 transition-colors duration-150">
                          <td className="px-6 py-3.5 font-medium text-slate-900">{product.nome}</td>
                          <td className="px-4 py-3.5">
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${ownerBadge(product.proprietario)}`}>
                              {product.proprietario === "E2Z" ? "E2Z" : "E-Redes"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-red-600">{product.em_armazem} <span className="font-normal text-slate-400 text-xs">{product.unidade}</span></td>
                          <td className="px-4 py-3.5 text-center text-slate-500">{product.stock_min}</td>
                          <td className="px-4 py-3.5 text-center">
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${stockBadge(product)}`}>
                              {stockLabel(product)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Recent movements */}
            <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 text-[15px]">Últimos movimentos</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{dashboard.movimentosHoje} movimento(s) hoje.</p>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {dashboard.ultimosMovimentos.length === 0 && (
                  <p className="px-6 py-8 text-center text-sm text-slate-500">Sem movimentos recentes.</p>
                )}
                {dashboard.ultimosMovimentos.map((movement) => (
                  <div key={movement.id} className="px-6 py-4 hover:bg-slate-50/60 transition-colors duration-150">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${movementBadge(movement)}`}>
                          {movementLabel(movement)}
                        </span>
                        <p className="mt-1.5 truncate text-[13px] font-semibold text-slate-900">{movement.produto}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{movement.utilizador}</p>
                      </div>
                      <div className={`shrink-0 text-sm font-bold tabular-nums ${Number(movement.quantidade) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {Number(movement.quantidade) > 0 ? "+" : ""}{movement.quantidade}
                        <span className="text-[10px] font-normal text-slate-400 ml-0.5">{movement.unidade}</span>
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

function Kpi({
  title,
  value,
  tone,
  bg,
  iconColor,
  icon,
}: {
  title: string;
  value: number;
  tone: string;
  bg: string;
  iconColor: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${iconColor}`}>
          {icon}
        </div>
      </div>
      <p className={`mt-4 text-3xl font-bold tracking-tight tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 text-sm text-slate-500 font-medium">{title}</p>
    </div>
  );
}
