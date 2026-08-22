// Defaults e normalizacao do banco de dados do app.
// Extraido do home.tsx: e a camada que define a forma dos dados,
// usada tanto na criacao inicial quanto ao carregar do Supabase.

import type { AppData, BancoDeDados, DadosMes, GlobalData } from '../../app/types'
import { listaAnosAtual } from '../utils/competency'
import { meses } from '../utils/dates'


export const STORAGE_KEY = 'controle-financeiro-v16'
export const BACKUP_LAST_KEY = 'controle-financeiro-ultimo-backup-mobile'
export const categoriasPadrao = ['Mercado', 'Saúde', 'Extra', 'Lazer', 'Uber', 'Comida']
export const onboardingFixosBase = [
  { nome: 'Comissão de formatura', valor: 130 },
  { nome: 'Lavadeira', valor: 120 },
  { nome: 'Empresa de fotos', valor: 0 },
  { nome: 'CT', valor: 15 },
]
export const fixosLegadoPadrao = [
  { nome: 'Comissão de formatura', valor: 130 },
  { nome: 'Lavadeira', valor: 120 },
  { nome: 'Aeroland', valor: 49.85 },
  { nome: 'Plano de Celular', valor: 35 },
  { nome: 'Chat GPT', valor: 19 },
  { nome: 'Saeear', valor: 15 },
  { nome: 'CTMG', valor: 15 },
  { nome: 'YouTube Music', valor: 9 },
]

// Helpers usados pela normalizacao. Ficam aqui porque normalizarAppData
// depende deles; o home.tsx importa daqui em vez de redefinir.
export const extrairLinksTexto = (texto?: string) => {
  if (!texto) return [] as string[]
  const matches = texto.match(/https?:\/\/[^\s]+/gi) || []
  return Array.from(new Set(matches.map((item) => item.replace(/[),.;!?]+$/g, ''))))
}

