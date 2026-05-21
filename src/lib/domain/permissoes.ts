import type { Perfil, Proprietario } from "@/generated/prisma/client";

export function podeVerProprietario(perfil: Perfil, proprietario: Proprietario) {
  if (perfil === "CONSULTA_EREDES") return proprietario === "E_REDES";
  return true;
}

export function podeAlterarStock(perfil: Perfil) {
  return perfil === "ADMIN" || perfil === "GESTOR" || perfil === "OPERADOR";
}

export function podeAutorizarExcecao(perfil: Perfil) {
  return perfil === "ADMIN" || perfil === "GESTOR";
}

export function podeGerirRequisicoes(perfil: Perfil) {
  return perfil === "ADMIN" || perfil === "GESTOR";
}
