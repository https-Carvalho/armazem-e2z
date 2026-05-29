# Demo Dominio/API/UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the E2Z warehouse demo functional end-to-end against the PRD Demo, with real domain rules, server-side validation, persistent demo data, and working UX flows.

**Architecture:** Keep Next.js App Router and Prisma. Add a focused domain layer under `src/lib/domain`, expose it through Server Actions under `src/app/actions`, then convert pages from hardcoded arrays to real data and form submissions. Critical stock behavior is tested before production code changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 7, PostgreSQL/Neon, Tailwind CSS v4, Node test runner or Vitest.

---

## File Map

- Modify: `prisma/schema.prisma` for PRD demo entities, decimal quantities, audit fields and indexes.
- Modify: `prisma/seed.ts` for deterministic demo reset with environment guard.
- Create: `src/lib/domain/types.ts` for shared input/result types.
- Create: `src/lib/domain/permissoes.ts` for server-side role checks.
- Create: `src/lib/domain/quantidades.ts` for increment and fractional validation.
- Create: `src/lib/domain/stock.ts` for stock aggregation.
- Create: `src/lib/domain/catalogo.ts` for catalog/dashboard data.
- Create: `src/lib/domain/saidas.ts` for all stock-out logic.
- Create: `src/lib/domain/entradas.ts` for stock-in logic.
- Create: `src/lib/domain/contagens.ts` for count sessions and adjustments.
- Create: `src/lib/domain/requisicoes.ts` for suggested requests and receiving.
- Create: `src/lib/domain/historico.ts` for reports.
- Create: `src/app/actions/catalogo-actions.ts`.
- Create: `src/app/actions/movimento-actions.ts`.
- Create: `src/app/actions/contagem-actions.ts`.
- Create: `src/app/actions/requisicao-actions.ts`.
- Create: `src/app/actions/historico-actions.ts`.
- Modify: pages in `src/app/*/page.tsx` to consume real data/actions.
- Modify: `src/context/UserContext.tsx` so client selection sends a stable demo user id/profile to actions.
- Add tests under `src/lib/domain/__tests__`.

---

## Task 1: Test Harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/domain/__tests__/quantidades.test.ts`

- [ ] **Step 1: Add a test script**

Use the smallest viable runner. Prefer Node's built-in test runner if TypeScript execution is already available through `tsx`.

Expected `package.json` scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "tsx --test \"src/**/*.test.ts\""
  }
}
```

- [ ] **Step 2: Write the first failing domain test**

Create `src/lib/domain/__tests__/quantidades.test.ts`:

```ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validarQuantidade } from "../quantidades";

describe("validarQuantidade", () => {
  it("rejects fractional quantities for unit products", () => {
    const result = validarQuantidade({
      quantidade: "1.5",
      unidade: "UN",
      incrementoQuantidade: "1",
    });

    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /unidade/i);
  });

  it("accepts decimal quantities when the meter increment allows it", () => {
    const result = validarQuantidade({
      quantidade: "12.5",
      unidade: "M",
      incrementoQuantidade: "0.5",
    });

    assert.equal(result.ok, true);
    assert.equal(result.value?.toString(), "12.5");
  });
});
```

- [ ] **Step 3: Run red**

Run:

```powershell
npm run test -- src/lib/domain/__tests__/quantidades.test.ts
```

Expected: FAIL because `src/lib/domain/quantidades.ts` does not exist.

- [ ] **Step 4: Implement minimal quantity validation**

Create `src/lib/domain/quantidades.ts`:

```ts
import { Prisma } from "@/generated/prisma/client";

type Unidade = "UN" | "M" | "ROLO";

export type ValidarQuantidadeInput = {
  quantidade: string;
  unidade: Unidade;
  incrementoQuantidade: string;
};

export type ValidarQuantidadeResult =
  | { ok: true; value: Prisma.Decimal }
  | { ok: false; error: string };

