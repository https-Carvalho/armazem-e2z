"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, type Action } from "@/context/UserContext";
import UserSelector from "./UserSelector";

type NavItem = {
  label: string;
  href: string;
  permission?: Action;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>,
  },
  {
    label: "Catálogo",
    href: "/catalogo",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  },
  {
    label: "Entradas",
    href: "/entradas",
    permission: "ver_entradas",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 19 19 12"/></svg>,
  },
  {
    label: "Saídas",
    href: "/saidas",
    permission: "ver_saidas",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>,
  },
  {
    label: "Contagens",
    href: "/contagens",
    permission: "ver_contagens",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="15" y2="16"/></svg>,
  },
  {
    label: "Requisições",
    href: "/requisicoes",
    permission: "ver_requisicoes",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  },
  {
    label: "Histórico",
    href: "/historico",
    permission: "ver_historico",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, can } = useUser();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const visibleItems = navItems.filter((item) => {
    if (!item.permission) return true;
    return can(item.permission);
  });

  return (
    <aside className="w-64 h-screen flex flex-col flex-shrink-0 bg-[#0f172a]">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-baseline gap-1">
          <span className="text-white font-bold text-xl tracking-tight">Armazém</span>
          <span className="text-blue-400 font-bold text-xl tracking-tight">E2Z</span>
        </div>
        <p className="text-slate-500 text-xs mt-0.5 tracking-wide">Gestão de Stock</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[#1e3a5f] text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className={active ? "text-blue-400" : "text-slate-500"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}

        {/* Acesso restrito — badge para CONSULTA_EREDES */}
        {user.perfil === "CONSULTA_EREDES" && (
          <div className="mt-4 mx-1 p-3 rounded-lg bg-amber-900/20 border border-amber-800/30">
            <p className="text-amber-400 text-xs font-medium">Acesso restrito</p>
            <p className="text-amber-600 text-xs mt-0.5">Apenas materiais E-Redes</p>
          </div>
        )}
      </nav>

      {/* User Selector */}
      <div className="px-3 pb-4 border-t border-slate-800 pt-4">
        <UserSelector />
      </div>
    </aside>
  );
}
