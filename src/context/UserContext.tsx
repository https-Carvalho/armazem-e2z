"use client";

import { createContext, useContext, useState } from "react";

export type Perfil = "ADMIN" | "GESTOR" | "OPERADOR" | "CONSULTA_EREDES";

export interface UserProfile {
  nome: string;
  perfil: Perfil;
}

const USERS: UserProfile[] = [
  { nome: "Admin", perfil: "ADMIN" },
  { nome: "Gestor", perfil: "GESTOR" },
  { nome: "Operador Joao", perfil: "OPERADOR" },
  { nome: "Consulta E-Redes", perfil: "CONSULTA_EREDES" },
];

interface UserContextType {
  user: UserProfile;
  setUser: (u: UserProfile) => void;
  can: (action: Action) => boolean;
  users: UserProfile[];
}

export type Action =
  | "ver_entradas"
  | "ver_saidas"
  | "ver_contagens"
  | "ver_requisicoes"
  | "ver_historico"
  | "saida_emergencia"
  | "saida_override"
  | "aprovar_requisicao"
  | "criar_requisicao"
  | "receber_requisicao"
  | "ver_so_eredes";

const PERMISSIONS: Record<Perfil, Action[]> = {
  ADMIN: [
    "ver_entradas", "ver_saidas", "ver_contagens",
    "ver_requisicoes", "ver_historico",
    "saida_emergencia", "saida_override",
    "aprovar_requisicao", "criar_requisicao", "receber_requisicao",
  ],
  GESTOR: [
    "ver_entradas", "ver_saidas", "ver_contagens",
    "ver_requisicoes", "ver_historico",
    "saida_emergencia", "saida_override",
    "aprovar_requisicao", "criar_requisicao", "receber_requisicao",
  ],
  OPERADOR: ["ver_entradas", "ver_saidas", "ver_contagens", "ver_requisicoes", "receber_requisicao"],
  CONSULTA_EREDES: ["ver_so_eredes"],
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile>(USERS[0]);

  const can = (action: Action): boolean => {
    return PERMISSIONS[user.perfil]?.includes(action) ?? false;
  };

  return (
    <UserContext.Provider value={{ user, setUser, can, users: USERS }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
