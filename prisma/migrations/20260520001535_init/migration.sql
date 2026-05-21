-- CreateEnum
CREATE TYPE "Proprietario" AS ENUM ('E2Z', 'E_REDES');

-- CreateEnum
CREATE TYPE "Unidade" AS ENUM ('UN', 'M', 'ROLO');

-- CreateEnum
CREATE TYPE "TipoMovimento" AS ENUM ('ENTRADA', 'SAIDA', 'SAIDA_EMERGENCIA', 'SAIDA_OVERRIDE', 'AJUSTE_CONTAGEM');

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMIN', 'GESTOR', 'OPERADOR', 'CONSULTA_EREDES');

-- CreateEnum
CREATE TYPE "EstadoRequisicao" AS ENUM ('PENDENTE', 'RECEBIDA_PARCIAL', 'RECEBIDA_TOTAL', 'CANCELADA');

-- CreateEnum
CREATE TYPE "EstadoLinha" AS ENUM ('PENDENTE', 'RECEBIDA_PARCIAL', 'RECEBIDA_TOTAL');

-- CreateTable
CREATE TABLE "Utilizador" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,

    CONSTRAINT "Utilizador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo_edp" TEXT,
    "proprietario" "Proprietario" NOT NULL,
    "unidade" "Unidade" NOT NULL,
    "dimensao" TEXT,
    "stock_min" INTEGER NOT NULL DEFAULT 0,
    "stock_max" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimento" (
    "id" SERIAL NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "tipo" "TipoMovimento" NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "utilizador_id" INTEGER NOT NULL,
    "autorizado_por" TEXT,
    "notas" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requisicao" (
    "id" SERIAL NOT NULL,
    "estado" "EstadoRequisicao" NOT NULL DEFAULT 'PENDENTE',
    "criado_por_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Requisicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinhaRequisicao" (
    "id" SERIAL NOT NULL,
    "requisicao_id" INTEGER NOT NULL,
    "produto_id" INTEGER NOT NULL,
    "quantidade_pedida" INTEGER NOT NULL,
    "quantidade_recebida" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoLinha" NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "LinhaRequisicao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Produto_codigo_edp_key" ON "Produto"("codigo_edp");

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimento" ADD CONSTRAINT "Movimento_utilizador_id_fkey" FOREIGN KEY ("utilizador_id") REFERENCES "Utilizador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisicao" ADD CONSTRAINT "Requisicao_criado_por_id_fkey" FOREIGN KEY ("criado_por_id") REFERENCES "Utilizador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinhaRequisicao" ADD CONSTRAINT "LinhaRequisicao_requisicao_id_fkey" FOREIGN KEY ("requisicao_id") REFERENCES "Requisicao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinhaRequisicao" ADD CONSTRAINT "LinhaRequisicao_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
