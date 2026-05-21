"use client";

import { useUser } from "@/context/UserContext";

const PERFIL_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERADOR: "Operador",
  CONSULTA_EREDES: "Consulta E-Redes",
};

const PERFIL_COLOR: Record<string, string> = {
  ADMIN: "text-blue-400",
  GESTOR: "text-purple-400",
  OPERADOR: "text-emerald-400",
  CONSULTA_EREDES: "text-amber-400",
};

export default function UserSelector() {
  const { user, setUser, users } = useUser();

  return (
    <div className="space-y-1.5">
      <p className="px-1 text-xs font-medium uppercase tracking-wider text-slate-600">Utilizador demo</p>
      <select
        value={user.perfil}
        onChange={(event) => {
          const found = users.find((u) => u.perfil === event.target.value);
          if (found) setUser(found);
        }}
        className="w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {users.map((u) => (
          <option key={u.perfil} value={u.perfil} className="bg-slate-800">
            {u.nome}
          </option>
        ))}
      </select>
      <p className="px-1 text-xs">
        Perfil: <span className={`font-semibold ${PERFIL_COLOR[user.perfil] ?? "text-slate-400"}`}>
          {PERFIL_LABEL[user.perfil] ?? user.perfil}
        </span>
      </p>
    </div>
  );
}
