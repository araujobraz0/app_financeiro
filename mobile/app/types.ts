// Tipos compartilhados do app Brazllet
// Extraído de home.tsx para organizar o projeto

export type EntradaItem = {
  id: string
  nome: string
  valor: number
  dia?: number
}

export type SaidaItem = {
  id: string
  nome: string
  valor: number
  categoria: string
  dia?: number
}

/** Gasto fixo como a tela ve: ja resolvido para uma competencia. */
export type FixoItem = {
  id: string
  nome: string
  valor: number
  pago: boolean
  /** Dia em que foi marcado como pago. Null enquanto estiver em aberto. */
  pagoNoDia?: number | null
  dia?: number
  recorrenteId?: string
  criadoEmCompetencia?: string
}

/** Um valor do gasto fixo, valendo a partir de uma competencia. */
export type FixoVersao = {
  desde: string
  nome: string
  valor: number
}

/**
 * Definicao de um gasto fixo, guardada uma unica vez.
 *
 * O app antes gravava uma copia do gasto dentro de cada mes, e "mudar daqui
 * para a frente" virava um laco que so alcancava os meses ja gravados. Aqui a
 * regra e a propria estrutura: o gasto vale de `criadoEm` ate `encerradoEm`
 * (exclusivo) e cada versao passa a valer a partir da sua competencia. Meses
 * anteriores continuam lendo a versao antiga porque nunca foram tocados.
 */
export type FixoRecorrente = {
  id: string
  criadoEm: string
  /** Primeira competencia em que o gasto NAO existe mais. Null = sem fim. */
  encerradoEm: string | null
  versoes: FixoVersao[]
}

export type NoteItem = {
  id: string
  titulo: string
  conteudo: string
  links?: string[]
}

export type PixItem = {
  id: string
  nome: string
  chave: string
  observacao: string
  links?: string[]
}

export type CardInstallment = {
  id: string
  descricao: string
  valorParcela: number
  totalParcelas: number
  parcelaAtual: number
  competencia: string
  dia?: number
  groupId?: string
}

export type CardItem = {
  id: string
  nome: string
  limite?: number
  fechamento?: number | null
  fechamentoMes?: number | null
  vencimento?: number | null
  vencimentoMes?: number | null
  parcelas: CardInstallment[]
  /**
   * Cobrancas que se repetem todo mes neste cartao (Spotify, Netflix).
   *
   * Mesma estrutura dos gastos fixos: uma definicao com validade e historico de
   * valores, em vez de uma copia por mes. Assim "cancelei em outubro" nao apaga
   * as cobrancas que realmente aconteceram antes.
   */
  assinaturas?: FixoRecorrente[]
}

export type GoalItem = {
  id: string
  titulo: string
  alvo: number
  atual: number
}

export type ShoppingWishItem = {
  id: string
  nome: string
  precoAtual: number
  loja: string
  dataVista: string
  observacao: string
  comprado: boolean
  criadaEmCompetencia?: string
  compradoEmCompetencia?: string
}

export type DadosMes = {
  salario: number
  entradas: EntradaItem[]
  /**
   * Copia legada dos gastos fixos do mes. Nao e mais a fonte da verdade — os
   * gastos vivem em `global.fixosRecorrentes` —, mas continua gravada para que
   * dados antigos possam ser relidos se a migracao precisar rodar de novo.
   */
  fixo: FixoItem[]
  /** Dia em que cada gasto fixo foi marcado como pago neste mes. */
  fixoPagos?: Record<string, number>
  /** Dia em que a fatura de cada cartao foi paga nesta competencia. */
  faturasPagas?: Record<string, number>
  saidas: SaidaItem[]
  categoriasSaidas: string[]
}

export type BancoDeDados = Record<string, DadosMes>

export type InvestmentBaseMode = 'salary' | 'salary_plus_entries'

