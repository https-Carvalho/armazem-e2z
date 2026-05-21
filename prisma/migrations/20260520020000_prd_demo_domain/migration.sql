-- CreateEnum
CREATE TYPE "EstadoSessaoContagem" AS ENUM ('ABERTA', 'CONCLUIDA');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoRequisicao" ADD VALUE 'RASCUNHO';
ALTER TYPE "EstadoRequisicao" ADD VALUE 'CONFIRMADA';

-- AlterEnum
UPDATE "Movimento" SET "tipo" = 'SAIDA' WHERE "tipo" IN ('SAIDA_EMERGENCIA', 'SAIDA_OVERRIDE');

BEGIN;
CREATE TYPE "TipoMovimento_new" AS ENUM ('ABERTURA', 'ENTRADA', 'SAIDA', 'AJUSTE_CONTAGEM', 'ANULACAO');
ALTER TABLE "Movimento" ALTER COLUMN "tipo" TYPE "TipoMovimento_new" USING ("tipo"::text::"TipoMovimento_new");
ALTER TYPE "TipoMovimento" RENAME TO "TipoMovimento_old";
ALTER TYPE "TipoMovimento_new" RENAME TO "TipoMovimento";
DROP TYPE "public"."TipoMovimento_old";
COMMIT;

-- AlterTable
ALTER TABLE "LinhaRequisicao" ADD COLUMN     "quantidade_sugerida" DECIMAL(65,30);

UPDATE "LinhaRequisicao" SET "quantidade_sugerida" = "quantidade_pedida";

ALTER TABLE "LinhaRequisicao" ALTER COLUMN "quantidade_sugerida" SET NOT NULL,
ALTER COLUMN "quantidade_pedida" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "quantidade_recebida" SET DEFAULT 0,
ALTER COLUMN "quantidade_recebida" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Movimento" DROP COLUMN "autorizado_por",
ADD COLUMN     "autorizado_por_id" INTEGER,
ADD COLUMN     "emergencia" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "linha_requisicao_id" INTEGER,
ADD COLUMN     "motivo" TEXT,
ADD COLUMN     "obra_id" INTEGER,
ADD COLUMN     "override_operacional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sessao_contagem_id" INTEGER,
ALTER COLUMN "quantidade" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Produto" DROP COLUMN "dimensao",
ADD COLUMN     "artigo" TEXT,
ADD COLUMN     "capitulo" TEXT,
ADD COLUMN     "codigo_e2z" TEXT,
ADD COLUMN     "dimensao_tecnica" TEXT,
ADD COLUMN     "incremento_quantidade" DECIMAL(65,30) NOT NULL DEFAULT 1,
ADD COLUMN     "localizacao_id" INTEGER,
ADD COLUMN     "versao" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "stock_min" SET DEFAULT 0,
ALTER COLUMN "stock_min" SET DATA TYPE DECIMAL(65,30),
ALTER COLUMN "stock_max" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Requisicao" ADD COLUMN     "confirmado_em" TIMESTAMP(3),
ADD COLUMN     "notas" TEXT,
ALTER COLUMN "estado" SET DEFAULT 'RASCUNHO';

-- CreateTable
CREATE TABLE "Localizacao" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Localizacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessaoContagem" (
    "id" SERIAL NOT NULL,
    "estado" "EstadoSessaoContagem" NOT NULL DEFAULT 'ABERTA',
    "criado_por_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluido_em" TIMESTAMP(3),

    CONSTRAINT "SessaoContagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinhaContagem" (
    "id" SERIAL NOT NULL,
    "sessao_contagem_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "quantidade_esperada" DECIMAL(65,30) NOT NULL,
    "quantidade_contada" DECIMAL(65,30),
    "desvio" DECIMAL(65,30),
    "justificacao" TEXT,

    CONSTRAINT "LinhaContagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Obra" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "referencia" TEXT,

    CONSTRAINT "Obra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Localizacao_nome_key" ON "Localizacao"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracao_chave_key" ON "Configuracao"("chave");

-- CreateIndex
CREATE INDEX "Movimento_produto_id_criado_em_idx" ON "Movimento"("produto_id", "criado_em");

-- CreateIndex
CREATE INDEX "Movimento_tipo_criado_em_idx" ON "Movimento"("tipo", "criado_em");

-- CreateIndex
CREATE INDEX "Movimento_emergencia_criado_em_idx" ON "Movimento"("emergencia", "criado_em");

-- CreateIndex
CREATE INDEX "Movimento_override_operacional_criado_em_idx" ON "Movimento"("override_operacional", "criado_em");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_codigo_e2z_key" ON "Produto"("codigo_e2z");

-- CreateIndex
CREATE INDEX "Produto_proprietario_idx" ON "Produto"("proprietario");

-- CreateIndex
CREATE INDEX "Produto_nome_idx" ON "Produto"("nome");

-- AddForeignKey
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_localizacao_id_fkey" FOREIGN KEY ("localizacao_id") REFERENCES "Localizacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_autorizado_por_id_fkey" FOREIGN KEY ("autorizado_por_id") REFERENCES "Utilizador"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_obra_id_fkey" FOREIGN KEY ("obra_id") REFERENCES "Obra"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_sessao_contagem_id_fkey" FOREIGN KEY ("sessao_contagem_id") REFERENCES "SessaoContagem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_linha_requisicao_id_fkey" FOREIGN KEY ("linha_requisicao_id") REFERENCES "LinhaRequisicao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessaoContagem" ADD CONSTRAINT "SessaoContagem_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "Utilizador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinhaContagem" ADD CONSTRAINT "LinhaContagem_sessao_contagem_id_fkey" FOREIGN KEY ("sessao_contagem_id") REFERENCES "SessaoContagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinhaContagem" ADD CONSTRAINT "LinhaContagem_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
