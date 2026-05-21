import "dotenv/config"
import { PrismaClient, Perfil, Proprietario, TipoMovimento, Unidade } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

function assertSafeReset() {
  const url = process.env.DATABASE_URL ?? ""
  const isSharedLike = /neon\.tech|amazonaws|azure|supabase|render|railway|fly\.dev/i.test(url)

  if (isSharedLike && process.env.ALLOW_DEMO_RESET !== "true") {
    throw new Error(
      "Seed bloqueado: DATABASE_URL parece apontar para uma base partilhada/cloud. Define ALLOW_DEMO_RESET=true para resetar a demo conscientemente."
    )
  }
}

async function resetDemoData() {
  await prisma.movimento.deleteMany()
  await prisma.linhaContagem.deleteMany()
  await prisma.sessaoContagem.deleteMany()
  await prisma.linhaRequisicao.deleteMany()
  await prisma.requisicao.deleteMany()
  await prisma.obra.deleteMany()
  await prisma.produto.deleteMany()
  await prisma.localizacao.deleteMany()
  await prisma.configuracao.deleteMany()
  await prisma.utilizador.deleteMany()
}

async function main() {
  assertSafeReset()
  await resetDemoData()

  const [admin, gestor, operador] = await Promise.all([
    prisma.utilizador.create({ data: { nome: "Admin", perfil: Perfil.ADMIN } }),
    prisma.utilizador.create({ data: { nome: "Gestor", perfil: Perfil.GESTOR } }),
    prisma.utilizador.create({ data: { nome: "Operador Joao", perfil: Perfil.OPERADOR } }),
    prisma.utilizador.create({ data: { nome: "Consulta E-Redes", perfil: Perfil.CONSULTA_EREDES } }),
  ])

  const [prateleiraA, prateleiraB, exterior] = await Promise.all([
    prisma.localizacao.create({ data: { nome: "Prateleira A" } }),
    prisma.localizacao.create({ data: { nome: "Prateleira B" } }),
    prisma.localizacao.create({ data: { nome: "Exterior / Cabos" } }),
  ])

  const produtos = await Promise.all([
    prisma.produto.create({
      data: {
        nome: "Modem 4G",
        codigo_e2z: "E2Z-MOD-4G",
        codigo_edp: "EDP-MOD-4G",
        capitulo: "Telecomunicacoes",
        artigo: "MOD-4G-001",
        proprietario: Proprietario.E_REDES,
        unidade: Unidade.UN,
        dimensao_tecnica: "4G",
        stock_min: "20",
        stock_max: "50",
        incremento_quantidade: "1",
        localizacao_id: prateleiraA.id,
      },
    }),
    prisma.produto.create({
      data: {
        nome: "Selos",
        codigo_e2z: "E2Z-SELOS",
        codigo_edp: "EDP-SELOS",
        capitulo: "Selagem",
        artigo: "SEL-001",
        proprietario: Proprietario.E_REDES,
        unidade: Unidade.UN,
        stock_min: "100",
        stock_max: "300",
        incremento_quantidade: "1",
        localizacao_id: prateleiraA.id,
      },
    }),
    prisma.produto.create({
      data: {
        nome: "Caixa Monofasica Ligadores Subst DCP",
        codigo_e2z: "E2Z-CX-MONO",
        codigo_edp: "EDP-CX-MONO",
        capitulo: "Caixas",
        artigo: "CX-MON-DCP",
        proprietario: Proprietario.E_REDES,
        unidade: Unidade.UN,
        dimensao_tecnica: "monofasica",
        stock_min: "20",
        stock_max: "50",
        incremento_quantidade: "1",
        localizacao_id: prateleiraB.id,
      },
    }),
    prisma.produto.create({
      data: {
        nome: "Uniao Pre-Isolada MJPB 16-16",
        codigo_e2z: "E2Z-UNI-MJPB-16",
        capitulo: "Ligadores",
        artigo: "UNI-MJPB-16",
        proprietario: Proprietario.E2Z,
        unidade: Unidade.UN,
        dimensao_tecnica: "16-16 mm2",
        stock_min: "10",
        stock_max: "40",
        incremento_quantidade: "1",
        localizacao_id: prateleiraB.id,
      },
    }),
    prisma.produto.create({
      data: {
        nome: "Cabo BT 4x25 mm2",
        codigo_e2z: "E2Z-CAB-BT-4X25",
        capitulo: "Cabos",
        artigo: "CAB-BT-4X25",
        proprietario: Proprietario.E2Z,
        unidade: Unidade.M,
        dimensao_tecnica: "4x25 mm2",
        stock_min: "50",
        stock_max: "200",
        incremento_quantidade: "0.5",
        localizacao_id: exterior.id,
      },
    }),
    prisma.produto.create({
      data: {
        nome: "Terminal Bimetalico C0AU",
        codigo_e2z: "E2Z-TER-C0AU",
        capitulo: "Terminais",
        artigo: "TER-BIMETAL",
        proprietario: Proprietario.E2Z,
        unidade: Unidade.UN,
        dimensao_tecnica: "C0AU",
        stock_min: "5",
        stock_max: "25",
        incremento_quantidade: "1",
        localizacao_id: prateleiraB.id,
      },
    }),
    prisma.produto.create({
      data: {
        nome: "Fio Selar",
        codigo_e2z: "E2Z-FIO-SELAR",
        codigo_edp: "EDP-FIO-SELAR",
        capitulo: "Selagem",
        artigo: "FIO-SEL-001",
        proprietario: Proprietario.E_REDES,
        unidade: Unidade.ROLO,
        dimensao_tecnica: "a confirmar",
        stock_min: "1",
        stock_max: null,
        incremento_quantidade: "1",
        localizacao_id: prateleiraA.id,
      },
    }),
  ])

  const abertura: Record<string, string> = {
    "Modem 4G": "1",
    "Selos": "0",
    "Caixa Monofasica Ligadores Subst DCP": "13",
    "Uniao Pre-Isolada MJPB 16-16": "12",
    "Cabo BT 4x25 mm2": "80",
    "Terminal Bimetalico C0AU": "0",
    "Fio Selar": "0",
  }

  for (const produto of produtos) {
    await prisma.movimento.create({
      data: {
        produto_id: produto.id,
        tipo: TipoMovimento.ABERTURA,
        quantidade: abertura[produto.nome] ?? "0",
        utilizador_id: admin.id,
        notas: "Stock inicial da demo",
      },
    })
  }

  await prisma.configuracao.createMany({
    data: [
      { chave: "dias_requisicao", valor: "terca,quinta", descricao: "Dias habituais simulados na demo" },
      { chave: "aprovadores_demo", valor: "Admin,Gestor", descricao: "Aprovadores mockados" },
      { chave: "destinatarios_notificacao", valor: "responsavel@demo.local", descricao: "Notificacao simulada na demo" },
    ],
  })

  await prisma.obra.create({
    data: { nome: "Obra Lisboa Norte", referencia: "OBR-DEMO-001" },
  })

  await prisma.requisicao.create({
    data: {
      criado_por_id: gestor.id,
      estado: "PENDENTE",
      notas: "Requisicao demo pendente",
      linhas: {
        create: [
          {
            produto_id: produtos.find((p) => p.nome === "Modem 4G")!.id,
            quantidade_sugerida: "49",
            quantidade_pedida: "49",
          },
        ],
      },
    },
  })

  console.log("Seed da demo concluido.")
  console.log("Utilizadores: 4")
  console.log("Produtos: 7")
  console.log("Movimentos ABERTURA: 7")
  console.log(`Operador demo: ${operador.nome}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