export type GlobalData = {
  firstAccessCompleted: boolean
  salaryMode: 'fixo' | 'variavel' | null
  defaultFixedSalary: number
  onboardingFixedExpenses: string[]
  pixContacts: PixItem[]
  notes: NoteItem[]
  cards: CardItem[]
  profileAvatar?: string
  profileName?: string
  goals: GoalItem[]
  shoppingWishes: ShoppingWishItem[]
  investmentPercentage: number
  investmentBaseMode: InvestmentBaseMode
  hideValues: boolean
  /** Gastos fixos do usuario, com o historico de valores. */
  fixosRecorrentes: FixoRecorrente[]
  /** Teto mensal de gasto por categoria. Ausente = categoria sem limite. */
  limitesCategorias: Record<string, number>
  /**
   * Nome ja ensinado -> categoria. E o que faz "padaria" cair sozinha na
   * categoria certa a partir da segunda vez que for falada.
   */
  categoriasAprendidas: Record<string, string>
  /**
   * Marca que os gastos fixos ja sairam do formato antigo (uma copia por mes).
   * Sem ela nao da para distinguir "ainda nao migrou" de "migrou e o usuario
   * apagou todos" — e o segundo caso reviveria os gastos a cada carga.
   */
  fixosMigrados: boolean
  /**
   * Versao da conversao ja aplicada. Sobe quando um defeito da conversao
   * precisa ser corrigido em quem ja migrou — a copia antiga continua gravada
   * justamente para isso.
   */
  fixosMigracaoVersao?: number
}

export type AppData = {
  bancoDeDados: BancoDeDados
  global: GlobalData
}

export type PremiumEntitlement = {
  premium_active: boolean
  premium_expires_at: string | null
}

export type Tema = {
  // --- Tokens originais (mantidos: todo o app ja depende deles) ---
  background: string
  backgroundSoft: string
  card: string
  cardSoft: string
  text: string
  muted: string
  border: string
  borderStrong: string
  primary: string
  green: string
  red: string
  blue: string
  shadow: string
  white: string

  // --- Tokens do redesign ---
  /** Superficie acima do card (modais, itens destacados). */
  surface: string
  /** Dourado da marca, presente nos dois temas (premium, destaques). */
  accent: string
  /** Dourado translucido para fundos de badge/chip. */
  accentSoft: string
  /** Texto sobre fundo `primary`/`accent`. */
  textInverse: string
  /** Texto terciario, ainda mais discreto que `muted`. */
  faint: string
  /** Backdrop dos modais. */
  overlay: string
  /** Sombra mais densa, para elementos flutuantes. */
  shadowStrong: string
  /** Gradiente de destaque (saldo, hero). */
  gradientFrom: string
  gradientTo: string
  /** Fundos tingidos para estados semanticos. */
  greenSoft: string
  redSoft: string
  blueSoft: string
  /** Placeholder de carregamento. */
  skeleton: string
  skeletonHighlight: string
}

export type AbaInferior = 'home' | 'fixo' | 'variavel' | 'cartao'
export type SortMode = 'recentes' | 'maior_valor' | 'menor_valor' | 'alfabetica'
export type SettingsThemeMode = 'manual' | 'system'
export type TipoVariavelTab = 'entrada' | 'saida'
export type TipoFormularioLancamento = 'entrada' | 'saida' | 'fixo' | 'parcela'
export type QuickAddType = 'entrada' | 'saida' | 'fixo' | 'parcela'
export type ModoModal = 'novo' | 'editar'
export type ModoCategoria = 'nova' | 'editar'
export type NoteModalMode = 'pix' | 'nota'

export type SearchResult = {
  tipo: 'Entrada' | 'Saída' | 'Fixo' | 'Cartão' | 'Parcela' | 'Nota' | 'Pix'
  titulo: string
  subtitulo: string
  id: string
  relatedId?: string
}

export type CardModalMode = 'card' | 'installment'
export type SortTarget = 'fixo' | 'entradas' | 'saidas' | 'notas' | 'cartao'
export type DeleteTarget = 'fixo' | 'entrada' | 'saida' | 'pix' | 'nota' | 'cartao' | 'parcela' | 'categoria' | 'compra_desejo' | 'objetivo' | 'assinatura'
export type CalendarTarget = 'dia_edicao' | 'cartao_fechamento' | 'cartao_vencimento' | 'wish_data'