export const sanitizarListaLinks = (links?: string[]) => {
  if (!Array.isArray(links)) return [] as string[]
  return Array.from(
    new Set(
      links
        .map((item) => String(item || '').trim())
        .filter(Boolean)
        .map((item) => (/^https?:\/\//i.test(item) ? item : `https://${item}`))
    )
  )
}

export const normalizarCategoriaNome = (categoria: unknown) => String(categoria || '').trim()

export const categoriaEhImportado = (categoria: unknown) => {
  const valor = normalizarCategoriaNome(categoria).toLowerCase()
  return valor === 'importado' || valor === 'importada' || valor === 'importados' || valor === 'importadas'
}

export function globalDefaults(): GlobalData {
  return {
    firstAccessCompleted: false,
    salaryMode: null,
    defaultFixedSalary: 0,
    onboardingFixedExpenses: [],
    pixContacts: [],
    notes: [],
    cards: [],
    profileAvatar: '💼',
    profileName: '',
    goals: [],
    shoppingWishes: [],
    investmentPercentage: 10,
    investmentBaseMode: 'salary',
    hideValues: false,
  }
}

export function buildMonthDefaults(chave: string, global: GlobalData): DadosMes {
  const fixosBase = global.onboardingFixedExpenses.length
    ? global.onboardingFixedExpenses.map((nome, index) => {
        const found = onboardingFixosBase.find((item) => item.nome === nome)
        return {
          id: `fixo-${chave}-${index}`,
          nome,
          valor: found?.valor ?? 0,
          pago: false,
          recorrenteId: `onboarding-${nome}`,
          criadoEmCompetencia: chave,
          dia: 5,
        }
      })
    : fixosLegadoPadrao.map((item, index) => ({
        id: `fixo-${chave}-${index}`,
        nome: item.nome,
        valor: item.valor,
        pago: false,
        recorrenteId: `legado-${item.nome}`,
        criadoEmCompetencia: chave,
        dia: 5,
      }))

  return {
    salario: global.salaryMode === 'fixo' ? global.defaultFixedSalary : 0,
    entradas: [],
    fixo: fixosBase,
    saidas: [],
    categoriasSaidas: [...categoriasPadrao],
  }
}

export function criarAppDataInicial(): AppData {
  const anos = listaAnosAtual()
  const global = globalDefaults()
  const bancoDeDados: BancoDeDados = {}

  anos.forEach((ano) => {
    meses.forEach((mes) => {
      const chave = `${ano}-${mes}`
      bancoDeDados[chave] = buildMonthDefaults(chave, global)
    })
  })

  return { bancoDeDados, global }
}

export function normalizarAppData(dataOriginal: unknown): AppData {
  const anos = listaAnosAtual()
  const root = dataOriginal && typeof dataOriginal === 'object' ? (dataOriginal as Record<string, any>) : {}
  const isNewShape = 'bancoDeDados' in root || 'global' in root
  const globalBase: GlobalData = {
    ...globalDefaults(),
    ...(isNewShape && root.global && typeof root.global === 'object' ? root.global : {}),
  }
  const bancoFonte: Record<string, any> = isNewShape && root.bancoDeDados ? root.bancoDeDados : root

  const bancoDeDados: BancoDeDados = {}

  anos.forEach((ano) => {
    meses.forEach((mes) => {
      const chave = `${ano}-${mes}`
      const bloco = bancoFonte[chave] || {}
      const fallback = buildMonthDefaults(chave, globalBase)

      const categoriasNormalizadas: string[] = Array.from(
        new Set(
          (Array.isArray(bloco.categoriasSaidas) ? bloco.categoriasSaidas : categoriasPadrao)
            .filter((cat: unknown) => cat && normalizarCategoriaNome(cat))
            .map((cat: unknown) => normalizarCategoriaNome(cat))
            .filter((cat: string) => !categoriaEhImportado(cat))
            .concat(categoriasPadrao)
        )
      )

      bancoDeDados[chave] = {
        salario:
          typeof bloco.salario === 'number'
            ? bloco.salario
            : globalBase.salaryMode === 'fixo'
            ? globalBase.defaultFixedSalary
            : fallback.salario,
        entradas: (Array.isArray(bloco.entradas) ? bloco.entradas : []).map((item: any, index: number) => ({
          id: item.id || `entrada-${chave}-${index}`,
          nome: item.nome || '',
          valor: Number(item.valor || 0),
          dia: Number(item.dia || 1),
        })),
        fixo: (Array.isArray(bloco.fixo) && bloco.fixo.length ? bloco.fixo : fallback.fixo).map(
          (item: any, index: number) => ({
            id: item.id || `fixo-${chave}-${index}`,
            nome: item.nome || '',
            valor: Number(item.valor || 0),
            pago: Boolean(item.pago),
            dia: Number(item.dia || 5),
            // Sem isto o vinculo do gasto recorrente se perdia a cada carga:
            // o item voltava como "so neste mes" e as edicoes deixavam de
            // valer para os meses seguintes.
            recorrenteId: item.recorrenteId || undefined,
          })
        ),
        saidas: (Array.isArray(bloco.saidas) ? bloco.saidas : []).map((item: any, index: number) => ({
          id: item.id || `saida-${chave}-${index}`,
          nome: item.nome || '',
          valor: Number(item.valor || 0),
          categoria:
            item.categoria && normalizarCategoriaNome(item.categoria)
              ? categoriaEhImportado(item.categoria)
                ? 'Extra'
                : normalizarCategoriaNome(item.categoria)
              : 'Mercado',
          dia: Number(item.dia || 1),
        })),
        categoriasSaidas: categoriasNormalizadas,
      }
    })
  })

  return {
    bancoDeDados,
    global: {
      ...globalBase,
      profileName: String(globalBase.profileName || ''),
      onboardingFixedExpenses: Array.isArray(globalBase.onboardingFixedExpenses)
        ? globalBase.onboardingFixedExpenses.filter(Boolean)
        : [],
      pixContacts: Array.isArray(globalBase.pixContacts)
        ? globalBase.pixContacts.map((item: any, index: number) => ({
            id: item.id || `pix-${index}`,
            nome: item.nome || '',
            chave: item.chave || '',
            observacao: item.observacao || '',
            links: sanitizarListaLinks(Array.isArray(item.links) ? item.links : extrairLinksTexto(item.observacao || '')),
          }))
        : [],
      notes: Array.isArray(globalBase.notes)
        ? globalBase.notes.map((item: any, index: number) => ({
            id: item.id || `note-${index}`,
            titulo: item.titulo || '',
            conteudo: item.conteudo || '',
            links: sanitizarListaLinks(Array.isArray(item.links) ? item.links : extrairLinksTexto(item.conteudo || '')),
          }))
        : [],
      cards: Array.isArray(globalBase.cards)
        ? globalBase.cards.map((card: any, cIndex: number) => ({
            id: card.id || `card-${cIndex}`,
            nome: card.nome || 'Cartão',
            limite: Number(card.limite || 0),
            fechamento: Number(card.fechamento || 0),
            fechamentoMes: Number(card.fechamentoMes || 0),
            vencimento: Number(card.vencimento || 0),
            vencimentoMes: Number(card.vencimentoMes || 0),
            parcelas: Array.isArray(card.parcelas)
              ? card.parcelas.map((item: any, index: number) => ({
                  id: item.id || `installment-${cIndex}-${index}`,
                  descricao: item.descricao || '',
                  valorParcela: Number(item.valorParcela || 0),
                  totalParcelas: Number(item.totalParcelas || 1),
                  parcelaAtual: Number(item.parcelaAtual || 1),
                  competencia: item.competencia || `${new Date().getFullYear()}-${meses[new Date().getMonth()]}`,
                  dia: Number(item.dia || 1),
                  groupId: item.groupId || undefined,
                }))
              : [],
          }))
        : [],
      profileAvatar: typeof globalBase.profileAvatar === 'string' && globalBase.profileAvatar.trim() ? globalBase.profileAvatar : '💼',
      goals: Array.isArray(globalBase.goals)
        ? globalBase.goals.map((goal: any, index: number) => ({
            id: goal.id || `goal-${index}`,
            titulo: String(goal.titulo || 'Objetivo'),
            alvo: Number(goal.alvo || 0),
            atual: Number(goal.atual || 0),
          }))
        : [],
      shoppingWishes: Array.isArray(globalBase.shoppingWishes)
        ? globalBase.shoppingWishes.map((item: any, index: number) => ({
            id: item.id || `wish-${index}`,
            nome: String(item.nome || 'Item'),
            precoAtual: Number(item.precoAtual || 0),
            loja: String(item.loja || ''),
            dataVista: String(item.dataVista || ''),
            observacao: String(item.observacao || ''),
            comprado: Boolean(item.comprado),
            criadaEmCompetencia: String(item.criadaEmCompetencia || ''),
            compradoEmCompetencia: String(item.compradoEmCompetencia || ''),
          }))
        : [],
      investmentPercentage: Math.min(50, Math.max(0, Number(globalBase.investmentPercentage ?? 10))),
      investmentBaseMode: globalBase.investmentBaseMode === 'salary_plus_entries' ? 'salary_plus_entries' : 'salary',
      hideValues: Boolean(globalBase.hideValues),
    },
  }
}
