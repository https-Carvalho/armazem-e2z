import { Prisma, type Unidade } from "@/generated/prisma/client";

export type ValidarQuantidadeResult =
  | { ok: true; value: Prisma.Decimal }
  | { ok: false; error: string };

export function decimal(value: string | number | Prisma.Decimal) {
  return new Prisma.Decimal(value);
}

export function validarQuantidade(input: {
  quantidade: string;
  unidade: Unidade;
  incrementoQuantidade: string;
}): ValidarQuantidadeResult {
  let quantidade: Prisma.Decimal;
  let incremento: Prisma.Decimal;

  try {
    quantidade = decimal(input.quantidade.replace(",", "."));
    incremento = decimal(input.incrementoQuantidade || "1");
  } catch {
    return { ok: false, error: "Quantidade invalida." };
  }

  if (quantidade.lte(0)) {
    return { ok: false, error: "A quantidade tem de ser superior a zero." };
  }

  if (input.unidade === "UN" && !quantidade.isInteger()) {
    return { ok: false, error: "Produtos por unidade nao aceitam quantidades fracionarias." };
  }

  if (!quantidade.mod(incremento).eq(0)) {
    return { ok: false, error: `A quantidade deve respeitar o incremento de ${incremento.toString()}.` };
  }

  return { ok: true, value: quantidade };
}
