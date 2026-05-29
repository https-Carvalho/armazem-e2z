# armazem-e2z — Regras do Projeto

## Stack
- **Framework:** Next.js 16 (App Router) + TypeScript
- **Base de dados:** PostgreSQL via Neon (cloud)
- **ORM:** Prisma 7 — schema em `prisma/schema.prisma`, cliente gerado em `src/generated/prisma`
- **Estilos:** Tailwind CSS v4
- **Deploy:** Vercel

## Regra crítica — Stock
> O stock nunca é guardado diretamente num campo. É **sempre calculado** como `SUM(quantidade)` da tabela `Movimento` para cada produto. Nunca criar campos `stock_atual` ou similar.

## Estrutura de pastas
```
src/
  app/
    page.tsx                  ← dashboard principal
    api/                      ← endpoints da API (route.ts por pasta)
    (routes)/                 ← páginas da app
  lib/
    prisma.ts                 ← instância singleton do Prisma
    stock.ts                  ← funções de cálculo de stock
  components/                 ← componentes React reutilizáveis
  generated/
    prisma/                   ← cliente Prisma gerado (não editar)
prisma/
  schema.prisma               ← definição das tabelas
  seed.ts                     ← dados de demo
```

---

## Regras por tipo de tarefa

### Base de dados / Schema
**Agente:** `database-architect` ou `sql-pro`
**Skill:** nenhuma — usar agente diretamente
- Alterações ao schema sempre via `npx prisma migrate dev --name <descricao>`
- Nunca editar ficheiros em `prisma/migrations/` manualmente
- Após qualquer mudança ao schema correr `npx prisma generate`
- Relações sempre com FK explícita no schema

### Queries / Lógica de dados
**Agente:** `sql-pro` (queries complexas), `backend-architect` (lógica de domínio)
- Usar sempre o cliente Prisma de `src/generated/prisma`, nunca SQL raw exceto quando necessário
- Cálculo de stock: `_sum: { quantidade: true }` agrupado por `produto_id`
- Validações de stock negativo feitas no servidor, nunca só no frontend

### API Routes (backend)
**Agente:** `backend-architect`
**Skill:** `senior-backend`
- Um ficheiro `route.ts` por recurso em `src/app/api/<recurso>/`
- Validação de input com `zod` antes de qualquer operação na BD
- Erros retornam sempre `{ error: string }` com o status HTTP correto
- Nunca expor stack traces ao cliente

### Frontend / Componentes React
**Agente:** `frontend-developer`
**Skill:** `react-best-practices`
- Server Components por defeito — só usar `"use client"` quando necessário (interatividade, hooks)
- Tailwind v4 para estilos — sem CSS inline, sem módulos CSS
- Nomes de componentes em PascalCase, ficheiros em kebab-case
- Props sempre tipadas com TypeScript

### UI / Design
**Agente:** `ui-ux-designer`
- Badge E2Z → azul (`bg-blue-100 text-blue-800`)
- Badge E-Redes → amarelo (`bg-yellow-100 text-yellow-800`)
- Stock crítico → vermelho (`text-red-600`)
- Stock OK → verde (`text-green-600`)
- Tabelas com cabeçalho fixo em listas longas

### Code Review
**Agente:** `code-reviewer`
**Skill:** `code-reviewer`
- Invocar antes de qualquer funcionalidade considerada completa
- Foco: segurança, validações, lógica de stock, permissões por perfil

### Debugging
**Agente (Codex):** `debugger`, `browser-debugger`
- `debugger` para erros de servidor/API/Prisma
- `browser-debugger` para erros de UI/hidratação

### Refactoring / Limpeza
**Agente:** `unused-code-cleaner`, `refactoring-specialist` (Codex)
- Invocar após completar uma fase, antes de avançar para a seguinte

### Performance
**Agente (Codex):** `performance-engineer`
- Invocar se queries demoram mais de 200ms ou se há re-renders excessivos

### Segurança
**Agente (Codex):** `security-auditor`
- Invocar antes de qualquer deploy para produção
- Atenção especial a: validação de perfis nas API routes, exposição de dados E-Redes a perfis sem permissão

---

## Perfis de utilizador (demo)
| Perfil | Pode fazer |
|---|---|
| ADMIN / GESTOR | tudo — incluindo autorizar emergências e overrides |
| OPERADOR | registar saídas normais, entradas, contagens |
| CONSULTA_EREDES | leitura apenas, só vê materiais E-Redes |

## Dados de demo (seed)
Os 7 produtos do PRD estão em `prisma/seed.ts`. Para recarregar: `npx prisma db seed`.

## Comandos úteis
```powershell
npm run dev                          # iniciar servidor local
npx prisma studio                    # ver base de dados no browser
npx prisma migrate dev --name <nome> # nova migração
npx prisma generate                  # regenerar cliente após schema change
npx prisma db seed                   # carregar dados de demo
```