export function validarQuantidade(input: ValidarQuantidadeInput): ValidarQuantidadeResult {
  const quantidade = new Prisma.Decimal(input.quantidade || "0");
  const incremento = new Prisma.Decimal(input.incrementoQuantidade || "1");

  if (quantidade.lte(0)) {
    return { ok: false, error: "A quantidade tem de ser superior a zero." };
  }

  const resto = quantidade.mod(incremento);
  if (!resto.eq(0)) {
    return { ok: false, error: `A quantidade deve respeitar o incremento de ${incremento.toString()}.` };
  }

  if (input.unidade === "UN" && !quantidade.isInteger()) {
    return { ok: false, error: "Produtos por unidade nao aceitam quantidades fracionarias." };
  }

  return { ok: true, value: quantidade };
}
```

- [ ] **Step 5: Run green**

Run:

```powershell
npm run test -- src/lib/domain/__tests__/quantidades.test.ts
```

Expected: PASS.

---

## Task 2: Prisma Schema For Demo Domain

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed.ts`
- Test: `src/lib/domain/__tests__/schema-shape.test.ts`

- [ ] **Step 1: Add a schema shape test**

Create `src/lib/domain/__tests__/schema-shape.test.ts`:

```ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");

describe("Prisma schema PRD demo shape", () => {
  it("contains the required demo entities and movement audit fields", () => {
    for (const name of ["Localizacao", "SessaoContagem", "LinhaContagem", "Obra", "Configuracao"]) {
      assert.match(schema, new RegExp(`model ${name}\\\\b`));
    }

    assert.match(schema, /emergencia\\s+Boolean/);
    assert.match(schema, /override_operacional\\s+Boolean/);
    assert.match(schema, /autorizado_por_id\\s+Int\\?/);
    assert.match(schema, /incremento_quantidade\\s+Decimal/);
    assert.match(schema, /versao\\s+Int/);
  });
});
```

- [ ] **Step 2: Run red**

Run:

```powershell
npm run test -- src/lib/domain/__tests__/schema-shape.test.ts
```

Expected: FAIL because required models/fields are missing.

- [ ] **Step 3: Update schema**

Update `prisma/schema.prisma` with these core changes:

```prisma
enum TipoMovimento {
  ABERTURA
  ENTRADA
  SAIDA
  AJUSTE_CONTAGEM
  ANULACAO
}

model Localizacao {
  id       Int       @id @default(autoincrement())
  nome     String
  produtos Produto[]
}

model Produto {
  id                    Int           @id @default(autoincrement())
  nome                  String
  codigo_e2z            String?       @unique
  codigo_edp            String?       @unique
  capitulo              String?
  artigo                String?
  proprietario          Proprietario
  unidade               Unidade
  dimensao_tecnica      String?
  stock_min             Decimal       @default(0)
  stock_max             Decimal?
  incremento_quantidade Decimal       @default(1)
  ativo                 Boolean       @default(true)
  versao                Int           @default(1)
  localizacao_id        Int?
  criado_em             DateTime      @default(now())

  localizacao Localizacao? @relation(fields: [localizacao_id], references: [id])
  movimentos  Movimento[]
  linhas_req  LinhaRequisicao[]
  linhas_cont LinhaContagem[]

  @@index([proprietario])
  @@index([nome])
}

model Movimento {
  id                     Int           @id @default(autoincrement())
  produto_id             Int
  tipo                   TipoMovimento
  quantidade             Decimal
  utilizador_id          Int
  autorizado_por_id      Int?
  obra_id                Int?
  sessao_contagem_id     Int?
  linha_requisicao_id    Int?
  emergencia             Boolean       @default(false)
  override_operacional   Boolean       @default(false)
  motivo                 String?
  notas                  String?
  criado_em              DateTime      @default(now())

  produto        Produto     @relation(fields: [produto_id], references: [id])
  utilizador     Utilizador  @relation("MovimentosCriados", fields: [utilizador_id], references: [id])
  autorizado_por Utilizador? @relation("MovimentosAutorizados", fields: [autorizado_por_id], references: [id])
  obra           Obra?       @relation(fields: [obra_id], references: [id])

  @@index([produto_id, criado_em])
  @@index([tipo, criado_em])
}
```

