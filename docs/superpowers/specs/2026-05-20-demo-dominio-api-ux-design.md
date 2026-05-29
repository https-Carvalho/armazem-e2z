# Demo Dominio/API/UX Design

**Goal:** transformar a demo visual do armazem E2Z numa demo funcional que prove o PRD Demo sem prometer funcionalidades de producao.

**Scope aprovado:** Next.js App Router, Prisma/Postgres, Server Actions e camada de dominio em `src/lib/domain/*`. A autenticacao continua simplificada por seletor de utilizador, mas as permissoes que afetam dados e stock passam a ser validadas no servidor.

## Principios

- O stock atual nunca fica guardado em `Produto`; e sempre calculado por soma de `Movimento.quantidade`.
- Toda a alteracao de stock passa por funcao de dominio e transacao Prisma.
- A UI pode ser demo, mas os fluxos principais devem funcionar de ponta a ponta.
- O perfil `CONSULTA_EREDES` so recebe dados E-Redes tambem no servidor.
- O que for simulado deve aparecer como "simulado na demo".

## Arquitetura

### Camada de dados

O schema Prisma sera ajustado para representar o modelo minimo do PRD Demo:

- `Produto` ganha `codigo_e2z`, `capitulo`, `artigo`, `dimensao_tecnica`, `incremento_quantidade`, `versao` e relacao opcional com `Localizacao`.
- Quantidades passam a `Decimal` para suportar metros e incrementos como `12.5`.
- `Movimento` mantem `tipo`, mas emergencia e override viram flags auditaveis: `emergencia`, `override_operacional`, `autorizado_por_id`, `motivo`.
- Entram `Localizacao`, `SessaoContagem`, `LinhaContagem`, `Obra` e `Configuracao`.
- Requisicoes guardam quantidade sugerida, quantidade pedida, quantidade recebida e estado por linha.

### Camada de dominio

Ficheiros previstos:

- `src/lib/domain/permissoes.ts`: decide se um perfil pode listar, criar movimentos, autorizar excecoes e ver proprietarios.
- `src/lib/domain/stock.ts`: calcula stock por produto e mapa de stock por movimentos.
- `src/lib/domain/quantidades.ts`: valida unidade, incremento e fracionarios.
- `src/lib/domain/saidas.ts`: regista saidas normais, emergencia E-Redes e override E2Z em all-or-nothing.
- `src/lib/domain/entradas.ts`: regista entradas.
- `src/lib/domain/contagens.ts`: cria e conclui sessoes de contagem.
- `src/lib/domain/requisicoes.ts`: cria sugestoes e regista rececoes parciais/totais.
- `src/lib/domain/catalogo.ts`: lista produtos com stock calculado e filtro por perfil.
- `src/lib/domain/historico.ts`: lista movimentos e relatorios basicos.

### Server Actions

As paginas nao devem chamar Prisma diretamente. Cada fluxo usa actions em `src/app/actions/*`:

- `catalogo-actions.ts`
- `movimento-actions.ts`
- `contagem-actions.ts`
- `requisicao-actions.ts`
- `historico-actions.ts`

As actions fazem parsing do payload, procuram o utilizador demo, chamam dominio e retornam estado serializavel para a UI.

### UX demo

As paginas atuais continuam como base visual, mas deixam de usar arrays hardcoded:

- Dashboard mostra stock critico separado E2Z/E-Redes, movimentos de hoje e requisicoes pendentes reais.
- Catalogo mostra dados reais com pesquisa por designacao/codigo/capitulo e filtro de proprietario.
- Saidas passa para formulario multi-linha com erros por linha, modal de autorizacao e motivo obrigatorio.
- Entradas grava movimento real e atualiza stock.
- Contagens cria sessao demo, calcula desvio e exige justificacao quando desvio != 0.
- Requisicoes gera sugestao, mostra alertas de dados incompletos, confirma pedido e permite rececao parcial.
- Historico mostra movimentos reais e filtros para emergencias, overrides e ajustes.

## Erros e Estados

- Erros de dominio usam mensagens curtas em portugues de Portugal.
- Erros por linha de saida nao gravam nenhum movimento.
- Server actions retornam `{ ok: true, data }` ou `{ ok: false, errors }`.
- UI mostra estado pendente, sucesso e erro.

## Testes

Adicionar suite de testes de dominio antes da implementacao:

- stock calculado por movimentos;
- saida normal reduz stock;
- saida all-or-nothing;
- operador bloqueado por stock insuficiente;
- emergencia E-Redes exige gestor/admin e motivo;
- override E2Z nao marca emergencia;
- unidade `UN` rejeita fracionario;
- unidade `M` aceita incremento decimal;
- contagem gera ajuste com sinal correto;
- requisicao sugerida usa `MAX(0, stock_max - stock)`;
- rececao parcial atualiza linha e cria entrada;
- `CONSULTA_EREDES` nao ve E2Z.

## Fora de Escopo da Demo

- Login real, MFA, SSO.
- SMS/WhatsApp real.
- PDF final para fornecedor.
- Importador Excel completo.
- App mobile nativa.
- Multi-armazem.

## Riscos

- O ambiente live pode ter uma base Neon diferente da base local. O seed/reset deve exigir confirmacao por variavel de ambiente antes de apagar dados.
- O schema atual ainda nao suporta decimais; migracoes devem ser feitas por Prisma, nunca editando migrations antigas.
- Sem testes de dominio, a demo pode parecer correta na UI e ainda quebrar regras centrais do PRD.
