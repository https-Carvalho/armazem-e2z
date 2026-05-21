# Armazem E2Z Demo

Demo funcional de gestao de armazem para validar o PRD Demo E2Z.

## Stack

- Next.js 16 App Router
- React 19
- Prisma 7
- PostgreSQL / Neon
- Tailwind CSS v4

## Configuracao

Cria `.env` com:

```env
DATABASE_URL="postgresql://..."
```

## Comandos

```powershell
npm install
npx prisma generate
npm run dev
```

## Migracao da demo

A migration nova esta em:

```text
prisma/migrations/20260520020000_prd_demo_domain/migration.sql
```

Como a base atual pode ser Neon/cloud e a alteracao remove campos antigos, o `migrate dev` pode pedir confirmacao interativa. Antes de aplicar numa base com dados reais, rever o SQL.

Para uma base de demo descartavel:

```powershell
npx prisma migrate deploy
```

## Reset / seed da demo

O seed apaga dados operacionais para repor o estado da demo. Se `DATABASE_URL` parecer cloud/shared, o seed bloqueia sem confirmacao explicita.

```powershell
$env:ALLOW_DEMO_RESET="true"
npx prisma db seed
```

## Roteiro manual

1. Abrir dashboard e confirmar stock critico E2Z/E-Redes.
2. Pesquisar produtos no catalogo.
3. Registar entrada e confirmar movimento no historico.
4. Registar saida normal.
5. Tentar saida sem stock como Operador e confirmar bloqueio.
6. Trocar para Gestor/Admin e autorizar emergencia E-Redes com motivo.
7. Autorizar override E2Z e confirmar que nao fica marcado como emergencia.
8. Concluir contagem com desvio justificado.
9. Gerar requisicao sugerida.
10. Receber parcialmente uma linha e confirmar `RECEBIDA_PARCIAL`.
11. Trocar para Consulta E-Redes e confirmar que nao aparecem materiais E2Z.

## Simulado na demo

- Seletor de utilizador/perfil.
- Notificacoes externas.
- Importacao completa do Excel.
- Exportacao CSV/PDF.

Stock, movimentos, permissoes de dados, contagens e requisicoes usam funcoes server-side e base de dados.