Also add `SessaoContagem`, `LinhaContagem`, `Obra`, `Configuracao`, and extend requisition models with line states and suggested/received quantities.

- [ ] **Step 4: Create migration and generate client**

Run:

```powershell
npx prisma migrate dev --name prd-demo-domain
npx prisma generate
```

Expected: migration succeeds and generated client updates.

- [ ] **Step 5: Run schema test green**

Run:

```powershell
npm run test -- src/lib/domain/__tests__/schema-shape.test.ts
```

Expected: PASS.

---

## Task 3: Stock And Permissions Domain

**Files:**
- Create: `src/lib/domain/stock.ts`
- Create: `src/lib/domain/permissoes.ts`
- Test: `src/lib/domain/__tests__/stock-permissoes.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/domain/__tests__/stock-permissoes.test.ts`:

```ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@/generated/prisma/client";
import { somarMovimentos } from "../stock";
import { podeVerProprietario } from "../permissoes";

describe("stock domain", () => {
  it("calculates stock from movement quantities only", () => {
    const total = somarMovimentos([
      new Prisma.Decimal("10"),
      new Prisma.Decimal("-3"),
      new Prisma.Decimal("2.5"),
    ]);

    assert.equal(total.toString(), "9.5");
  });
});

describe("permissions domain", () => {
  it("prevents CONSULTA_EREDES from seeing E2Z materials", () => {
    assert.equal(podeVerProprietario("CONSULTA_EREDES", "E2Z"), false);
    assert.equal(podeVerProprietario("CONSULTA_EREDES", "E_REDES"), true);
  });
});
```

- [ ] **Step 2: Run red**

Run:

```powershell
npm run test -- src/lib/domain/__tests__/stock-permissoes.test.ts
```

Expected: FAIL because modules do not exist.

- [ ] **Step 3: Implement domain helpers**

Create `src/lib/domain/stock.ts`:

```ts
import { Prisma } from "@/generated/prisma/client";

export function somarMovimentos(quantidades: Prisma.Decimal[]): Prisma.Decimal {
  return quantidades.reduce((total, quantidade) => total.plus(quantidade), new Prisma.Decimal(0));
}
```

Create `src/lib/domain/permissoes.ts`:

```ts
import type { Perfil, Proprietario } from "@/generated/prisma/client";

export function podeVerProprietario(perfil: Perfil, proprietario: Proprietario): boolean {
  if (perfil === "CONSULTA_EREDES") return proprietario === "E_REDES";
  return true;
}

export function podeAlterarStock(perfil: Perfil): boolean {
  return perfil === "ADMIN" || perfil === "GESTOR" || perfil === "OPERADOR";
}

export function podeAutorizarExcecao(perfil: Perfil): boolean {
  return perfil === "ADMIN" || perfil === "GESTOR";
}
```

- [ ] **Step 4: Run green**

Run:

```powershell
npm run test -- src/lib/domain/__tests__/stock-permissoes.test.ts
```

Expected: PASS.

---

## Task 4: Saidas Domain

**Files:**
- Create: `src/lib/domain/saidas.ts`
- Test: `src/lib/domain/__tests__/saidas.test.ts`

- [ ] **Step 1: Write failing tests for decisions**

Create pure decision tests before Prisma transaction code:

```ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@/generated/prisma/client";
import { validarLinhaSaida } from "../saidas";

describe("validarLinhaSaida", () => {
  it("blocks operator when quantity exceeds stock", () => {
    const result = validarLinhaSaida({
      perfil: "OPERADOR",
      proprietario: "E_REDES",
      stockAtual: new Prisma.Decimal("0"),
      quantidade: new Prisma.Decimal("1"),
      tipo: "NORMAL",
      motivo: "",
    });

    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /stock insuficiente/i);
  });

  it("allows E-Redes emergency for gestor with mandatory reason", () => {
    const result = validarLinhaSaida({
      perfil: "GESTOR",
      proprietario: "E_REDES",
      stockAtual: new Prisma.Decimal("0"),
      quantidade: new Prisma.Decimal("10"),
      tipo: "EMERGENCIA_EREDES",
      motivo: "obra parada",
    });

    assert.equal(result.ok, true);
    assert.equal(result.flags?.emergencia, true);
    assert.equal(result.flags?.override_operacional, false);
  });

  it("allows E2Z override without marking emergency", () => {
    const result = validarLinhaSaida({
      perfil: "ADMIN",
      proprietario: "E2Z",
      stockAtual: new Prisma.Decimal("0"),
      quantidade: new Prisma.Decimal("2"),
      tipo: "OVERRIDE_E2Z",
      motivo: "validacao operacional",
    });

    assert.equal(result.ok, true);
    assert.equal(result.flags?.emergencia, false);
    assert.equal(result.flags?.override_operacional, true);
  });
});
```

- [ ] **Step 2: Run red**

Run:

```powershell
npm run test -- src/lib/domain/__tests__/saidas.test.ts
```

Expected: FAIL because `validarLinhaSaida` does not exist.

- [ ] **Step 3: Implement pure validation**

Create `src/lib/domain/saidas.ts` with `validarLinhaSaida` and a later `registarSaidaBatch` wrapper that uses Prisma transaction.

Core contract:

```ts
export type TipoSaidaDemo = "NORMAL" | "EMERGENCIA_EREDES" | "OVERRIDE_E2Z";

export type SaidaFlags = {
  emergencia: boolean;
  override_operacional: boolean;
};

export function validarLinhaSaida(input: {
  perfil: Perfil;
  proprietario: Proprietario;
  stockAtual: Prisma.Decimal;
  quantidade: Prisma.Decimal;
  tipo: TipoSaidaDemo;
  motivo: string;
}): { ok: true; flags: SaidaFlags } | { ok: false; error: string } {
  // Implement exact cases tested above.
}
```

- [ ] **Step 4: Run green**

Run:

```powershell
npm run test -- src/lib/domain/__tests__/saidas.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add transaction implementation**

Implement `registarSaidaBatch(prisma, input)` after pure tests pass:

- load user and products;
- compute current stock per product inside transaction;
- validate all lines first;
- if any line fails, return errors and create zero movements;
- create `SAIDA` movements with negative quantities;
- increment `Produto.versao`;
- commit.

---

## Task 5: Server Actions

**Files:**
- Create: `src/app/actions/catalogo-actions.ts`
- Create: `src/app/actions/movimento-actions.ts`
- Create: `src/app/actions/contagem-actions.ts`
- Create: `src/app/actions/requisicao-actions.ts`
- Create: `src/app/actions/historico-actions.ts`

- [ ] **Step 1: Define action result type**

Create `src/lib/domain/types.ts`:

```ts
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };
```

- [ ] **Step 2: Implement movement actions**

`src/app/actions/movimento-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { registarSaidaBatch } from "@/lib/domain/saidas";
import type { ActionResult } from "@/lib/domain/types";

