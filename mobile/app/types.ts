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

export type FixoItem = {
  id: string
  nome: string
  valor: number
  pago: boolean
  dia?: number
  recorrenteId?: string
  criadoEmCompetencia?: string
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
  fixo: FixoItem[]
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
export type DeleteTarget = 'fixo' | 'entrada' | 'saida' | 'pix' | 'nota' | 'cartao' | 'parcela' | 'categoria' | 'compra_desejo' | 'objetivo'
export type CalendarTarget = 'dia_edicao' | 'cartao_fechamento' | 'cartao_vencimento' | 'wish_data'
