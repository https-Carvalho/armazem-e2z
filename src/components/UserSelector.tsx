"use client";

import { useUser } from "@/context/UserContext";

const PERFIL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERADOR: "Operador",
  CONSULTA_EREDES: "Consulta E-Redes",
};

const PERFIL_DOT: Record<string, string> = {
  ADMIN: "bg-blue-400",
  GESTOR: "bg-purple-400",
  OPERADOR: "bg-emerald-400",
  CONSULTA_EREDES: "bg-amber-400",
};

export default function UserSelector() {
  const { user, setUser, users } = useUser();

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 flex-shrink-0">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Utilizador demo</p>
      </div>

      <select
        value={user.perfil}
        onChange={(event) => {
          const found = users.find((u) => u.perfil === event.target.value);
          if (found) setUser(found);
        }}
        className="w-full cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-150"
      >
        {users.map((u) => (
          <option key={u.perfil} value={u.perfil} className="bg-[#0A1628]">
            {u.nome}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2 px-1">
        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${PERFIL_DOT[user.perfil] ?? "bg-slate-500"}`} />
        <p className="text-[11px] text-slate-500 font-medium">
          {PERFIL_LABEL[user.perfil] ?? user.perfil}
        </p>
      </div>
    </div>
  );
}