export async function registarSaidaAction(input: unknown): Promise<ActionResult<{ movimentosCriados: number }>> {
  const result = await registarSaidaBatch(prisma, input);
  if (!result.ok) return { ok: false, errors: result.errors };

  revalidatePath("/");
  revalidatePath("/catalogo");
  revalidatePath("/saidas");
  revalidatePath("/historico");

  return { ok: true, data: { movimentosCriados: result.movimentosCriados } };
}
```

- [ ] **Step 3: Add actions for catalog, history, counts, requisitions**

Each action must:

- accept a demo user/profile identifier;
- call the domain function;
- return `ActionResult<T>`;
- revalidate affected routes after writes.

---

## Task 6: UX Integration

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/catalogo/page.tsx`
- Modify: `src/app/saidas/page.tsx`
- Modify: `src/app/entradas/page.tsx`
- Modify: `src/app/contagens/page.tsx`
- Modify: `src/app/requisicoes/page.tsx`
- Modify: `src/app/historico/page.tsx`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/context/UserContext.tsx`

- [ ] **Step 1: Dashboard**

Replace hardcoded arrays with domain data:

- stock critical E2Z;
- stock critical E-Redes;
- movements today;
- pending requisitions;
- latest real movements.

- [ ] **Step 2: Catalog**

Replace local array with server data. Apply profile filter in the action/domain, not only in client state. Search must cover name, `codigo_e2z`, `codigo_edp`, `capitulo`, `artigo`.

- [ ] **Step 3: Saidas**

Convert to multi-line form:

- product selector per line;
- quantity per line with unit and step;
- errors per line;
- modal/section for emergency or override;
- mandatory reason;
- submit calls `registarSaidaAction`;
- success updates page via revalidation.

- [ ] **Step 4: Entradas**

Submit real `ENTRADA` movement. Show pending, success and error states.

- [ ] **Step 5: Contagens**

Use real session data. Require justification when diff is not zero. Submit creates `AJUSTE_CONTAGEM` movements.

- [ ] **Step 6: Requisicoes**

Add "Gerar sugestao" flow:

- products below `stock_min`;
- quantity `MAX(0, stock_max - stockAtual)`;
- alert products with missing `stock_max`;
- confirm requisition;
- receive partial/total line.

- [ ] **Step 7: Historico**

List real movements with filters and clear report tabs for movements, emergencies, overrides and count adjustments.

---

## Task 7: UX Quality Pass

**Files:**
- Modify page/component files touched in Task 6.
- Modify: `src/app/globals.css` if layout utilities are needed.

- [ ] **Step 1: Fix lint errors**

Remove synchronous `setState` inside effects by using server-render-safe date formatting or client-only components without unnecessary mount state.

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 2: Improve accessibility**

Add:

- `aria-pressed` or `aria-selected` on filter controls;
- semantic modal attributes `role="dialog"` and `aria-modal="true"`;
- visible text or accessible labels for icon buttons;
- useful form error association with `aria-describedby`.

- [ ] **Step 3: Improve tablet responsiveness**

Add breakpoints:

- dashboard cards `grid-cols-1 md:grid-cols-2 xl:grid-cols-4`;
- tables wrapped with horizontal scroll;
- sticky table headers for long lists;
- sidebar remains usable on tablet width.

- [ ] **Step 4: Mark simulated demo areas**

Add visible badges for:

- demo user selector;
- simulated notification;
- any export action that is not complete.

---

## Task 8: Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run automated checks**

Run:

```powershell
npm run test
npm run lint
npm run build
```

Expected: all pass.

- [ ] **Step 2: Manual PRD demo script**

Run local app and test:

```powershell
npm run dev
```

Manual script:

1. Dashboard shows E2Z/E-Redes critical stock separately.
2. Catalog search finds Modem 4G and filters by owner.
3. Operator records normal E2Z output.
4. Operator is blocked from insufficient Selos output.
5. Gestor authorizes E-Redes emergency with reason.
6. Admin authorizes E2Z override without emergency flag.
7. Count session creates adjustment with correct sign.
8. Suggested requisition excludes Fio Selar and suggests max minus current stock.
9. Partial receipt leaves line `RECEBIDA_PARCIAL`.
10. Consulta E-Redes cannot see E2Z records.

- [ ] **Step 3: Update README**

Document:

- environment variables;
- migrate/generate/seed commands;
- reset safety guard;
- demo route script;
- known simulated areas.

---

## Execution Notes

- Do not edit files in `prisma/migrations` manually.
- Use `npx prisma migrate dev --name <name>` for schema changes.
- Treat the current dirty worktree as existing user work; do not revert unrelated changes.
- If `DATABASE_URL` points to Neon or another shared DB, do not seed/reset unless `ALLOW_DEMO_RESET=true`.
