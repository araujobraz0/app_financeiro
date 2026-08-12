import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  AppState,
  InteractionManager,
  Alert,
  Animated,
  Image,
  Linking,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
  useWindowDimensions,
  type DimensionValue,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import * as Clipboard from 'expo-clipboard'
import * as DocumentPicker from 'expo-document-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as ImagePicker from 'expo-image-picker'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import * as Updates from 'expo-updates'
import * as XLSX from 'xlsx'
import { router } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import Svg, { Circle, G, Path } from 'react-native-svg'
import PdfPreview from '../components/PdfPreview'
import { supabase } from '../src/lib/supabase'
import type {
  EntradaItem, SaidaItem, FixoItem, NoteItem, PixItem, CardInstallment, CardItem,
  GoalItem, ShoppingWishItem, DadosMes, BancoDeDados, InvestmentBaseMode, GlobalData,
  AppData, PremiumEntitlement, Tema, AbaInferior, SortMode, SettingsThemeMode,
  TipoVariavelTab, TipoFormularioLancamento, QuickAddType, ModoModal, ModoCategoria,
  NoteModalMode, SearchResult, CardModalMode, SortTarget, DeleteTarget, CalendarTarget,
} from './types'

const BRAZLLET_PLATFORM = 'android'

const STORAGE_KEY = 'controle-financeiro-v16'
const THEME_KEY = 'controle-financeiro-tema-mobile'
const THEME_MODE_KEY = 'controle-financeiro-tema-modo-mobile'
const lightTheme: Tema = {
  background: '#f6f4ee',
  backgroundSoft: '#eeeadf',
  card: '#fffdf8',
  cardSoft: '#f4efe4',
  text: '#17361f',
  muted: '#6f7c67',
  border: '#ddd3be',
  borderStrong: '#ccb98f',
  primary: '#1f5a34',
  green: '#2c7a4a',
  red: '#c24f4f',
  blue: '#3c6d88',
  shadow: 'rgba(49, 41, 17, 0.12)',
  white: '#ffffff',
}

const darkTheme: Tema = {
  background: '#000000',
  backgroundSoft: '#0d1512',
  card: '#111a16',
  cardSoft: '#16231d',
  text: '#f7f4ea',
  muted: '#ddd7c9',
  border: '#2b3d33',
  borderStrong: '#ffffff',
  primary: '#d4a93e',
  green: '#57ba77',
  red: '#f17373',
  blue: '#8ab8df',
  shadow: 'rgba(0, 0, 0, 0.46)',
  white: '#ffffff',
}

const meses = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const categoriasPadrao = ['Mercado', 'Saúde', 'Extra', 'Lazer', 'Uber', 'Comida']
const onboardingFixosBase = [
  { nome: 'Comissão de formatura', valor: 130 },
  { nome: 'Lavadeira', valor: 120 },
  { nome: 'Empresa de fotos', valor: 0 },
  { nome: 'CT', valor: 15 },
]
const fixosLegadoPadrao = [
  { nome: 'Comissão de formatura', valor: 130 },
  { nome: 'Lavadeira', valor: 120 },
  { nome: 'Aeroland', valor: 49.85 },
  { nome: 'Plano de Celular', valor: 35 },
  { nome: 'Chat GPT', valor: 19 },
  { nome: 'Saeear', valor: 15 },
  { nome: 'CTMG', valor: 15 },
  { nome: 'YouTube Music', valor: 9 },
]
const coresPizza = ['#38bdf8', '#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#14b8a6', '#ca8a04']

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  }
}

function createDonutSlicePath(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle)
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle)
  const startInner = polarToCartesian(cx, cy, innerRadius, endAngle)
  const endInner = polarToCartesian(cx, cy, innerRadius, startAngle)

  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${endInner.x} ${endInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}`,
    'Z',
  ].join(' ')
}

const formatarMoeda = (valor: number) =>
  Number(valor || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

const formatarNumeroBR = (valor: number) =>
  Number(valor || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const formatarValorInput = (valor: number) => `R$ ${formatarNumeroBR(valor)}`

const formatarDiaMes = (dia?: number, competencia?: string) => {
  const diaNumero = Math.max(1, Number(dia || 1))
  const mesNome = competencia?.split('-')[1] || ''
  const mesIndex = meses.indexOf(mesNome)
  const mesNumero = mesIndex >= 0 ? mesIndex + 1 : new Date().getMonth() + 1
  return `${String(diaNumero).padStart(2, '0')}/${String(mesNumero).padStart(2, '0')}`
}

const digitsToMoneyString = (digits: string) => {
  const onlyDigits = String(digits || '').replace(/\D/g, '')
  const normalized = onlyDigits === '' ? '0' : onlyDigits
  const number = Number(normalized) / 100

  return `R$ ${number.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const moneyStringToNumber = (text: string) => {
  if (!text) return 0
  const cleaned = String(text).replace(/[^\d,]/g, '')
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isNaN(n) ? 0 : n
}

const compararVersoesApp = (versaoAtual: string, versaoNova: string) => {
  const atual = String(versaoAtual || '0').split('.').map((parte) => Number(parte.replace(/\D/g, '') || 0))
  const nova = String(versaoNova || '0').split('.').map((parte) => Number(parte.replace(/\D/g, '') || 0))
  const tamanho = Math.max(atual.length, nova.length)

  for (let index = 0; index < tamanho; index += 1) {
    const a = atual[index] || 0
    const b = nova[index] || 0
    if (b > a) return 1
    if (b < a) return -1
  }

  return 0
}

const obterVersaoInstalada = () => {
  const config = Constants.expoConfig || (Constants as any).manifest2?.extra?.expoClient || (Constants as any).manifest
  return String(config?.version || '1.0.0')
}


const extrairLinksTexto = (texto?: string) => {
  if (!texto) return [] as string[]
  const matches = texto.match(/https?:\/\/[^\s]+/gi) || []
  return Array.from(new Set(matches.map((item) => item.replace(/[),.;!?]+$/g, ''))))
}

const sanitizarListaLinks = (links?: string[]) => {
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

const handleMaskedMoneyInput = (rawValue: string, setter: (value: string) => void) => {
  const digits = rawValue.replace(/\D/g, '')

  if (!digits) {
    setter('')
    return
  }

  setter(digitsToMoneyString(digits))
}

const getDiasNoMes = (ano: number, mes: number) => {
  const anoSeguro = Number.isFinite(Number(ano)) ? Number(ano) : new Date().getFullYear()
  const mesSeguro = Math.min(12, Math.max(1, Number(mes || 1)))
  return new Date(anoSeguro, mesSeguro, 0).getDate()
}

const normalizarCategoriaNome = (categoria: unknown) => String(categoria || '').trim()

const categoriaEhImportado = (categoria: unknown) => {
  const valor = normalizarCategoriaNome(categoria).toLowerCase()
  return valor === 'importado' || valor === 'importada' || valor === 'importados' || valor === 'importadas'
}

const formatarInputDiaMes = (rawValue: string) => {
  const digits = String(rawValue || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

const parseDiaMesInput = (rawValue: string, fallbackMonth?: number, fallbackYear?: number) => {
  const digits = String(rawValue || '').replace(/\D/g, '').slice(0, 4)
  const mes = Math.min(12, Math.max(1, Number(digits.slice(2, 4) || fallbackMonth || 1)))
  const ano = Number(fallbackYear || new Date().getFullYear())
  const diaMaximo = getDiasNoMes(ano, mes)
  const dia = Math.min(diaMaximo, Math.max(1, Number(digits.slice(0, 2) || 1)))
  return { dia, mes }
}

const formatarDiaMesInput = (dia?: number, mes?: number, ano?: number) => {
  if (!dia && !mes) return ''
  const mesSeguro = Math.min(12, Math.max(1, Number(mes || 1)))
  const diaSeguro = Math.min(getDiasNoMes(Number(ano || new Date().getFullYear()), mesSeguro), Math.max(1, Number(dia || 1)))
  return `${String(diaSeguro).padStart(2, '0')}/${String(mesSeguro).padStart(2, '0')}`
}

function calcularCompetenciaInicialPorFechamento(
  chaveBase: string,
  diaCompra: number,
  fechamento?: number
) {
  if (!fechamento) return addMonthsToCompetencia(chaveBase, 1)
  return diaCompra <= fechamento
    ? addMonthsToCompetencia(chaveBase, 1)
    : addMonthsToCompetencia(chaveBase, 2)
}

function ajustarMesComDelta(baseMes: number, delta: number) {
  const zeroBased = ((baseMes - 1 + delta) % 12 + 12) % 12
  return zeroBased + 1
}

function getCardBillingDates(
  chaveBase: string,
  fechamentoDia?: number,
  fechamentoMes?: number,
  vencimentoDia?: number,
  vencimentoMes?: number
) {
  const [, mesNome] = chaveBase.split('-')
  const mesCompetencia = meses.indexOf(mesNome) + 1
  const fechamentoMesBase = Math.min(12, Math.max(1, Number(fechamentoMes || mesCompetencia || 1)))
  const vencimentoMesBase = Math.min(12, Math.max(1, Number(vencimentoMes || ajustarMesComDelta(fechamentoMesBase, 1))))
  const fechamentoDiaSeguro = Math.min(31, Math.max(1, Number(fechamentoDia || 1)))
  const vencimentoDiaSeguro = Math.min(31, Math.max(1, Number(vencimentoDia || 1)))
  const deltaMeses = mesCompetencia - fechamentoMesBase
  const fechamentoMesAtual = ajustarMesComDelta(fechamentoMesBase, deltaMeses)
  const vencimentoMesAtual = ajustarMesComDelta(vencimentoMesBase, deltaMeses)

  return {
    fechamentoAtual: formatarDiaMesInput(fechamentoDiaSeguro, fechamentoMesAtual),
    vencimentoAtual: formatarDiaMesInput(vencimentoDiaSeguro, vencimentoMesAtual),
    fechamentoMesAtual,
    vencimentoMesAtual,
  }
}

function listaAnosAtual() {
  const anoAtual = new Date().getFullYear()
  return [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2]
}

function addMonthsToCompetencia(chaveBase: string, offset: number) {
  const [anoTexto, mesNome] = chaveBase.split('-')
  const ano = Number(anoTexto)
  const mesIndex = meses.indexOf(mesNome)
  const data = new Date(ano, mesIndex >= 0 ? mesIndex : 0, 1)
  data.setMonth(data.getMonth() + offset)
  return `${data.getFullYear()}-${meses[data.getMonth()]}`
}

function competenciaToNumber(chave: string) {
  const [anoTexto, mesNome] = String(chave || '').split('-')
  const ano = Number(anoTexto)
  const mesIndex = meses.indexOf(mesNome)
  if (!Number.isFinite(ano) || mesIndex < 0) return 0
  return ano * 12 + mesIndex
}

function competenciaMaiorOuIgual(chave: string, referencia: string) {
  return competenciaToNumber(chave) >= competenciaToNumber(referencia)
}

function listaAnosComDados(banco: BancoDeDados) {
  const base = listaAnosAtual()
  const anosComDados = Object.entries(banco || {})
    .filter(([, dados]) => {
      if (!dados) return false
      return (
        Number(dados.salario || 0) > 0 ||
        Boolean(dados.entradas?.length) ||
        Boolean(dados.saidas?.length) ||
        Boolean(dados.fixo?.some((item) => item?.nome && String(item.nome).trim()))
      )
    })
    .map(([chave]) => Number(chave.split('-')[0]))
    .filter((ano) => Number.isFinite(ano))
  return Array.from(new Set([...base, ...anosComDados])).sort((a, b) => a - b)
}

function calcularVariacaoPercentual(atual: number, comparado: number) {
  if (comparado === 0) {
    if (atual === 0) return 0
    return 100
  }
  return ((atual - comparado) / Math.abs(comparado)) * 100
}

function globalDefaults(): GlobalData {
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

function buildMonthDefaults(chave: string, global: GlobalData): DadosMes {
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

function criarAppDataInicial(): AppData {
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

function normalizarAppData(dataOriginal: unknown): AppData {
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


function getItemTimestamp(item: { id?: string }) {
  const match = String(item?.id || '').match(/(\d{10,})/)
  return match ? Number(match[1]) : 0
}

function ordenarLista<T extends { id?: string; nome?: string; valor?: number }>(lista: T[], modo: SortMode) {
  const base = [...lista]
  if (modo === 'maior_valor') return base.sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))
  if (modo === 'menor_valor') return base.sort((a, b) => Number(a.valor || 0) - Number(b.valor || 0))
  if (modo === 'alfabetica') return base.sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'))
  return base.sort((a, b) => getItemTimestamp(b) - getItemTimestamp(a))
}


function EyeToggleIcon({ closed, color }: { closed: boolean; color: string }) {
  if (closed) {
    return (
      <Svg width={20} height={20} viewBox='0 0 24 24' fill='none'>
        <Path d='M4 12C6.2 9.3 8.8 8 12 8C15.2 8 17.8 9.3 20 12' stroke={color} strokeWidth={2.1} strokeLinecap='round' strokeLinejoin='round' />
        <Path d='M5.5 16.6L7.2 14.7' stroke={color} strokeWidth={2} strokeLinecap='round' />
        <Path d='M10.2 18L10.8 15.5' stroke={color} strokeWidth={2} strokeLinecap='round' />
        <Path d='M13.8 18L13.2 15.5' stroke={color} strokeWidth={2} strokeLinecap='round' />
        <Path d='M18.5 16.6L16.8 14.7' stroke={color} strokeWidth={2} strokeLinecap='round' />
      </Svg>
    )
  }

  return (
    <Svg width={20} height={20} viewBox='0 0 24 24' fill='none'>
      <Path
        d='M2 12C3.9 8.7 7.5 6.5 12 6.5C16.5 6.5 20.1 8.7 22 12C20.1 15.3 16.5 17.5 12 17.5C7.5 17.5 3.9 15.3 2 12Z'
        stroke={color}
        strokeWidth={2}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
      <Circle cx={12} cy={12} r={3.2} stroke={color} strokeWidth={2} />
    </Svg>
  )
}

type AppModalProps = {
  visible: boolean
  onClose: () => void
  children: ReactNode
}

function AppModal({ visible, onClose, children }: AppModalProps) {
  const translateY = useRef(new Animated.Value(0)).current
  const { height: windowHeight } = useWindowDimensions()

  useEffect(() => {
    if (!visible) {
      translateY.stopAnimation()
      translateY.setValue(0)
      return
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const onKeyboardShow = (event: any) => {
      const keyboardHeight = Number(event?.endCoordinates?.height || 0)
      const deslocamento = Math.min(Math.max(keyboardHeight * 0.022, 4), Math.min(12, windowHeight * 0.018))

      Animated.timing(translateY, {
        toValue: -deslocamento,
        duration: Platform.OS === 'ios' ? 220 : 180,
        useNativeDriver: true,
      }).start()
    }

    const onKeyboardHide = () => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? 220 : 180,
        useNativeDriver: true,
      }).start()
    }

    const showSubscription = Keyboard.addListener(showEvent as any, onKeyboardShow)
    const hideSubscription = Keyboard.addListener(hideEvent as any, onKeyboardHide)

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [translateY, visible, windowHeight])

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdropTouch} onPress={onClose} />
        <KeyboardAvoidingView
          pointerEvents='box-none'
          style={styles.modalCenterWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
        >
          <Animated.View style={[styles.modalKeyboardWrap, { transform: [{ translateY }] }]}> 
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const dataAtual = new Date()
  const { height: screenHeight } = useWindowDimensions()
  const anoAtual = dataAtual.getFullYear()
  const mesAtualIndex = dataAtual.getMonth()
  const [carregando, setCarregando] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [nome, setNome] = useState('Usuário')
  const [email, setEmail] = useState('')
  const [premiumAtivo, setPremiumAtivo] = useState(false)
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null)
  const [premiumLoading, setPremiumLoading] = useState(true)
  const [modalPremiumBloqueioAberto, setModalPremiumBloqueioAberto] = useState(false)
  const [premiumBloqueioTitulo, setPremiumBloqueioTitulo] = useState('Modo somente leitura')
  const [premiumBloqueioMensagem, setPremiumBloqueioMensagem] = useState('Você pode visualizar sua organização financeira, mas adicionar, editar, importar, exportar ou excluir informações exige o Brazllet Premium.')
  const [avatarPerfil, setAvatarPerfil] = useState('💼')
  const [nomeEditavel, setNomeEditavel] = useState('')
  const [avatarEditavel, setAvatarEditavel] = useState('💼')
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual)
  const [mesSelecionado, setMesSelecionado] = useState(meses[mesAtualIndex])
  const [appData, setAppData] = useState<AppData>(criarAppDataInicial())
  const listaAnos = useMemo(() => listaAnosComDados(appData.bancoDeDados), [appData.bancoDeDados])
  const [temaEscuro, setTemaEscuro] = useState(false)
  const [anoModalAberto, setAnoModalAberto] = useState(false)
  const [mesModalAberto, setMesModalAberto] = useState(false)
  const [salarioEmEdicao, setSalarioEmEdicao] = useState(false)
  const [salarioTexto, setSalarioTexto] = useState('R$ 0,00')

  const [abaInferior, setAbaInferior] = useState<AbaInferior>('home')
  const [tipoVariavelTab, setTipoVariavelTab] = useState<TipoVariavelTab>('entrada')
  const [tipoFormularioLancamento, setTipoFormularioLancamento] = useState<TipoFormularioLancamento>('entrada')
  const [modalLancamentoAberto, setModalLancamentoAberto] = useState(false)
  const [modoModalLancamento, setModoModalLancamento] = useState<ModoModal>('novo')
  const [modalAcaoRapidaAberto, setModalAcaoRapidaAberto] = useState(false)
  const [acaoRapidaPadrao, setAcaoRapidaPadrao] = useState<QuickAddType>('entrada')
  const [modalCategoriasAberto, setModalCategoriasAberto] = useState(false)
  const [modalCategoriaNomeAberto, setModalCategoriaNomeAberto] = useState(false)
  const [modoCategoria, setModoCategoria] = useState<ModoCategoria>('nova')
  const [categoriaOriginal, setCategoriaOriginal] = useState('')
  const [categoriaDigitada, setCategoriaDigitada] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [itemEditandoId, setItemEditandoId] = useState<string | null>(null)
  const [diaEdicao, setDiaEdicao] = useState('1')
  const [novoNome, setNovoNome] = useState('')
  const [novoValor, setNovoValor] = useState('R$ 0,00')
  const [novaCategoria, setNovaCategoria] = useState(categoriasPadrao[0])

  const [noteModalType, setNoteModalType] = useState<NoteModalMode>('pix')
  const [modalAnotacaoAberto, setModalAnotacaoAberto] = useState(false)
  const [notaTitulo, setNotaTitulo] = useState('')
  const [notaConteudo, setNotaConteudo] = useState('')
  const [pixNome, setPixNome] = useState('')
  const [pixChave, setPixChave] = useState('')
  const [pixObservacao, setPixObservacao] = useState('')
  const [pixLinks, setPixLinks] = useState<string[]>([''])
  const [notaLinks, setNotaLinks] = useState<string[]>([''])
  const [linkPendenteConfirmacao, setLinkPendenteConfirmacao] = useState<string | null>(null)
  const [itemNotaEditandoId, setItemNotaEditandoId] = useState<string | null>(null)
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null)
  const [keyboardAberto, setKeyboardAberto] = useState(false)
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null)

  const [modalCartaoAberto, setModalCartaoAberto] = useState(false)
  const [modalNovoCartaoAberto, setModalNovoCartaoAberto] = useState(false)
  const [cardModalType, setCardModalType] = useState<CardModalMode>('card')
  const [novoCartaoNome, setNovoCartaoNome] = useState('')
  const [novaParcelaDescricao, setNovaParcelaDescricao] = useState('')
  const [novaParcelaValor, setNovaParcelaValor] = useState('R$ 0,00')
  const [novaParcelaAtual, setNovaParcelaAtual] = useState('1')
  const [novaParcelaTotal, setNovaParcelaTotal] = useState('1')
  const [parcelaEditandoId, setParcelaEditandoId] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [sortFixo, setSortFixo] = useState<SortMode>('recentes')
  const [sortEntradas, setSortEntradas] = useState<SortMode>('recentes')
  const [sortSaidas, setSortSaidas] = useState<SortMode>('recentes')
  const [sortNotas, setSortNotas] = useState<SortMode>('recentes')
  const [sortCartao, setSortCartao] = useState<SortMode>('recentes')
  const [modalConfiguracoesAberto, setModalConfiguracoesAberto] = useState(false)
  const [modalGerenciarCartoesAberto, setModalGerenciarCartoesAberto] = useState(false)
  const [gerenciarCartaoNome, setGerenciarCartaoNome] = useState('')
  const [gerenciarCartaoLimite, setGerenciarCartaoLimite] = useState('R$ 0,00')
  const [gerenciarCartaoFechamento, setGerenciarCartaoFechamento] = useState('')
  const [gerenciarCartaoVencimento, setGerenciarCartaoVencimento] = useState('')
  const [cartaoEditandoId, setCartaoEditandoId] = useState<string | null>(null)
  const [modalFiltroAberto, setModalFiltroAberto] = useState(false)
  const [alvoFiltro, setAlvoFiltro] = useState<SortTarget>('fixo')
  const [themeMode, setThemeMode] = useState<SettingsThemeMode>('manual')
  const [modalAnoComparacaoAberto, setModalAnoComparacaoAberto] = useState(false)
  const [modalMesComparacaoAberto, setModalMesComparacaoAberto] = useState(false)
  const [anoComparacao, setAnoComparacao] = useState(mesAtualIndex === 0 ? anoAtual - 1 : anoAtual)
  const [mesComparacao, setMesComparacao] = useState(meses[mesAtualIndex === 0 ? 11 : mesAtualIndex - 1])
  const [dadosRemotosCarregados, setDadosRemotosCarregados] = useState(false)
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState<{ type: DeleteTarget; id: string; label: string } | null>(null)
  const [processandoArquivo, setProcessandoArquivo] = useState<'csv' | 'excel' | 'pdf' | 'importar' | null>(null)
  const [modalPreviewExportacaoAberto, setModalPreviewExportacaoAberto] = useState(false)
  const [previewExportacaoTipo, setPreviewExportacaoTipo] = useState<'csv' | 'excel' | 'pdf'>('pdf')
  const [previewPdfUri, setPreviewPdfUri] = useState('')
  const [previewPdfGerando, setPreviewPdfGerando] = useState(false)
  const [buscaGlobal, setBuscaGlobal] = useState('')
  const [modalObjetivoAberto, setModalObjetivoAberto] = useState(false)
  const [objetivoTitulo, setObjetivoTitulo] = useState('')
  const [objetivoAlvo, setObjetivoAlvo] = useState('R$ 0,00')
  const [objetivoAtual, setObjetivoAtual] = useState('R$ 0,00')
  const [objetivoEditandoId, setObjetivoEditandoId] = useState<string | null>(null)
  const [modalCompraDesejoAberto, setModalCompraDesejoAberto] = useState(false)
  const [compraDesejoEditandoId, setCompraDesejoEditandoId] = useState<string | null>(null)
  const [compraDesejoNome, setCompraDesejoNome] = useState('')
  const [compraDesejoPreco, setCompraDesejoPreco] = useState('R$ 0,00')
  const [compraDesejoLoja, setCompraDesejoLoja] = useState('')
  const [compraDesejoData, setCompraDesejoData] = useState('')
  const [compraDesejoObservacao, setCompraDesejoObservacao] = useState('')
  const [compraDesejoComprado, setCompraDesejoComprado] = useState(false)
  const [investmentManualInput, setInvestmentManualInput] = useState('10')
  const [modalPreviewImportacaoAberto, setModalPreviewImportacaoAberto] = useState(false)
  const [arquivoImportacaoNome, setArquivoImportacaoNome] = useState('')
  const [previewImportacao, setPreviewImportacao] = useState<{ entradas: EntradaItem[]; saidas: SaidaItem[] }>({ entradas: [], saidas: [] })
  const [modalCalendarioAberto, setModalCalendarioAberto] = useState(false)
  const [checandoAtualizacoes, setChecandoAtualizacoes] = useState(false)
  const [avisoAtualizacao, setAvisoAtualizacao] = useState<{
    titulo: string
    mensagem: string
    acao?: 'reload' | 'apk'
    apkUrl?: string
    botaoPrincipal?: string
  } | null>(null)
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>('dia_edicao')
  const [calendarDia, setCalendarDia] = useState(1)
  const [calendarMes, setCalendarMes] = useState(mesAtualIndex + 1)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mainScrollRef = useRef<ScrollView | null>(null)
  const itemLayoutsRef = useRef<Record<string, { y: number; height: number }>>({})
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const highlightFadeAnim = useRef(new Animated.Value(0)).current
  const investmentManualFieldYRef = useRef(0)
  const salaryInputRef = useRef<TextInput | null>(null)
  const shoppingModalScrollRef = useRef<ScrollView | null>(null)
  const shoppingFieldLayoutsRef = useRef<Record<string, number>>({})
  const mainScrollYRef = useRef(0)
  const appStateRef = useRef(AppState.currentState)
  const temaStorageCarregadoRef = useRef(false)
  const theme = temaEscuro ? darkTheme : lightTheme
  const chaveAtual = `${anoSelecionado}-${mesSelecionado}`
  const diasDisponiveisNoCalendario = useMemo(
    () => getDiasNoMes(Number(anoSelecionado), Number(calendarMes || 1)),
    [anoSelecionado, calendarMes]
  )

  useEffect(() => {
    setCalendarDia((prev) => Math.min(prev, diasDisponiveisNoCalendario))
  }, [diasDisponiveisNoCalendario])

  const bancoDeDados = appData.bancoDeDados
  const globalData = appData.global
  const ocultarValores = Boolean(globalData.hideValues)

  const clampInvestmentPercentageValue = (valor: number) => {
    const numero = Number.isFinite(valor) ? valor : 0
    return Math.min(50, Math.max(0, Math.round(numero * 10) / 10))
  }

  const percentualInvestimento = clampInvestmentPercentageValue(Number(globalData.investmentPercentage ?? 10))
  const baseInvestimentoModo: InvestmentBaseMode = globalData.investmentBaseMode === 'salary_plus_entries' ? 'salary_plus_entries' : 'salary'
  const percentualInvestimentoExibicao = percentualInvestimento

  useEffect(() => {
    setInvestmentManualInput(
      Number.isInteger(percentualInvestimento)
        ? String(percentualInvestimento)
        : String(percentualInvestimento).replace('.', ',')
    )
  }, [percentualInvestimento])

  const formatarValorVisivel = (valor: number) => (ocultarValores ? '••••••' : formatarMoeda(valor))
  const formatarPercentualVisivel = (valor: number) => {
    if (ocultarValores) return '•••%'
    const valorSeguro = Number(valor || 0)
    const texto = Number.isInteger(valorSeguro)
      ? valorSeguro.toFixed(0)
      : valorSeguro.toFixed(1).replace('.', ',')
    return `${texto}%`
  }

  const blurFocusedInput = () => {
    try {
      const inputState = TextInput.State as any
      const focused = inputState?.currentlyFocusedInput?.()
      if (focused && inputState?.blurTextInput) {
        inputState.blurTextInput(focused)
      } else {
        Keyboard.dismiss()
      }
    } catch {
      Keyboard.dismiss()
    }
  }

  const registrarLayoutItem = (id: string, y: number, height = 0) => {
    itemLayoutsRef.current[id] = { y, height }
  }

  const scrollToInvestmentManualField = () => {
    setTimeout(() => {
      mainScrollRef.current?.scrollTo({
        y: Math.max(mainScrollYRef.current + 150, 0),
        animated: true,
      })
    }, 90)
  }

  const scrollToSalaryEditField = () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        mainScrollRef.current?.scrollTo({
          y: Math.max(mainScrollYRef.current + 120, 0),
          animated: true,
        })
      }, 80)
    })
  }

  const registrarShoppingFieldLayout = (field: string, y: number) => {
    shoppingFieldLayoutsRef.current[field] = y
  }

  const scrollShoppingModalToField = (field: string) => {
    const targetY = shoppingFieldLayoutsRef.current[field]
    if (typeof targetY !== 'number') return
    setTimeout(() => {
      shoppingModalScrollRef.current?.scrollTo({
        y: Math.max(targetY - 26, 0),
        animated: true,
      })
    }, 160)
  }

  const renderHighlightOverlay = (id: string) => {
    if (highlightedItemId !== id) return null

    return (
      <Animated.View
        pointerEvents="none"
        style={[
          styles.searchHighlightOverlay,
          {
            opacity: highlightFadeAnim,
            backgroundColor: 'transparent',
            borderColor: theme.primary,
          },
        ]}
      />
    )
  }

  const destacarEIrParaItem = (id: string) => {
    setHighlightedItemId(id)
    highlightFadeAnim.stopAnimation()
    highlightFadeAnim.setValue(1)

    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current)

    const centralizarItemNaTela = (tentativa = 0) => {
      const layout = itemLayoutsRef.current[id]

      if (!layout) {
        if (tentativa < 4) {
          setTimeout(() => centralizarItemNaTela(tentativa + 1), 80)
        }
        return
      }

      const alturaBarraInferior = 112 + Math.max(insets.bottom, 10)
      const alturaUtilTela = Math.max(screenHeight - alturaBarraInferior, 220)
      const centroVisivel = alturaUtilTela / 2
      const ajusteVisual = 550
      const alvoCentralizado = layout.y - centroVisivel + layout.height / 2 + ajusteVisual

      mainScrollRef.current?.scrollTo({
        y: Math.max(alvoCentralizado, 0),
        animated: true,
      })

      if (tentativa < 1) {
        setTimeout(() => centralizarItemNaTela(tentativa + 1), 90)
      }
    }

    setTimeout(() => centralizarItemNaTela(), 35)
    highlightTimeoutRef.current = setTimeout(() => {
      Animated.timing(highlightFadeAnim, {
        toValue: 0,
        duration: 430,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setHighlightedItemId((prev) => (prev === id ? null : prev))
          highlightFadeAnim.setValue(0)
        }
      })
    }, 1650)
  }

  const premiumValido = useMemo(() => {
    if (!premiumAtivo || !premiumExpiresAt) return false
    return new Date(premiumExpiresAt).getTime() > Date.now()
  }, [premiumAtivo, premiumExpiresAt])

  const premiumStatusTexto = useMemo(() => {
    if (premiumLoading) return 'Verificando seu acesso premium...'
    if (!premiumExpiresAt || !premiumValido) return 'Plano premium inativo. Toque para desbloquear todas as ações do app.'

    const data = new Date(premiumExpiresAt)
    return `Premium ativo até ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
  }, [premiumExpiresAt, premiumLoading, premiumValido])

  const abrirBloqueioPremium = (mensagem?: string, titulo = 'Modo somente leitura') => {
    if (premiumLoading || premiumValido) return
    setPremiumBloqueioTitulo(titulo)
    setPremiumBloqueioMensagem(
      mensagem ||
        'Você pode visualizar sua organização financeira, mas adicionar, editar, importar, exportar ou excluir informações exige o Brazllet Premium.'
    )
    setModalPremiumBloqueioAberto(true)
  }

  const bloquearAcaoSemPremium = (mensagem?: string) => {
    if (premiumLoading) return true
    if (premiumValido) return false
    abrirBloqueioPremium(mensagem)
    return true
  }

  const irParaTelaPremium = () => {
    setModalPremiumBloqueioAberto(false)
    setModalConfiguracoesAberto(false)
    router.push('/premium')
  }

  useEffect(() => {
    if (premiumLoading || premiumValido) return

    const algumBloqueioDeAcao =
      modalLancamentoAberto ||
      modalAcaoRapidaAberto ||
      modalCategoriasAberto ||
      modalCategoriaNomeAberto ||
      modalAnotacaoAberto ||
      modalCartaoAberto ||
      modalNovoCartaoAberto ||
      modalGerenciarCartoesAberto ||
      modalObjetivoAberto ||
      modalCompraDesejoAberto ||
      modalPreviewImportacaoAberto ||
      modalPreviewExportacaoAberto ||
      modalCalendarioAberto ||
      !!confirmacaoExclusao

    if (!algumBloqueioDeAcao) return

    if (modalLancamentoAberto) setModalLancamentoAberto(false)
    if (modalAcaoRapidaAberto) setModalAcaoRapidaAberto(false)
    if (modalCategoriasAberto) setModalCategoriasAberto(false)
    if (modalCategoriaNomeAberto) setModalCategoriaNomeAberto(false)
    if (modalAnotacaoAberto) setModalAnotacaoAberto(false)
    if (modalCartaoAberto) setModalCartaoAberto(false)
    if (modalNovoCartaoAberto) setModalNovoCartaoAberto(false)
    if (modalGerenciarCartoesAberto) setModalGerenciarCartoesAberto(false)
    if (modalObjetivoAberto) setModalObjetivoAberto(false)
    if (modalCompraDesejoAberto) setModalCompraDesejoAberto(false)
    if (modalPreviewImportacaoAberto) setModalPreviewImportacaoAberto(false)
    if (modalPreviewExportacaoAberto) setModalPreviewExportacaoAberto(false)
    if (modalCalendarioAberto) setModalCalendarioAberto(false)
    if (confirmacaoExclusao) setConfirmacaoExclusao(null)

    abrirBloqueioPremium('No modo somente leitura, você pode navegar por todas as abas e rolar a tela normalmente, mas qualquer ação que altere informações exige o Brazllet Premium.')
  }, [
    premiumLoading,
    premiumValido,
    modalLancamentoAberto,
    modalAcaoRapidaAberto,
    modalCategoriasAberto,
    modalCategoriaNomeAberto,
    modalAnotacaoAberto,
    modalCartaoAberto,
    modalNovoCartaoAberto,
    modalGerenciarCartoesAberto,
    modalObjetivoAberto,
    modalCompraDesejoAberto,
    modalPreviewImportacaoAberto,
    modalPreviewExportacaoAberto,
    modalCalendarioAberto,
    confirmacaoExclusao,
  ])

  const carregarStatusPremium = async (userId: string) => {
    try {
      setPremiumLoading(true)
      const { data } = await supabase
        .from('user_entitlements')
        .select('premium_active, premium_expires_at')
        .eq('user_id', userId)
        .maybeSingle<PremiumEntitlement>()

      const ativo = !!data?.premium_active && !!data?.premium_expires_at && new Date(data.premium_expires_at).getTime() > Date.now()
      setPremiumAtivo(ativo)
      setPremiumExpiresAt(data?.premium_expires_at ?? null)
    } catch {
      setPremiumAtivo(false)
      setPremiumExpiresAt(null)
    } finally {
      setPremiumLoading(false)
    }
  }


  useEffect(() => {
    if (premiumLoading || premiumValido) return

    abrirBloqueioPremium(
      'Seu premium está inativo. Você pode continuar visualizando seus dados na aba Home, mas qualquer alteração no app exige o Brazllet Premium.',
      'Premium esgotado'
    )
  }, [premiumLoading, premiumValido])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackground = appStateRef.current === 'background' || appStateRef.current === 'inactive'
      appStateRef.current = nextState

      if (nextState === 'active' && wasBackground && !premiumLoading && !premiumValido) {
        abrirBloqueioPremium(
          'Seu premium está inativo. Você pode continuar visualizando seus dados na aba Home, mas qualquer alteração no app exige o Brazllet Premium.',
          'Premium esgotado'
        )
      }
    })

    return () => subscription.remove()
  }, [premiumLoading, premiumValido])

  useEffect(() => {
    const carregarTudo = async () => {
      setCarregando(true)

      try {
        const temaSalvo = await AsyncStorage.getItem(THEME_KEY)
        const modoTemaSalvo = await AsyncStorage.getItem(THEME_MODE_KEY)

        if (modoTemaSalvo === 'system') {
          setThemeMode('system')
          setTemaEscuro(colorScheme === 'dark')
        } else {
          setThemeMode('manual')
          if (temaSalvo) setTemaEscuro(temaSalvo === 'dark')
        }

        temaStorageCarregadoRef.current = true

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          router.replace('/login')
          return
        }

        setEmail(session.user.email || '')
        await carregarStatusPremium(session.user.id)
        const nomeBaseSessao = String(
          session.user.user_metadata?.nome ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'Usuário'
        )
        setNome(nomeBaseSessao)
        setNomeEditavel(nomeBaseSessao)

        const { data, error } = await supabase
          .from('financial_data')
          .select('data')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (error) throw error

        if (data?.data) {
          const normalizado = normalizarAppData(data.data)
          setAppData(normalizado)
          if (normalizado.global.profileName) {
            setNome(normalizado.global.profileName)
            setNomeEditavel(normalizado.global.profileName)
          }
          setAvatarPerfil(normalizado.global.profileAvatar || '💼')
          setAvatarEditavel(normalizado.global.profileAvatar || '💼')
          setDadosRemotosCarregados(true)
        } else {
          router.replace('/premium')
          return
        }
      } catch {
        router.replace('/login')
      } finally {
        setCarregando(false)
      }
    }

    carregarTudo()
  }, [colorScheme])

  useEffect(() => {
    if (!temaStorageCarregadoRef.current) return

    if (themeMode === 'system') {
      setTemaEscuro(colorScheme === 'dark')
    }

    AsyncStorage.setItem(THEME_MODE_KEY, themeMode)
  }, [themeMode, colorScheme])

  useEffect(() => {
    if (!temaStorageCarregadoRef.current) return

    if (themeMode === 'manual') {
      AsyncStorage.setItem(THEME_KEY, temaEscuro ? 'dark' : 'light')
    }
  }, [temaEscuro, themeMode])

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(appData))
  }, [appData])

  useEffect(() => {
    const salarioAtual = bancoDeDados[chaveAtual]?.salario || 0
    setSalarioTexto(formatarNumeroBR(salarioAtual))
  }, [bancoDeDados, chaveAtual])

  const temDadosExistentes = useMemo(() => {
    if (!bancoDeDados || !Object.keys(bancoDeDados).length) return false

    return Object.values(bancoDeDados).some((mes: any) => {
      return (
        Number(mes?.salario || 0) > 0 ||
        (Array.isArray(mes?.entradas) && mes.entradas.length > 0) ||
        (Array.isArray(mes?.saidas) && mes.saidas.length > 0) ||
        (Array.isArray(mes?.fixo) &&
          mes.fixo.some((item: any) => item?.nome && String(item.nome).trim()))
      )
    })
  }, [bancoDeDados])

  useEffect(() => {
    if (!carregando && globalData.firstAccessCompleted === false && !temDadosExistentes) {
      router.replace('/premium')
    }
  }, [globalData.firstAccessCompleted, carregando, temDadosExistentes])

  useEffect(() => {
    const sincronizarBanco = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) return

      try {
        setSincronizando(true)
        await supabase.from('financial_data').upsert({
          user_id: session.user.id,
          data: appData,
          updated_at: new Date().toISOString(),
        })
      } finally {
        setSincronizando(false)
      }
    }

    if (!dadosRemotosCarregados || carregando) return

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      sincronizarBanco()
    }, 700)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [appData, carregando, dadosRemotosCarregados])

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidHide', () => {
      blurFocusedInput()
      if (salarioEmEdicao) salvarSalarioEdicao()
    })

    return () => subscription.remove()
  }, [salarioEmEdicao, salarioTexto])

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const showSub = Keyboard.addListener(showEvent as any, () => setKeyboardAberto(true))
    const hideSub = Keyboard.addListener(hideEvent as any, () => {
      setKeyboardAberto(false)
      blurFocusedInput()
    })

    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  useEffect(() => {
    if (!carregando) {
      setAnoSelecionado(anoAtual)
      setMesSelecionado(meses[mesAtualIndex])
      setAnoComparacao(mesAtualIndex === 0 ? anoAtual - 1 : anoAtual)
      setMesComparacao(meses[mesAtualIndex === 0 ? 11 : mesAtualIndex - 1])
    }
  }, [carregando, anoAtual, mesAtualIndex])


  useEffect(() => {
    const mesIndexAtual = meses.indexOf(mesSelecionado)
    if (mesIndexAtual <= 0) {
      setAnoComparacao(anoSelecionado - 1)
      setMesComparacao(meses[11])
    } else {
      setAnoComparacao(anoSelecionado)
      setMesComparacao(meses[mesIndexAtual - 1])
    }
  }, [anoSelecionado, mesSelecionado])


  useEffect(() => {
    setAvatarPerfil(globalData.profileAvatar || '💼')
    setAvatarEditavel(globalData.profileAvatar || '💼')
  }, [globalData.profileAvatar])

  useEffect(() => {
    setNomeEditavel(nome)
  }, [nome])

  useEffect(() => {
    if (!selectedCardId && globalData.cards.length) {
      setSelectedCardId(globalData.cards[0].id)
    }
    if (selectedCardId && !globalData.cards.some((item) => item.id === selectedCardId)) {
      setSelectedCardId(globalData.cards[0]?.id || null)
    }
  }, [globalData.cards, selectedCardId])


  useEffect(() => {
    setNomeEditavel(nome)
    setAvatarEditavel(avatarPerfil)
  }, [nome, avatarPerfil])

  const dadosAtual: DadosMes = useMemo(() => {
    return (
      bancoDeDados[chaveAtual] || {
        salario: 0,
        entradas: [],
        fixo: [],
        saidas: [],
        categoriasSaidas: [...categoriasPadrao],
      }
    )
  }, [bancoDeDados, chaveAtual])

  const salario = Number(dadosAtual.salario || 0)
  const entradas = dadosAtual.entradas || []
  const fixos = dadosAtual.fixo || []
  const saidas = dadosAtual.saidas || []
  const categoriasSaidas = (dadosAtual.categoriasSaidas || [...categoriasPadrao]).filter((categoria) => !categoriaEhImportado(categoria))
  const pixContacts = globalData.pixContacts || []
  const notes = globalData.notes || []
  const cards = globalData.cards || []


  const totalEntradas = useMemo(() => entradas.reduce((acc, item) => acc + Number(item.valor || 0), 0), [entradas])
  const totalFixoPago = useMemo(
    () => fixos.filter((item) => item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0),
    [fixos]
  )
  const totalFixoNaoPago = useMemo(
    () => fixos.filter((item) => !item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0),
    [fixos]
  )
  const totalSaidas = useMemo(() => saidas.reduce((acc, item) => acc + Number(item.valor || 0), 0), [saidas])
  const saldoAtual = salario + totalEntradas - totalFixoPago - totalSaidas
  const baseInvestimentoValor = baseInvestimentoModo === 'salary_plus_entries' ? salario + totalEntradas : salario
  const valorInvestimentoSugerido = (baseInvestimentoValor * percentualInvestimento) / 100

  const totaisCategorias = useMemo(() => {
    const mapa: Record<string, number> = {}
    saidas.forEach((item) => {
      const categoria = item.categoria || 'Sem categoria'
      mapa[categoria] = (mapa[categoria] || 0) + Number(item.valor || 0)
    })

    return Object.entries(mapa)
      .filter(([, valor]) => valor > 0)
      .sort((a, b) => b[1] - a[1])
  }, [saidas])

  const dadosPizza = useMemo(() => {
    const total = totaisCategorias.reduce((acc, [, valor]) => acc + valor, 0)
    return totaisCategorias.map(([categoria, valor], index) => ({
      categoria,
      valor,
      percentual: total > 0 ? (valor / total) * 100 : 0,
      cor: coresPizza[index % coresPizza.length],
    }))
  }, [totaisCategorias])

  const saidasFiltradas = filtroCategoria === 'Todas' ? saidas : saidas.filter((item) => item.categoria === filtroCategoria)
  const totalCategoriaSelecionada =
    filtroCategoria === 'Todas'
      ? totalSaidas
      : saidas.filter((item) => item.categoria === filtroCategoria).reduce((acc, item) => acc + item.valor, 0)

  const iniciais = nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() || '')
    .join('')

  const termoBuscaGlobal = buscaGlobal.trim().toLowerCase()
  const termoBuscaGlobalNumerico = moneyStringToNumber(termoBuscaGlobal)
  const termoBuscaGlobalDigits = termoBuscaGlobal.replace(/\D/g, '')
  const textoBuscaBate = (...partes: unknown[]) =>
    partes
      .map((parte) => String(parte ?? ''))
      .join(' ')
      .toLowerCase()
      .includes(termoBuscaGlobal)
  const valorBuscaBate = (valor: number) => {
    if (!termoBuscaGlobal) return false
    const valorSeguro = Number(valor || 0)
    const moeda = formatarMoeda(valorSeguro).toLowerCase()
    const numero = formatarNumeroBR(valorSeguro).toLowerCase()
    const centavos = String(Math.round(valorSeguro * 100))
    return (
      moeda.includes(termoBuscaGlobal) ||
      numero.includes(termoBuscaGlobal) ||
      (!!termoBuscaGlobalDigits && centavos.includes(termoBuscaGlobalDigits)) ||
      (termoBuscaGlobalNumerico > 0 && Math.abs(valorSeguro - termoBuscaGlobalNumerico) < 0.01)
    )
  }
  const resultadosBuscaGlobal = useMemo(() => {
    if (!termoBuscaGlobal) return [] as SearchResult[]
    const results: SearchResult[] = []
    entradas.forEach((item) => {
      if (textoBuscaBate(item.nome, formatarDiaMes(item.dia, chaveAtual), formatarMoeda(item.valor), 'entrada') || valorBuscaBate(item.valor)) {
        results.push({ tipo: 'Entrada', titulo: item.nome, subtitulo: `${formatarDiaMes(item.dia, chaveAtual)} · ${formatarValorVisivel(item.valor)}`, id: item.id })
      }
    })
    saidas.forEach((item) => {
      if (textoBuscaBate(item.nome, item.categoria, formatarDiaMes(item.dia, chaveAtual), formatarMoeda(item.valor), 'saída', 'saida') || valorBuscaBate(item.valor)) {
        results.push({ tipo: 'Saída', titulo: item.nome, subtitulo: `${formatarDiaMes(item.dia, chaveAtual)} · ${item.categoria} · ${formatarValorVisivel(item.valor)}`, id: item.id })
      }
    })
    fixos.forEach((item) => {
      if (textoBuscaBate(item.nome, item.pago ? 'pago' : 'não pago', 'nao pago', formatarDiaMes(item.dia, chaveAtual), formatarMoeda(item.valor), 'fixo') || valorBuscaBate(item.valor)) {
        results.push({ tipo: 'Fixo', titulo: item.nome, subtitulo: `${formatarDiaMes(item.dia, chaveAtual)} · ${item.pago ? 'Pago' : 'Não pago'} · ${formatarValorVisivel(item.valor)}`, id: item.id })
      }
    })
    cards.forEach((card) => {
      if (textoBuscaBate(card.nome, card.limite, formatarMoeda(Number(card.limite || 0)), 'cartão', 'cartao') || valorBuscaBate(Number(card.limite || 0))) {
        results.push({
          tipo: 'Cartão',
          titulo: card.nome,
          subtitulo: `${formatarDiaMesInput(card.fechamento, card.fechamentoMes, anoSelecionado)} · ${formatarDiaMesInput(card.vencimento, card.vencimentoMes, anoSelecionado)}`,
          id: card.id,
        })
      }
      card.parcelas
        .filter((p) => p.competencia === chaveAtual)
        .forEach((item) => {
          if (textoBuscaBate(item.descricao, card.nome, `${item.parcelaAtual}/${item.totalParcelas}`, formatarDiaMes(item.dia, item.competencia), formatarMoeda(item.valorParcela), 'parcela') || valorBuscaBate(item.valorParcela)) {
            results.push({
              tipo: 'Parcela',
              titulo: item.descricao,
              subtitulo: `${card.nome} · ${item.parcelaAtual}/${item.totalParcelas} · ${formatarDiaMes(item.dia, item.competencia)} · ${formatarValorVisivel(item.valorParcela)}`,
              id: item.id,
              relatedId: card.id,
            })
          }
        })
    })
    notes.forEach((item) => {
      if (textoBuscaBate(item.titulo, item.conteudo, ...(item.links || []), 'nota', 'anotação', 'anotacao')) {
        results.push({ tipo: 'Nota', titulo: item.titulo, subtitulo: item.conteudo || 'Sem conteúdo', id: item.id })
      }
    })
    pixContacts.forEach((item) => {
      if (textoBuscaBate(item.nome, item.chave, item.observacao, ...(item.links || []), 'pix')) {
        results.push({ tipo: 'Pix', titulo: item.nome, subtitulo: item.chave, id: item.id })
      }
    })
    return results.slice(0, 18)
  }, [termoBuscaGlobal, termoBuscaGlobalNumerico, termoBuscaGlobalDigits, entradas, saidas, fixos, cards, chaveAtual, notes, pixContacts, anoSelecionado, ocultarValores])

  const objetivos = globalData.goals || []
  const comprasDesejo = globalData.shoppingWishes || []
  const comprasDesejoVisiveis = comprasDesejo.filter(
    (item) => !item.comprado || item.compradoEmCompetencia === chaveAtual
  )

  const selectedCard = useMemo(() => cards.find((card) => card.id === selectedCardId) || null, [cards, selectedCardId])
  const parcelasMesAtualCartao = useMemo(
    () => (selectedCard ? (selectedCard.parcelas || []).filter((item) => item.competencia === chaveAtual) : []),
    [selectedCard, chaveAtual]
  )
  const totalCartaoSelecionado = useMemo(
    () => parcelasMesAtualCartao.reduce((acc, item) => acc + Number(item.valorParcela || 0), 0),
    [parcelasMesAtualCartao]
  )

  const limiteCartaoSelecionado = Number(selectedCard?.limite || 0)
  const limiteDisponivelCartao = Math.max(limiteCartaoSelecionado - totalCartaoSelecionado, 0)
  const percentualUsoCartao = limiteCartaoSelecionado > 0 ? Math.min((totalCartaoSelecionado / limiteCartaoSelecionado) * 100, 100) : 0
  const fechamentoCartaoSelecionado = Number(selectedCard?.fechamento || 0)
  const fechamentoMesCartaoSelecionado = Number(selectedCard?.fechamentoMes || meses.indexOf(mesSelecionado) + 1 || 0)
  const vencimentoCartaoSelecionado = Number(selectedCard?.vencimento || 0)
  const vencimentoMesCartaoSelecionado = Number(selectedCard?.vencimentoMes || (((fechamentoMesCartaoSelecionado || (meses.indexOf(mesSelecionado) + 1)) % 12) + 1) || 0)
  const hojeDia = new Date().getDate()
  const datasFaturaCartao = useMemo(
    () => getCardBillingDates(chaveAtual, fechamentoCartaoSelecionado, fechamentoMesCartaoSelecionado, vencimentoCartaoSelecionado, vencimentoMesCartaoSelecionado),
    [chaveAtual, fechamentoCartaoSelecionado, fechamentoMesCartaoSelecionado, vencimentoCartaoSelecionado, vencimentoMesCartaoSelecionado]
  )
  const parcelasFaturaAtual = useMemo(() => {
    if (!selectedCard) return [] as CardInstallment[]
    return selectedCard.parcelas.filter((item) => item.competencia === chaveAtual)
  }, [selectedCard, chaveAtual])
  const parcelasProximaFatura = useMemo(() => {
    if (!selectedCard) return [] as CardInstallment[]
    const prox = addMonthsToCompetencia(chaveAtual, 1)
    return selectedCard.parcelas.filter((item) => item.competencia === prox)
  }, [selectedCard, chaveAtual])
  const parcelasFuturasCartao = useMemo(() => {
    if (!selectedCard) return [] as CardInstallment[]
    return selectedCard.parcelas.filter((item) => item.competencia !== chaveAtual && item.competencia !== addMonthsToCompetencia(chaveAtual, 1))
  }, [selectedCard, chaveAtual])
  const totalFaturaAtual = parcelasFaturaAtual.reduce((acc, item) => acc + Number(item.valorParcela || 0), 0)
  const totalProximaFatura = parcelasProximaFatura.reduce((acc, item) => acc + Number(item.valorParcela || 0), 0)
  const totalFuturoCartao = parcelasFuturasCartao.reduce((acc, item) => acc + Number(item.valorParcela || 0), 0)
  const fixosOrdenados = useMemo(() => ordenarLista(fixos, sortFixo), [fixos, sortFixo])
  const entradasOrdenadas = useMemo(() => ordenarLista(entradas, sortEntradas), [entradas, sortEntradas])
  const saidasOrdenadas = useMemo(() => ordenarLista(saidasFiltradas, sortSaidas), [saidasFiltradas, sortSaidas])
  const pixOrdenados = useMemo(() => ordenarLista(pixContacts.map((item) => ({ ...item, nome: item.nome, valor: 0 })), sortNotas), [pixContacts, sortNotas])
  const notasOrdenadas = useMemo(() => ordenarLista(notes.map((item) => ({ ...item, nome: item.titulo, valor: 0 })), sortNotas), [notes, sortNotas])
  const parcelasOrdenadas = useMemo(() => {
    return ordenarLista(
      parcelasMesAtualCartao.map((item: any) => ({
        ...item,
        nome: item.descricao,
        valor: item.valorParcela,
      })),
      sortCartao
    )
  }, [parcelasMesAtualCartao, sortCartao])

  const chaveComparacao = `${anoComparacao}-${mesComparacao}`
  const dadosComparacao = bancoDeDados[chaveComparacao] || { salario: 0, entradas: [], fixo: [], saidas: [], categoriasSaidas: [...categoriasPadrao] }
  const entradasComparacao = (dadosComparacao.entradas || []).reduce((acc, item) => acc + Number(item.valor || 0), 0)
  const saidasComparacao = (dadosComparacao.saidas || []).reduce((acc, item) => acc + Number(item.valor || 0), 0)
  const saldoComparacao = Number(dadosComparacao.salario || 0) +
    entradasComparacao -
    (dadosComparacao.fixo || []).filter((item) => item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0) -
    saidasComparacao
  const totalAcumuladoComparacao = saldoAtual + saldoComparacao
  const comparativosResumo = [
    { label: 'Saldo', atual: saldoAtual, comparado: saldoComparacao, melhorQuandoMaior: true },
    { label: 'Entradas', atual: totalEntradas, comparado: entradasComparacao, melhorQuandoMaior: true },
    { label: 'Saídas', atual: totalSaidas, comparado: saidasComparacao, melhorQuandoMaior: false },
  ]

  const abrirFiltro = (alvo: SortTarget) => {
    setAlvoFiltro(alvo)
    setModalFiltroAberto(true)
  }

  const opcoesFiltro = [
    { value: 'recentes' as SortMode, label: 'Recentes' },
    { value: 'maior_valor' as SortMode, label: 'Maior valor' },
    { value: 'menor_valor' as SortMode, label: 'Menor valor' },
    { value: 'alfabetica' as SortMode, label: 'A-Z' },
  ]

  const filtroSelecionado =
    alvoFiltro === 'fixo'
      ? sortFixo
      : alvoFiltro === 'entradas'
      ? sortEntradas
      : alvoFiltro === 'saidas'
      ? sortSaidas
      : alvoFiltro === 'notas'
      ? sortNotas
      : sortCartao

  const aplicarFiltro = (modo: SortMode) => {
    if (alvoFiltro === 'fixo') setSortFixo(modo)
    else if (alvoFiltro === 'entradas') setSortEntradas(modo)
    else if (alvoFiltro === 'saidas') setSortSaidas(modo)
    else if (alvoFiltro === 'notas') setSortNotas(modo)
    else setSortCartao(modo)
    setModalFiltroAberto(false)
  }

  const abrirGerenciarCartoes = () => {
    setModalGerenciarCartoesAberto(true)
  }

  const abrirModalNovoCartao = () => {
    setCartaoEditandoId(null)
    setGerenciarCartaoNome('')
    setGerenciarCartaoLimite('R$ 0,00')
    setGerenciarCartaoFechamento('')
    setGerenciarCartaoVencimento('')
    setModalNovoCartaoAberto(true)
  }

  const iniciarEdicaoCartao = (card: CardItem) => {
    setCartaoEditandoId(card.id)
    setGerenciarCartaoNome(card.nome)
    setGerenciarCartaoLimite(formatarValorInput(card.limite || 0))
    setGerenciarCartaoFechamento(formatarDiaMesInput(card.fechamento, card.fechamentoMes || (meses.indexOf(mesSelecionado) + 1), anoSelecionado))
    setGerenciarCartaoVencimento(formatarDiaMesInput(card.vencimento, card.vencimentoMes || ((meses.indexOf(mesSelecionado) + 1) % 12) + 1, anoSelecionado))
    setModalNovoCartaoAberto(true)
  }

  const fecharModalNovoCartao = () => {
    setModalNovoCartaoAberto(false)
    setGerenciarCartaoNome('')
    setGerenciarCartaoLimite('R$ 0,00')
    setGerenciarCartaoFechamento('')
    setGerenciarCartaoVencimento('')
    setCartaoEditandoId(null)
  }

  const salvarCartaoGerenciado = () => {
    if (!gerenciarCartaoNome.trim()) return

    const limite = moneyStringToNumber(gerenciarCartaoLimite)
    const fechamentoData = parseDiaMesInput(gerenciarCartaoFechamento, meses.indexOf(mesSelecionado) + 1, anoSelecionado)
    const vencimentoData = parseDiaMesInput(gerenciarCartaoVencimento, ((meses.indexOf(mesSelecionado) + 1) % 12) + 1, anoSelecionado)
    const fechamento = fechamentoData.dia
    const fechamentoMes = fechamentoData.mes
    const vencimento = vencimentoData.dia
    const vencimentoMes = vencimentoData.mes

    if (cartaoEditandoId) {
      setAppData((prev) => ({
        ...prev,
        global: {
          ...prev.global,
          cards: prev.global.cards.map((card) =>
            card.id === cartaoEditandoId ? { ...card, nome: gerenciarCartaoNome.trim(), limite, fechamento, fechamentoMes, vencimento, vencimentoMes } : card
          ),
        },
      }))
    } else {
      const novoId = `card-${Date.now()}`
      setAppData((prev) => ({
        ...prev,
        global: {
          ...prev.global,
          cards: [...prev.global.cards, { id: novoId, nome: gerenciarCartaoNome.trim(), limite, fechamento, fechamentoMes, vencimento, vencimentoMes, parcelas: [] }],
        },
      }))
      setSelectedCardId(novoId)
    }

    fecharModalNovoCartao()
  }

  const salvarPerfil = () => {
    const nomeFinal = nomeEditavel.trim() || nome
    const avatarFinal = avatarEhImagem(avatarEditavel) ? avatarEditavel : (avatarEhImagem(avatarPerfil) ? avatarPerfil : '')
    setNome(nomeFinal)
    setAvatarPerfil(avatarFinal)
    setAvatarEditavel(avatarFinal)
    setAppData((prev) => ({ ...prev, global: { ...prev.global, profileAvatar: avatarFinal, profileName: nomeFinal } }))
  }

  const salvarImagemPerfilLocal = async (uri: string, extensaoBase = 'jpg') => {
    const extensao = extensaoBase.replace(/[^a-zA-Z0-9]/g, '') || 'jpg'
    const destino = `${FileSystem.documentDirectory || ''}brazllet-profile-${Date.now()}.${extensao}`
    if (!FileSystem.documentDirectory) return uri
    await FileSystem.copyAsync({ from: uri, to: destino })
    return destino
  }

  const escolherImagemPerfil = async () => {
    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!permissao.granted) {
        abrirBloqueioPremium('Permita o acesso à galeria para escolher sua foto de perfil.', 'Imagem de perfil')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      })

      if (result.canceled) return
      const asset = result.assets?.[0]
      const uri = asset?.uri
      if (!uri) return
      const extensao = (uri.split('.').pop() || 'jpg').split('?')[0]
      const avatarUri = await salvarImagemPerfilLocal(uri, extensao)
      setAvatarEditavel(avatarUri)
    } catch {
      abrirBloqueioPremium('Não foi possível abrir a galeria agora. Tente novamente em alguns instantes.', 'Imagem de perfil')
    }
  }

  const avatarEhImagem = (valor?: string) => Boolean(valor && (valor.startsWith('file:') || valor.startsWith('content:') || valor.startsWith('http')))

  const abrirCalendario = (target: CalendarTarget, rawValue?: string, fallbackMonth?: number) => {
    setCalendarTarget(target)

    const hoje = new Date()
    const diaAtual = hoje.getDate()

    if (target === 'dia_edicao') {
      const mesBase = Math.min(12, Math.max(1, Number(fallbackMonth || meses.indexOf(mesSelecionado) + 1 || 1)))
      const dia = Math.min(getDiasNoMes(Number(anoSelecionado), mesBase), diaAtual)
      setCalendarDia(dia)
      setCalendarMes(mesBase)
    } else {
      const parsed = parseDiaMesInput(rawValue || '', fallbackMonth || (meses.indexOf(mesSelecionado) + 1), anoSelecionado)
      const mesBase = parsed.mes || Math.min(12, Math.max(1, Number(fallbackMonth || hoje.getMonth() + 1 || 1)))
      const dia = Math.min(getDiasNoMes(Number(anoSelecionado), mesBase), diaAtual)
      setCalendarDia(dia)
      setCalendarMes(mesBase)
    }

    setModalCalendarioAberto(true)
  }

  const confirmarCalendario = () => {
    const dataFormatada = formatarDiaMesInput(calendarDia, calendarMes, anoSelecionado)

    if (calendarTarget === 'dia_edicao') {
      setDiaEdicao(String(calendarDia))
    } else if (calendarTarget === 'cartao_fechamento') {
      setGerenciarCartaoFechamento(dataFormatada)
    } else if (calendarTarget === 'cartao_vencimento') {
      setGerenciarCartaoVencimento(dataFormatada)
    } else if (calendarTarget === 'wish_data') {
      setCompraDesejoData(dataFormatada)
    }

    setModalCalendarioAberto(false)
  }

  const abrirLinkComConfirmacao = (url: string) => {
    setLinkPendenteConfirmacao(url)
  }

  const confirmarAberturaLink = async () => {
    if (!linkPendenteConfirmacao) return
    try {
      const supported = await Linking.canOpenURL(linkPendenteConfirmacao)
      if (!supported) {
        Alert.alert('Link inválido', 'Não foi possível abrir este link.')
        return
      }
      await Linking.openURL(linkPendenteConfirmacao)
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o link agora.')
    } finally {
      setLinkPendenteConfirmacao(null)
    }
  }

  const checarAtualizacoesManual = async () => {
    if (checandoAtualizacoes) return

    setChecandoAtualizacoes(true)

    try {
      try {
        if (!__DEV__) {
          const update = await Updates.checkForUpdateAsync()

          if (update.isAvailable) {
            await Updates.fetchUpdateAsync()
            setAvisoAtualizacao({
              titulo: 'Atualização pronta',
              mensagem: 'Uma atualização rápida do Brazllet foi baixada. Reinicie o app para aplicar agora.',
              acao: 'reload',
              botaoPrincipal: 'Reiniciar agora',
            })
            return
          }
        }
      } catch {
        // Em development build, Expo Go ou ambiente sem canal compatível, seguimos checando o APK novo pelo Supabase.
      }

      const versaoInstalada = obterVersaoInstalada()
      const { data, error } = await supabase
        .from('app_versions')
        .select('latest_version, apk_url, message, force_update')
        .eq('platform', BRAZLLET_PLATFORM)
        .maybeSingle<{
          latest_version: string | null
          apk_url: string | null
          message: string | null
          force_update: boolean | null
        }>()

      if (error) throw error

      const versaoNova = String(data?.latest_version || '')
      const apkUrl = String(data?.apk_url || '')
      const temApkNovo = !!versaoNova && !!apkUrl && compararVersoesApp(versaoInstalada, versaoNova) > 0

      if (temApkNovo) {
        setAvisoAtualizacao({
          titulo: `Nova versão ${versaoNova}`,
          mensagem: data?.message || 'Existe uma nova versão do Brazllet disponível para download.',
          acao: 'apk',
          apkUrl,
          botaoPrincipal: 'Atualizar agora',
        })
        return
      }

      setAvisoAtualizacao({
        titulo: 'Brazllet atualizado',
        mensagem: 'Você já está usando a versão mais recente disponível para este aparelho.',
      })
    } catch {
      setAvisoAtualizacao({
        titulo: 'Atualizações',
        mensagem: 'Não foi possível checar atualizações agora. Tente novamente em instantes.',
      })
    } finally {
      setChecandoAtualizacoes(false)
    }
  }

  const executarAcaoAvisoAtualizacao = async () => {
    const aviso = avisoAtualizacao
    if (!aviso) return

    if (aviso.acao === 'reload') {
      setAvisoAtualizacao(null)
      await Updates.reloadAsync()
      return
    }

    if (aviso.acao === 'apk' && aviso.apkUrl) {
      setAvisoAtualizacao(null)
      abrirLinkComConfirmacao(aviso.apkUrl)
      return
    }

    setAvisoAtualizacao(null)
  }

  const renderTextoSecundario = (texto: string | undefined, fallback: string, color: string) => {
    const conteudo = texto?.trim() || fallback
    return <Text style={[styles.rowItemMeta, { color }]}>{conteudo}</Text>
  }

  const renderListaLinks = (links?: string[]) => {
    const linksValidos = sanitizarListaLinks(links)
    if (!linksValidos.length) return null

    return (
      <View style={styles.linkListWrap}>
        {linksValidos.map((link) => (
          <Pressable key={link} onPress={() => abrirLinkComConfirmacao(link)} style={[styles.linkChip, { borderColor: theme.borderStrong }]}>
            <Text numberOfLines={1} style={[styles.linkChipText, { color: theme.primary }]}>{link}</Text>
          </Pressable>
        ))}
      </View>
    )
  }

  const atualizarCampoLink = (
    setter: (value: string[] | ((prev: string[]) => string[])) => void,
    index: number,
    value: string
  ) => {
    setter((prev) => prev.map((item, idx) => (idx === index ? value : item)))
  }

  const adicionarCampoLink = (setter: (value: string[] | ((prev: string[]) => string[])) => void) => {
    setter((prev) => [...prev, ''])
  }

  const removerCampoLink = (setter: (value: string[] | ((prev: string[]) => string[])) => void, index: number) => {
    setter((prev) => {
      if (prev.length <= 1) return ['']
      return prev.filter((_, idx) => idx !== index)
    })
  }

  const irParaResultadoBuscaGlobal = (resultado: SearchResult) => {
    setBuscaGlobal('')

    const navegarComFoco = (callback: () => void, id: string) => {
      callback()
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => destacarEIrParaItem(id), 170)
      })
    }

    if (resultado.tipo === 'Entrada') {
      navegarComFoco(() => {
        setAbaInferior('variavel')
        setTipoVariavelTab('entrada')
      }, resultado.id)
      return
    }

    if (resultado.tipo === 'Saída') {
      navegarComFoco(() => {
        setAbaInferior('variavel')
        setTipoVariavelTab('saida')
      }, resultado.id)
      return
    }

    if (resultado.tipo === 'Fixo') {
      navegarComFoco(() => setAbaInferior('fixo'), resultado.id)
      return
    }

    if (resultado.tipo === 'Cartão') {
      navegarComFoco(() => {
        setAbaInferior('cartao')
        setSelectedCardId(resultado.id)
      }, resultado.id)
      return
    }

    if (resultado.tipo === 'Parcela') {
      navegarComFoco(() => {
        setAbaInferior('cartao')
        if (resultado.relatedId) setSelectedCardId(resultado.relatedId)
      }, resultado.id)
      return
    }

    if (resultado.tipo === 'Nota') {
      navegarComFoco(() => setAbaInferior('home'), resultado.id)
      return
    }

    if (resultado.tipo === 'Pix') {
      navegarComFoco(() => setAbaInferior('home'), resultado.id)
    }
  }


  const abrirNovoObjetivo = (goal?: GoalItem) => {
    setObjetivoEditandoId(goal?.id || null)
    setObjetivoTitulo(goal?.titulo || '')
    setObjetivoAlvo(formatarValorInput(goal?.alvo || 0))
    setObjetivoAtual(formatarValorInput(goal?.atual || 0))
    setModalObjetivoAberto(true)
  }

  const salvarObjetivo = () => {
    if (!objetivoTitulo.trim()) return
    const alvo = moneyStringToNumber(objetivoAlvo)
    const atual = moneyStringToNumber(objetivoAtual)
    setAppData((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        goals: objetivoEditandoId
          ? prev.global.goals.map((goal) => goal.id === objetivoEditandoId ? { ...goal, titulo: objetivoTitulo.trim(), alvo, atual } : goal)
          : [...prev.global.goals, { id: `goal-${Date.now()}`, titulo: objetivoTitulo.trim(), alvo, atual }],
      },
    }))
    setModalObjetivoAberto(false)
    setObjetivoEditandoId(null)
    setObjetivoTitulo('')
    setObjetivoAlvo('R$ 0,00')
    setObjetivoAtual('R$ 0,00')
  }

  const excluirObjetivo = (id: string) => {
    setAppData((prev) => ({ ...prev, global: { ...prev.global, goals: prev.global.goals.filter((goal) => goal.id !== id) } }))
  }


  const limparModalCompraDesejo = () => {
    setModalCompraDesejoAberto(false)
    setCompraDesejoEditandoId(null)
    setCompraDesejoNome('')
    setCompraDesejoPreco('R$ 0,00')
    setCompraDesejoLoja('')
    setCompraDesejoData('')
    setCompraDesejoObservacao('')
    setCompraDesejoComprado(false)
  }

  const abrirNovaCompraDesejo = (item?: ShoppingWishItem) => {
    setCompraDesejoEditandoId(item?.id || null)
    setCompraDesejoNome(item?.nome || '')
    setCompraDesejoPreco(formatarValorInput(item?.precoAtual || 0))
    setCompraDesejoLoja(item?.loja || '')
    setCompraDesejoData(item?.dataVista || '')
    setCompraDesejoObservacao(item?.observacao || '')
    setCompraDesejoComprado(Boolean(item?.comprado))
    setModalCompraDesejoAberto(true)
  }

  const alternarCompraDesejoComprado = (id: string, comprado: boolean) => {
    setAppData((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        shoppingWishes: prev.global.shoppingWishes.map((item) =>
          item.id === id
            ? {
                ...item,
                comprado,
                compradoEmCompetencia: comprado ? chaveAtual : '',
              }
            : item
        ),
      },
    }))
  }

  const salvarCompraDesejo = () => {
    if (!compraDesejoNome.trim()) return
    const precoAtual = moneyStringToNumber(compraDesejoPreco)
    const itemAnterior = compraDesejoEditandoId
      ? comprasDesejo.find((item) => item.id === compraDesejoEditandoId)
      : null
    const payload: ShoppingWishItem = {
      id: compraDesejoEditandoId || `wish-${Date.now()}`,
      nome: compraDesejoNome.trim(),
      precoAtual,
      loja: compraDesejoLoja.trim(),
      dataVista: compraDesejoData.trim(),
      observacao: compraDesejoObservacao.trim(),
      comprado: compraDesejoComprado,
      criadaEmCompetencia: itemAnterior?.criadaEmCompetencia || chaveAtual,
      compradoEmCompetencia: compraDesejoComprado ? itemAnterior?.compradoEmCompetencia || chaveAtual : '',
    }

    setAppData((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        shoppingWishes: compraDesejoEditandoId
          ? prev.global.shoppingWishes.map((item) => (item.id === compraDesejoEditandoId ? payload : item))
          : [...prev.global.shoppingWishes, payload],
      },
    }))

    limparModalCompraDesejo()
  }

  const excluirCompraDesejo = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        shoppingWishes: prev.global.shoppingWishes.filter((item) => item.id !== id),
      },
    }))
  }

  const calcularCompetenciaInicialParcela = (fechamento?: number) => {
    const hoje = new Date()
    return calcularCompetenciaInicialPorFechamento(chaveAtual, hoje.getDate(), fechamento)
  }

  const handleSair = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const alternarTema = () => {
    setThemeMode('manual')
    AsyncStorage.setItem(THEME_MODE_KEY, 'manual')
    setTemaEscuro((prev) => {
      const proximoTema = !prev
      AsyncStorage.setItem(THEME_KEY, proximoTema ? 'dark' : 'light')
      return proximoTema
    })
  }

  const alternarModoTemaSistema = () => {
    setThemeMode((prev) => {
      const proximoModo: SettingsThemeMode = prev === 'system' ? 'manual' : 'system'
      AsyncStorage.setItem(THEME_MODE_KEY, proximoModo)

      if (proximoModo === 'system') {
        setTemaEscuro(colorScheme === 'dark')
      } else {
        AsyncStorage.setItem(THEME_KEY, temaEscuro ? 'dark' : 'light')
      }

      return proximoModo
    })
  }


  const parcelasExportacaoMes = useMemo(
    () =>
      cards.flatMap((card) =>
        (card.parcelas || [])
          .filter((item) => item.competencia === chaveAtual)
          .map((item) => ({
            cartao: card.nome,
            descricao: item.descricao,
            valorParcela: Number(item.valorParcela || 0),
            parcelaAtual: Number(item.parcelaAtual || 0),
            totalParcelas: Number(item.totalParcelas || 0),
          }))
      ),
    [cards, chaveAtual]
  )

  const totalParcelasMes = useMemo(
    () => parcelasExportacaoMes.reduce((acc, item) => acc + item.valorParcela, 0),
    [parcelasExportacaoMes]
  )

  const resumoExportacaoMes = useMemo(
    () => ({
      competencia: `${mesSelecionado}/${anoSelecionado}`,
      salario,
      entradas: totalEntradas,
      fixosPagos: totalFixoPago,
      fixosNaoPagos: totalFixoNaoPago,
      saidas: totalSaidas,
      cartoes: totalParcelasMes,
      saldoAtual,
    }),
    [anoSelecionado, mesSelecionado, salario, totalEntradas, totalFixoPago, totalFixoNaoPago, totalSaidas, totalParcelasMes, saldoAtual]
  )

  const categoriasExportacaoMes = useMemo(
    () =>
      totaisCategorias.map(([categoria, valor]) => ({
        categoria,
        valor,
        percentual: totalSaidas > 0 ? (valor / totalSaidas) * 100 : 0,
      })),
    [totaisCategorias, totalSaidas]
  )

  const normalizarNomeMesArquivo = (mes: string) =>
    String(mes || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

  const exportFileBaseName = `BRAZLLET_${normalizarNomeMesArquivo(mesSelecionado)}_${anoSelecionado}`

  const buildExportRows = (separator = ';') => {
    const lines: string[] = []
    const row = (values: Array<string | number>) =>
      values
        .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
        .join(separator)

    lines.push(row(['BRAZLLET | RELATÓRIO FINANCEIRO']))
    lines.push(row(['COMPETÊNCIA', resumoExportacaoMes.competencia]))
    lines.push(row(['ESTILO', 'Brazllet Premium']))
    lines.push('')

    lines.push(row(['RESUMO']))
    lines.push(row(['Campo', 'Valor']))
    ;[
      ['Salário', formatarMoeda(resumoExportacaoMes.salario)],
      ['Entradas', formatarMoeda(resumoExportacaoMes.entradas)],
      ['Fixos pagos', formatarMoeda(resumoExportacaoMes.fixosPagos)],
      ['Fixos não pagos', formatarMoeda(resumoExportacaoMes.fixosNaoPagos)],
      ['Saídas', formatarMoeda(resumoExportacaoMes.saidas)],
      ['Cartões', formatarMoeda(resumoExportacaoMes.cartoes)],
      ['Saldo atual', formatarMoeda(resumoExportacaoMes.saldoAtual)],
    ].forEach((item) => lines.push(row(item)))
    lines.push('')

    lines.push(row(['ENTRADAS']))
    lines.push(row(['Nome', 'Valor']))
    if (entradas.length) entradas.forEach((item) => lines.push(row([item.nome, formatarMoeda(item.valor)])))
    else lines.push(row(['Sem entradas', '-']))
    lines.push('')

    lines.push(row(['FIXOS']))
    lines.push(row(['Nome', 'Valor', 'Status']))
    if (fixos.length) fixos.forEach((item) => lines.push(row([item.nome, formatarMoeda(item.valor), item.pago ? 'Pago' : 'Não pago'])))
    else lines.push(row(['Sem fixos', '-', '-']))
    lines.push('')

    lines.push(row(['SAÍDAS']))
    lines.push(row(['Nome', 'Categoria', 'Valor']))
    if (saidas.length) saidas.forEach((item) => lines.push(row([item.nome, item.categoria, formatarMoeda(item.valor)])))
    else lines.push(row(['Sem saídas', '-', '-']))
    lines.push('')

    lines.push(row(['RANKING DE CATEGORIAS']))
    lines.push(row(['Categoria', 'Valor', 'Percentual']))
    if (categoriasExportacaoMes.length) categoriasExportacaoMes.forEach((item) => lines.push(row([item.categoria, formatarMoeda(item.valor), `${item.percentual.toFixed(1).replace('.', ',')}%`])))
    else lines.push(row(['Sem categorias', '-', '-']))
    lines.push('')

    lines.push(row(['CARTÕES']))
    lines.push(row(['Cartão', 'Descrição', 'Parcela', 'Valor']))
    if (parcelasExportacaoMes.length) parcelasExportacaoMes.forEach((item) => lines.push(row([item.cartao, item.descricao, `${item.parcelaAtual}/${item.totalParcelas}`, formatarMoeda(item.valorParcela)])))
    else lines.push(row(['Sem parcelas no mês', '-', '-', '-']))

    return lines.join('')
  }

  const buildExportWorkbook = () => {
    const wb = XLSX.utils.book_new()

    const resumoSheet = XLSX.utils.aoa_to_sheet([
      ['BRAZLLET'],
      ['Relatório financeiro premium'],
      ['Competência', resumoExportacaoMes.competencia],
      ['Estilo', 'Brazllet'],
      [],
      ['Resumo do mês'],
      ['Campo', 'Valor'],
      ['Salário', resumoExportacaoMes.salario],
      ['Entradas', resumoExportacaoMes.entradas],
      ['Fixos pagos', resumoExportacaoMes.fixosPagos],
      ['Fixos não pagos', resumoExportacaoMes.fixosNaoPagos],
      ['Saídas', resumoExportacaoMes.saidas],
      ['Cartões', resumoExportacaoMes.cartoes],
      ['Saldo atual', resumoExportacaoMes.saldoAtual],
    ])
    resumoSheet['!cols'] = [{ wch: 26 }, { wch: 20 }]
    resumoSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }]
    XLSX.utils.book_append_sheet(wb, resumoSheet, 'Resumo')

    const entradasSheet = XLSX.utils.json_to_sheet(
      entradas.length
        ? entradas.map((item) => ({ Nome: item.nome, Valor: item.valor }))
        : [{ Nome: 'Sem entradas', Valor: '' }]
    )
    entradasSheet['!cols'] = [{ wch: 34 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, entradasSheet, 'Entradas')

    const fixosSheet = XLSX.utils.json_to_sheet(
      fixos.length
        ? fixos.map((item) => ({ Nome: item.nome, Valor: item.valor, Status: item.pago ? 'Pago' : 'Não pago' }))
        : [{ Nome: 'Sem fixos', Valor: '', Status: '' }]
    )
    fixosSheet['!cols'] = [{ wch: 34 }, { wch: 16 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, fixosSheet, 'Fixos')

    const saidasSheet = XLSX.utils.json_to_sheet(
      saidas.length
        ? saidas.map((item) => ({ Nome: item.nome, Categoria: item.categoria, Valor: item.valor }))
        : [{ Nome: 'Sem saídas', Categoria: '', Valor: '' }]
    )
    saidasSheet['!cols'] = [{ wch: 34 }, { wch: 18 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, saidasSheet, 'Saídas')

    const categoriasSheet = XLSX.utils.json_to_sheet(
      categoriasExportacaoMes.length
        ? categoriasExportacaoMes.map((item) => ({ Categoria: item.categoria, Valor: item.valor, Percentual: `${item.percentual.toFixed(1).replace('.', ',')}%` }))
        : [{ Categoria: 'Sem categorias', Valor: '', Percentual: '' }]
    )
    categoriasSheet['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, categoriasSheet, 'Categorias')

    const cartoesSheet = XLSX.utils.json_to_sheet(
      parcelasExportacaoMes.length
        ? parcelasExportacaoMes.map((item) => ({ Cartão: item.cartao, Descrição: item.descricao, Parcela: `${item.parcelaAtual}/${item.totalParcelas}`, Valor: item.valorParcela }))
        : [{ Cartão: 'Sem parcelas no mês', Descrição: '', Parcela: '', Valor: '' }]
    )
    cartoesSheet['!cols'] = [{ wch: 20 }, { wch: 34 }, { wch: 14 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, cartoesSheet, 'Cartões')

    return wb
  }

  const exportarCsv = async () => {
    try {
      setProcessandoArquivo('csv')
      const csv = buildExportRows(';')
      const fileUri = `${FileSystem.cacheDirectory}${exportFileBaseName}.csv`
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: 'utf8' })
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar CSV',
        UTI: 'public.comma-separated-values-text',
      })
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar o arquivo CSV.')
    } finally {
      setProcessandoArquivo(null)
    }
  }

  const exportarExcel = async () => {
    try {
      setProcessandoArquivo('excel')
      const wb = buildExportWorkbook()
      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' })
      const fileUri = `${FileSystem.cacheDirectory}${exportFileBaseName}.xlsx`
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' })
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Exportar Excel (.xlsx)',
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
      })
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar o arquivo Excel (.xlsx).')
    } finally {
      setProcessandoArquivo(null)
    }
  }

  const escapeHtml = (value: string) =>
    String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

  const renderPdfRows = (rows: string[][], emptyCols: number) => {
    if (!rows.length) {
      return `<tr><td colspan="${emptyCols}" class="empty">Sem dados no mês selecionado.</td></tr>`
    }
    return rows
      .map(
        (cols) =>
          `<tr>${cols.map((col) => `<td>${escapeHtml(col)}</td>`).join('')}</tr>`
      )
      .join('')
  }

  const buildPdfHtml = () => {
    return `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              * { box-sizing: border-box; }
              @page { margin: 26mm 16mm 24mm; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                padding: 0;
                color: #17361f;
                background: #f8fafc;
              }
              .page {
                background: #f7f3e8;
                border: 1px solid #d8c9a9;
                border-radius: 24px;
                overflow: hidden;
              }
              .hero {
                padding: 28px 30px 22px;
                background: linear-gradient(135deg, #113120 0%, #1f5a34 62%, #b7923b 100%);
                color: #ffffff;
              }
              .eyebrow {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 999px;
                background: rgba(255,255,255,0.12);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.08em;
                text-transform: uppercase;
              }
              h1 {
                font-size: 28px;
                line-height: 1.15;
                margin: 14px 0 8px;
              }
              .hero-sub {
                color: #cbd5e1;
                font-size: 13px;
                margin: 0;
              }
              .section-wrap {
                padding: 22px 24px 26px;
              }
              .summary-grid {
                width: 100%;
                border-collapse: separate;
                border-spacing: 12px 12px;
                margin: 0 -12px 6px;
              }
              .summary-card {
                width: 50%;
                background: #fffdf8;
                border: 1px solid #dfd0b2;
                border-radius: 18px;
                padding: 14px 16px;
                vertical-align: top;
              }
              .summary-label {
                font-size: 11px;
                color: #6f7c67;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                font-weight: 700;
                margin-bottom: 8px;
              }
              .summary-value {
                font-size: 22px;
                font-weight: 800;
                color: #17361f;
              }
              .summary-value.positive { color: #2c7a4a; }
              .summary-value.negative { color: #c24f4f; }
              .section-title {
                font-size: 16px;
                font-weight: 800;
                color: #17361f;
                margin: 22px 0 10px;
              }
              .section-sub {
                font-size: 12px;
                color: #6f7c67;
                margin: -2px 0 10px;
              }
              table.section {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                margin-top: 8px;
                border: 1px solid #e2e8f0;
                border-radius: 16px;
                overflow: hidden;
              }
              table.section th,
              table.section td {
                padding: 10px 12px;
                text-align: left;
                vertical-align: top;
                font-size: 12px;
              }
              table.section thead th {
                background: #f3ead6;
                color: #17361f;
                text-transform: uppercase;
                letter-spacing: 0.06em;
                font-size: 10px;
                font-weight: 800;
                border-bottom: 1px solid #ddcfb1;
              }
              table.section tbody tr:nth-child(even) td {
                background: #fffaf0;
              }
              table.section tbody tr:not(:last-child) td {
                border-bottom: 1px solid #eee1c7;
              }
              .empty {
                text-align: center;
                color: #6f7c67;
                padding: 16px 12px;
              }
              .badge-row {
                margin-top: 14px;
              }
              .badge {
                display: inline-block;
                padding: 6px 12px;
                border-radius: 999px;
                background: rgba(246, 232, 176, 0.18);
                color: #f6e8b0;
                font-size: 11px;
                font-weight: 700;
                margin-right: 8px;
              }
              .footer-note {
                margin-top: 18px;
                font-size: 11px;
                color: #6f7c67;
                text-align: center;
              }
            </style>
          </head>
          <body>
            <div class="page">
              <div class="hero">
                <span class="eyebrow">Brazllet · relatório financeiro</span>
                <h1>Brazllet financeiro</h1>
                <p class="hero-sub">Competência exportada: ${escapeHtml(resumoExportacaoMes.competencia)}</p>
                <div class="badge-row">
                  <span class="badge">Entradas, fixos, saídas e cartões</span>
                  <span class="badge">Identidade Brazllet</span>
                </div>
              </div>

              <div class="section-wrap">
                <table class="summary-grid">
                  <tr>
                    <td class="summary-card">
                      <div class="summary-label">Salário</div>
                      <div class="summary-value">${escapeHtml(formatarMoeda(resumoExportacaoMes.salario))}</div>
                    </td>
                    <td class="summary-card">
                      <div class="summary-label">Saldo atual</div>
                      <div class="summary-value ${resumoExportacaoMes.saldoAtual >= 0 ? 'positive' : 'negative'}">${escapeHtml(formatarMoeda(resumoExportacaoMes.saldoAtual))}</div>
                    </td>
                  </tr>
                  <tr>
                    <td class="summary-card">
                      <div class="summary-label">Entradas</div>
                      <div class="summary-value positive">${escapeHtml(formatarMoeda(resumoExportacaoMes.entradas))}</div>
                    </td>
                    <td class="summary-card">
                      <div class="summary-label">Saídas</div>
                      <div class="summary-value negative">${escapeHtml(formatarMoeda(resumoExportacaoMes.saidas))}</div>
                    </td>
                  </tr>
                  <tr>
                    <td class="summary-card">
                      <div class="summary-label">Fixos pagos</div>
                      <div class="summary-value">${escapeHtml(formatarMoeda(resumoExportacaoMes.fixosPagos))}</div>
                    </td>
                    <td class="summary-card">
                      <div class="summary-label">Fixos não pagos</div>
                      <div class="summary-value">${escapeHtml(formatarMoeda(resumoExportacaoMes.fixosNaoPagos))}</div>
                    </td>
                  </tr>
                  <tr>
                    <td class="summary-card">
                      <div class="summary-label">Cartões no mês</div>
                      <div class="summary-value">${escapeHtml(formatarMoeda(resumoExportacaoMes.cartoes))}</div>
                    </td>
                    <td class="summary-card">
                      <div class="summary-label">Categorias com gasto</div>
                      <div class="summary-value">${escapeHtml(String(categoriasExportacaoMes.length))}</div>
                    </td>
                  </tr>
                </table>

                <div class="section-title">Entradas</div>
                <div class="section-sub">Lançamentos positivos registrados na competência selecionada.</div>
                <table class="section">
                  <thead><tr><th>Nome</th><th>Valor</th></tr></thead>
                  <tbody>${renderPdfRows(entradas.map((item) => [item.nome, formatarMoeda(item.valor)]), 2)}</tbody>
                </table>

                <div class="section-title">Gastos fixos</div>
                <div class="section-sub">Itens recorrentes do mês, com status de pagamento.</div>
                <table class="section">
                  <thead><tr><th>Nome</th><th>Valor</th><th>Status</th></tr></thead>
                  <tbody>${renderPdfRows(fixos.map((item) => [item.nome, formatarMoeda(item.valor), item.pago ? 'Pago' : 'Não pago']), 3)}</tbody>
                </table>

                <div class="section-title">Saídas variáveis</div>
                <div class="section-sub">Despesas organizadas com categoria e valor.</div>
                <table class="section">
                  <thead><tr><th>Nome</th><th>Categoria</th><th>Valor</th></tr></thead>
                  <tbody>${renderPdfRows(saidas.map((item) => [item.nome, item.categoria, formatarMoeda(item.valor)]), 3)}</tbody>
                </table>

                <div class="section-title">Ranking de categorias</div>
                <div class="section-sub">Categorias com maior impacto financeiro no mês.</div>
                <table class="section">
                  <thead><tr><th>Categoria</th><th>Valor</th><th>Percentual</th></tr></thead>
                  <tbody>${renderPdfRows(categoriasExportacaoMes.map((item) => [item.categoria, formatarMoeda(item.valor), `${item.percentual.toFixed(1).replace('.', ',')}%`]), 3)}</tbody>
                </table>

                <div class="section-title">Cartões e parcelas</div>
                <div class="section-sub">Compras parceladas que compõem a competência exportada.</div>
                <table class="section">
                  <thead><tr><th>Cartão</th><th>Descrição</th><th>Parcela</th><th>Valor</th></tr></thead>
                  <tbody>${renderPdfRows(parcelasExportacaoMes.map((item) => [item.cartao, item.descricao, `${item.parcelaAtual}/${item.totalParcelas}`, formatarMoeda(item.valorParcela)]), 4)}</tbody>
                </table>

                <div class="footer-note">Arquivo gerado automaticamente com base na competência selecionada no app.</div>
              </div>
            </div>
          </body>
        </html>`
  }

    const gerarArquivoPdf = async () => {
    const html = buildPdfHtml()

    if (Platform.OS === 'web') {
      const { gerarArquivoPdfWeb } = await import('../utils/exportPdfWeb')
      return gerarArquivoPdfWeb(html)
    }

    const { uri } = await Print.printToFileAsync({ html })
    const finalUri = `${FileSystem.cacheDirectory}${exportFileBaseName}.pdf`

    try {
      const info = await FileSystem.getInfoAsync(finalUri)
      if (info.exists) await FileSystem.deleteAsync(finalUri, { idempotent: true })
    } catch {}

    await FileSystem.copyAsync({ from: uri, to: finalUri })
    return finalUri
  }


  const exportarPdf = async () => {
    try {
      setProcessandoArquivo('pdf')
      const finalUri = await gerarArquivoPdf()

      if (Platform.OS === 'web') {
        const a = document.createElement('a')
        a.href = finalUri
        a.download = `${exportFileBaseName}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      } else {
        await Sharing.shareAsync(finalUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Exportar PDF',
          UTI: 'com.adobe.pdf',
        })
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar o PDF.')
    } finally {
      setProcessandoArquivo(null)
    }
  }

  const abrirPreviewExportacao = (tipo: 'csv' | 'excel' | 'pdf') => {
    setPreviewExportacaoTipo(tipo)
    setModalPreviewExportacaoAberto(true)
  }

  useEffect(() => {
    let ativo = true

    const prepararPreviewPdf = async () => {
      if (!modalPreviewExportacaoAberto || previewExportacaoTipo !== 'pdf') return
      try {
        setPreviewPdfGerando(true)
        const uri = await gerarArquivoPdf()
        if (ativo) {
          setPreviewPdfUri(uri)
        }
      } catch {
        if (ativo) {
          setPreviewPdfUri('')
        }
      } finally {
        if (ativo) setPreviewPdfGerando(false)
      }
    }

    if (previewExportacaoTipo === 'pdf') {
      prepararPreviewPdf()
    } else {
      setPreviewPdfUri('')
      setPreviewPdfGerando(false)
    }

    return () => {
      ativo = false
    }
  }, [modalPreviewExportacaoAberto, previewExportacaoTipo, resumoExportacaoMes.competencia, exportFileBaseName])

  const confirmarExportacaoPreview = async () => {
    setModalPreviewExportacaoAberto(false)
    if (previewExportacaoTipo === 'csv') {
      await exportarCsv()
      return
    }
    if (previewExportacaoTipo === 'excel') {
      await exportarExcel()
      return
    }
    await exportarPdf()
  }

  const normalizarValorImportado = (valorBruto: string) => {
    const bruto = String(valorBruto || '').trim().replace(/\s/g, '')
    if (!bruto) return NaN
    const temVirgula = bruto.includes(',')
    const temPonto = bruto.includes('.')
    if (temVirgula && temPonto) {
      return bruto.lastIndexOf(',') > bruto.lastIndexOf('.')
        ? Number(bruto.replace(/\./g, '').replace(',', '.'))
        : Number(bruto.replace(/,/g, ''))
    }
    if (temVirgula) return Number(bruto.replace(/\./g, '').replace(',', '.'))
    return Number(bruto.replace(/,/g, ''))
  }

  const inferirCategoriaPorHistorico = (descricao: string) => {
    const texto = String(descricao || '').toLowerCase().trim()
    if (!texto) return ''
    const historico = Object.values(bancoDeDados).flatMap((mes) => mes.saidas || [])
    const matchExato = historico.find((item) => item.nome.toLowerCase().trim() === texto)
    if (matchExato?.categoria) return matchExato.categoria
    const matchContido = historico.find((item) => texto.includes(item.nome.toLowerCase().trim()) || item.nome.toLowerCase().trim().includes(texto))
    if (matchContido?.categoria) return matchContido.categoria
    return ''
  }

  const categorizarAutomaticamente = (descricao: string) => {
    const historica = inferirCategoriaPorHistorico(descricao)
    if (historica) return historica
    const texto = String(descricao || '').toLowerCase()
    if (['uber','99','taxi','posto','combust'].some((t) => texto.includes(t))) return 'Uber'
    if (['mercado','supermercado','ifood','restaurante','lanche','padaria','comida'].some((t) => texto.includes(t))) return 'Comida'
    if (['farmacia','droga','clinica','hospital','saude'].some((t) => texto.includes(t))) return 'Saúde'
    if (['cinema','netflix','spotify','show','lazer'].some((t) => texto.includes(t))) return 'Lazer'
    return 'Extra'
  }

  const parseImportedBankText = (textContent: string, fileName: string) => {
    const lowerName = String(fileName || '').toLowerCase()
    const importedEntradas: EntradaItem[] = []
    const importedSaidas: SaidaItem[] = []

    const extrairDiaTransacao = (rawDate: string) => {
      const value = String(rawDate || '').trim().replace(/^"|"$/g, '')
      if (!value) return 1
      if (/^\d{8}$/.test(value)) return Number(value.slice(6, 8))
      const slash = value.match(/^(\d{1,2})\/(\d{1,2})(?:\/\d{2,4})?$/)
      if (slash) return Number(slash[1])
      const dash = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (dash) return Number(dash[3])
      const dash2 = value.match(/^(\d{2})-(\d{2})-(\d{4})$/)
      if (dash2) return Number(dash2[1])
      return 1
    }

    const pushTransaction = (descricao: string, valor: number, dia?: number) => {
      const nomeBase = String(descricao || 'Importado do banco').trim()
      const diaSeguro = Math.min(31, Math.max(1, Number(dia || 1)))
      if (!nomeBase || Number.isNaN(valor) || !Number.isFinite(valor)) return

      if (valor >= 0) {
        importedEntradas.push({
          id: `entrada-import-${Date.now()}-${importedEntradas.length}`,
          nome: nomeBase,
          valor,
          dia: diaSeguro,
        })
      } else {
        importedSaidas.push({
          id: `saida-import-${Date.now()}-${importedSaidas.length}`,
          nome: nomeBase,
          valor: Math.abs(valor),
          categoria: categorizarAutomaticamente(nomeBase),
          dia: diaSeguro,
        })
      }
    }

    if (lowerName.endsWith('.ofx')) {
      const blocos = textContent.split(/<STMTTRN>/i).slice(1)
      blocos.forEach((bloco) => {
        const valorMatch = bloco.match(/<TRNAMT>([-\d.,]+)/i)
        const memoMatch = bloco.match(/<(?:MEMO|NAME)>([^\r\n<]+)/i)
        const dateMatch = bloco.match(/<DTPOSTED>(\d{8,14})/i)
        if (!valorMatch) return
        const valor = normalizarValorImportado(valorMatch[1])
        if (Number.isNaN(valor)) return
        const dia = dateMatch ? extrairDiaTransacao(dateMatch[1]) : 1
        pushTransaction(memoMatch?.[1] || 'Importado OFX', valor, dia)
      })
      return { importedEntradas, importedSaidas }
    }

    const linhas = textContent.split(/\r?\n/).filter((linha) => String(linha || '').trim())
    if (!linhas.length) return { importedEntradas, importedSaidas }

    const separador = linhas[0].includes(';') ? ';' : ','
    const headers = linhas[0].split(separador).map((item) => String(item || '').trim().toLowerCase())

    const idxDescricao = headers.findIndex((item) => ['descricao', 'descrição', 'historico', 'histórico', 'memo', 'name'].includes(item))
    const idxValor = headers.findIndex((item) => ['valor', 'amount', 'valor_rs', 'valor r$', 'valor_r$', 'vlr'].includes(item))
    const idxTipo = headers.findIndex((item) => ['tipo', 'type'].includes(item))
    const idxData = headers.findIndex((item) => ['data', 'date', 'dtposted', 'lançamento', 'lancamento'].includes(item))

    if (idxValor < 0) return { importedEntradas, importedSaidas }

    linhas.slice(1).forEach((linha) => {
      const cols = linha.split(separador)
      const descricao = idxDescricao >= 0 ? String(cols[idxDescricao] || 'Importado banco').replace(/^"|"$/g, '').trim() : 'Importado banco'
      const valorBruto = String(cols[idxValor] || '').replace(/^"|"$/g, '').trim()
      let valor = normalizarValorImportado(valorBruto)
      if (Number.isNaN(valor)) return
      const tipo = idxTipo >= 0 ? String(cols[idxTipo] || '').toLowerCase() : ''
      const dia = idxData >= 0 ? extrairDiaTransacao(String(cols[idxData] || '')) : 1

      if (tipo.includes('debito') || tipo.includes('débito') || tipo.includes('saida') || tipo.includes('saída')) {
        valor = -Math.abs(valor)
      } else if (tipo.includes('credito') || tipo.includes('crédito') || tipo.includes('entrada')) {
        valor = Math.abs(valor)
      }

      pushTransaction(descricao, valor, dia)
    })

    return { importedEntradas, importedSaidas }
  }

  const importarDadosBanco = async () => {
    if (
      bloquearAcaoSemPremium(
        'Importar arquivos é um recurso premium. Ative o Brazllet Premium para importar PDF, CSV, Excel ou OFX.'
      )
    ) {
      return
    }

    try {
      setProcessandoArquivo('importar')
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/x-ofx', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf', 'application/octet-stream'],
        copyToCacheDirectory: true,
        multiple: false,
      })
      if (result.canceled || !result.assets?.length) return
      const asset = result.assets[0]
      const lowerName = String(asset.name || '').toLowerCase()
      if (lowerName.endsWith('.pdf')) {
        Alert.alert('Importação PDF', 'A importação automática de PDF ainda não está disponível nesta versão.')
        return
      }
      let importedEntradas: EntradaItem[] = []
      let importedSaidas: SaidaItem[] = []
      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'base64' })
        const wb = XLSX.read(base64, { type: 'base64' })
        const firstSheet = wb.SheetNames[0]
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(wb.Sheets[firstSheet], { defval: '' })
        const csvLike = rows.length ? [Object.keys(rows[0]).join(';'), ...rows.map((row) => Object.keys(rows[0]).map((k) => String(row[k] ?? '')).join(';'))].join('\n') : ''
        ;({ importedEntradas, importedSaidas } = parseImportedBankText(csvLike, 'importacao.csv'))
      } else {
        const textContent = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'utf8' })
        ;({ importedEntradas, importedSaidas } = parseImportedBankText(textContent, asset.name || 'importacao.csv'))
      }
      if (!importedEntradas.length && !importedSaidas.length) {
        Alert.alert('Importação', 'Nenhum lançamento reconhecido no arquivo.')
        return
      }
      setArquivoImportacaoNome(asset.name || 'arquivo importado')
      setPreviewImportacao({ entradas: importedEntradas, saidas: importedSaidas })
      setModalPreviewImportacaoAberto(true)
    } catch {
      Alert.alert('Erro', 'Não foi possível importar o arquivo.')
    } finally {
      setProcessandoArquivo(null)
    }
  }

  const confirmarImportacaoPreview = () => {
    const importedEntradas = previewImportacao.entradas
    const importedSaidas = previewImportacao.saidas
    setAppData((prev) => ({
      ...prev,
      bancoDeDados: {
        ...prev.bancoDeDados,
        [chaveAtual]: {
          ...prev.bancoDeDados[chaveAtual],
          entradas: [...prev.bancoDeDados[chaveAtual].entradas, ...importedEntradas],
          saidas: [...prev.bancoDeDados[chaveAtual].saidas, ...importedSaidas],
          categoriasSaidas: importedSaidas.length ? Array.from(new Set([...prev.bancoDeDados[chaveAtual].categoriasSaidas, ...importedSaidas.map((i) => i.categoria)])) : prev.bancoDeDados[chaveAtual].categoriasSaidas,
        },
      },
    }))
    setModalPreviewImportacaoAberto(false)
    setPreviewImportacao({ entradas: [], saidas: [] })
    setArquivoImportacaoNome('')
  }

  const iniciarEdicaoSalario = () => {
    if (
      bloquearAcaoSemPremium(
        'Editar o salário faz parte das ações premium. Ative o Brazllet Premium para alterar seus valores.'
      )
    ) {
      return
    }

    setSalarioTexto(formatarNumeroBR(salario))
    setSalarioEmEdicao(true)
    scrollToSalaryEditField()
    setTimeout(() => salaryInputRef.current?.focus(), 220)
  }

  const salvarSalarioEdicao = () => {
    const valorConvertido = moneyStringToNumber(salarioTexto)
    setAppData((prev) => ({
      ...prev,
      bancoDeDados: {
        ...prev.bancoDeDados,
        [chaveAtual]: {
          ...prev.bancoDeDados[chaveAtual],
          salario: valorConvertido,
        },
      },
    }))
    setSalarioEmEdicao(false)
  }

  const getDefaultQuickAddType = (): QuickAddType => {
    if (abaInferior === 'cartao') return 'parcela'
    if (abaInferior === 'fixo') return 'fixo'
    if (abaInferior === 'variavel') return tipoVariavelTab === 'saida' ? 'saida' : 'entrada'
    return 'entrada'
  }

  const abrirAcaoRapida = () => {
    const tipoPadrao = getDefaultQuickAddType()
    setAcaoRapidaPadrao(tipoPadrao)
    abrirFormularioPorAcao(tipoPadrao)
  }

  const abrirFormularioPorAcao = (tipo: QuickAddType) => {
    setModalAcaoRapidaAberto(false)

    setModoModalLancamento('novo')
    setItemEditandoId(null)
    setTipoFormularioLancamento(tipo)

    if (tipo === 'entrada' || tipo === 'saida') {
      setTipoVariavelTab(tipo)
      setAbaInferior('variavel')
    } else if (tipo === 'fixo') {
      setAbaInferior('fixo')
    } else if (tipo === 'parcela') {
      setAbaInferior('cartao')
    }

    setNovoNome('')
    setNovoValor('R$ 0,00')
    setNovaCategoria(categoriasSaidas[0] || 'Mercado')
    setNovaParcelaDescricao('')
    setNovaParcelaValor('R$ 0,00')
    setNovaParcelaTotal('1')
    setDiaEdicao(String(new Date().getDate()))
    setParcelaEditandoId(null)
    setModalLancamentoAberto(true)
  }

  const copiarPix = async (id: string, chave: string) => {
    try {
      await Clipboard.setStringAsync(chave)
      setCopiedPixId(id)
      setTimeout(() => setCopiedPixId((prev) => (prev === id ? null : prev)), 1500)
    } catch {}
  }

  const abrirEditarFixo = (item: FixoItem) => {
    setModoModalLancamento('editar')
    setItemEditandoId(item.id)
    setTipoFormularioLancamento('fixo')
    setNovoNome(item.nome)
    setNovoValor(formatarValorInput(item.valor))
    setDiaEdicao(String(item.dia || 1))
    setModalLancamentoAberto(true)
  }

  const abrirEditarEntrada = (item: EntradaItem) => {
    setModoModalLancamento('editar')
    setItemEditandoId(item.id)
    setTipoVariavelTab('entrada')
    setTipoFormularioLancamento('entrada')
    setNovoNome(item.nome)
    setNovoValor(formatarValorInput(item.valor))
    setDiaEdicao(String(item.dia || 1))
    setModalLancamentoAberto(true)
  }

  const abrirEditarSaida = (item: SaidaItem) => {
    setModoModalLancamento('editar')
    setItemEditandoId(item.id)
    setTipoVariavelTab('saida')
    setTipoFormularioLancamento('saida')
    setNovoNome(item.nome)
    setNovoValor(formatarValorInput(item.valor))
    setNovaCategoria(item.categoria || categoriasSaidas[0] || 'Mercado')
    setDiaEdicao(String(item.dia || 1))
    setModalLancamentoAberto(true)
  }

  const fecharModalLancamento = () => {
    setModalLancamentoAberto(false)
    setModoModalLancamento('novo')
    setItemEditandoId(null)
    setNovoNome('')
    setNovoValor('R$ 0,00')
    setNovaCategoria(categoriasSaidas[0] || 'Mercado')
    setNovaParcelaDescricao('')
    setNovaParcelaValor('R$ 0,00')
    setNovaParcelaTotal('1')
    setDiaEdicao('1')
  }

  const salvarNovaParcelaDentroDoLancamento = () => {
    if (!selectedCardId || !novaParcelaDescricao.trim()) return

    const valorTotalCompra = moneyStringToNumber(novaParcelaValor)
    const totalParcelas = Math.max(1, Number(novaParcelaTotal || 1))
    const valor = totalParcelas > 0 ? valorTotalCompra / totalParcelas : valorTotalCompra
    const parcelaAtual = 1

    setAppData((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        cards: prev.global.cards.map((card) => {
          if (card.id !== selectedCardId) return card

          const purchaseGroupId = `purchase-${Date.now()}`
          const competenciaInicial = calcularCompetenciaInicialParcela(card.fechamento)
          const hojeDiaCompra = Math.min(31, Math.max(1, Number(diaEdicao || new Date().getDate())))
          const novasParcelas: CardInstallment[] = Array.from(
            { length: totalParcelas - parcelaAtual + 1 },
            (_, idx) => ({
              id: `installment-${Date.now()}-${idx}`,
              descricao: novaParcelaDescricao.trim(),
              valorParcela: valor,
              parcelaAtual: parcelaAtual + idx,
              totalParcelas,
              competencia: addMonthsToCompetencia(competenciaInicial, idx),
              dia: hojeDiaCompra,
              groupId: purchaseGroupId,
            })
          )

          return {
            ...card,
            parcelas: [...card.parcelas, ...novasParcelas],
          }
        }),
      },
    }))

    fecharModalLancamento()
  }

  const salvarLancamento = () => {
    if (tipoFormularioLancamento === 'parcela') {
      salvarNovaParcelaDentroDoLancamento()
      return
    }

    if (!novoNome.trim()) return
    const valorConvertido = moneyStringToNumber(novoValor)

    if (modoModalLancamento === 'novo') {
      const diaLancamento = Math.min(31, Math.max(1, Number(diaEdicao || new Date().getDate())))
      const base = { id: `${tipoFormularioLancamento}-${Date.now()}`, nome: novoNome.trim(), valor: valorConvertido, dia: diaLancamento }

      setAppData((prev) => {
        const bancoAtualizado: BancoDeDados = { ...prev.bancoDeDados }

        if (tipoFormularioLancamento === 'fixo') {
          const recorrenteId = `fixo-recorrente-${Date.now()}`
          Object.keys(bancoAtualizado).forEach((chave) => {
            if (!competenciaMaiorOuIgual(chave, chaveAtual)) return
            const mes = bancoAtualizado[chave]
            bancoAtualizado[chave] = {
              ...mes,
              fixo: [
                ...(mes.fixo || []),
                { ...base, id: `${recorrenteId}-${chave}`, pago: false, recorrenteId, criadoEmCompetencia: chaveAtual },
              ],
            }
          })
        } else {
          bancoAtualizado[chaveAtual] = {
            ...bancoAtualizado[chaveAtual],
            entradas:
              tipoFormularioLancamento === 'entrada'
                ? [...bancoAtualizado[chaveAtual].entradas, base]
                : bancoAtualizado[chaveAtual].entradas,
            saidas:
              tipoFormularioLancamento === 'saida'
                ? [...bancoAtualizado[chaveAtual].saidas, { ...base, categoria: novaCategoria || categoriasSaidas[0] || 'Mercado' }]
                : bancoAtualizado[chaveAtual].saidas,
          }
        }

        return { ...prev, bancoDeDados: bancoAtualizado }
      })
    } else {
      setAppData((prev) => ({
        ...prev,
        bancoDeDados: {
          ...prev.bancoDeDados,
          [chaveAtual]: {
            ...prev.bancoDeDados[chaveAtual],
            saidas:
              tipoFormularioLancamento === 'saida'
                ? prev.bancoDeDados[chaveAtual].saidas.map((item) =>
                    item.id === itemEditandoId
                      ? { ...item, nome: novoNome.trim(), valor: valorConvertido, categoria: novaCategoria, dia: Math.min(31, Math.max(1, Number(diaEdicao || item.dia || 1))) }
                      : item
                  )
                : prev.bancoDeDados[chaveAtual].saidas,
            entradas:
              tipoFormularioLancamento === 'entrada'
                ? prev.bancoDeDados[chaveAtual].entradas.map((item) =>
                    item.id === itemEditandoId ? { ...item, nome: novoNome.trim(), valor: valorConvertido, dia: Math.min(31, Math.max(1, Number(diaEdicao || item.dia || 1))) } : item
                  )
                : prev.bancoDeDados[chaveAtual].entradas,
            fixo:
              tipoFormularioLancamento === 'fixo'
                ? prev.bancoDeDados[chaveAtual].fixo.map((item) =>
                    item.id === itemEditandoId ? { ...item, nome: novoNome.trim(), valor: valorConvertido, dia: Math.min(31, Math.max(1, Number(diaEdicao || item.dia || 1))) } : item
                  )
                : prev.bancoDeDados[chaveAtual].fixo,
          },
        },
      }))
    }

    fecharModalLancamento()
  }

  const abrirConfirmacaoExclusao = (type: DeleteTarget, id: string, label: string) => {
    setConfirmacaoExclusao({ type, id, label })
  }

  const confirmarExclusao = () => {
    if (!confirmacaoExclusao) return

    const { type, id } = confirmacaoExclusao

    if (type === 'fixo') excluirFixo(id)
    else if (type === 'entrada') excluirEntrada(id)
    else if (type === 'saida') excluirSaida(id)
    else if (type === 'pix') excluirPix(id)
    else if (type === 'nota') excluirNota(id)
    else if (type === 'cartao') excluirCartao(id)
    else if (type === 'parcela') excluirParcela(id)
    else if (type === 'categoria') excluirCategoria(id)
    else if (type === 'compra_desejo') excluirCompraDesejo(id)
    else if (type === 'objetivo') excluirObjetivo(id)

    setConfirmacaoExclusao(null)
  }

  const alternarPagoFixo = (id: string) => {
    if (
      bloquearAcaoSemPremium(
        'Alterar o status de pago e não pago dos gastos fixos é um recurso premium. Ative o Brazllet Premium para modificar seus lançamentos.'
      )
    ) {
      return
    }

    setAppData((prev) => ({
      ...prev,
      bancoDeDados: {
        ...prev.bancoDeDados,
        [chaveAtual]: {
          ...prev.bancoDeDados[chaveAtual],
          fixo: prev.bancoDeDados[chaveAtual].fixo.map((item) =>
            item.id === id ? { ...item, pago: !item.pago, dia: !item.pago ? new Date().getDate() : undefined } : item
          ),
        },
      },
    }))
  }

  const excluirFixo = (id: string) => {
    setAppData((prev) => {
      const itemAtual = prev.bancoDeDados[chaveAtual]?.fixo?.find((item) => item.id === id)
      const recorrenteId = itemAtual?.recorrenteId
      const bancoAtualizado: BancoDeDados = { ...prev.bancoDeDados }
      Object.keys(bancoAtualizado).forEach((chave) => {
        if (!competenciaMaiorOuIgual(chave, chaveAtual)) return
        const mes = bancoAtualizado[chave]
        bancoAtualizado[chave] = {
          ...mes,
          fixo: (mes.fixo || []).filter((item) => (recorrenteId ? item.recorrenteId !== recorrenteId : item.id !== id)),
        }
      })
      return { ...prev, bancoDeDados: bancoAtualizado }
    })
  }

  const excluirEntrada = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      bancoDeDados: {
        ...prev.bancoDeDados,
        [chaveAtual]: {
          ...prev.bancoDeDados[chaveAtual],
          entradas: prev.bancoDeDados[chaveAtual].entradas.filter((item) => item.id !== id),
        },
      },
    }))
  }

  const excluirSaida = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      bancoDeDados: {
        ...prev.bancoDeDados,
        [chaveAtual]: {
          ...prev.bancoDeDados[chaveAtual],
          saidas: prev.bancoDeDados[chaveAtual].saidas.filter((item) => item.id !== id),
        },
      },
    }))
  }

  const abrirModalNovaCategoria = () => {
    setModoCategoria('nova')
    setCategoriaOriginal('')
    setCategoriaDigitada('')
    setModalCategoriaNomeAberto(true)
  }

  const abrirModalEditarCategoria = (categoria: string) => {
    setModoCategoria('editar')
    setCategoriaOriginal(categoria)
    setCategoriaDigitada(categoria)
    setModalCategoriaNomeAberto(true)
  }

  const fecharModalCategoriaNome = () => {
    setModalCategoriaNomeAberto(false)
    setModoCategoria('nova')
    setCategoriaOriginal('')
    setCategoriaDigitada('')
  }

  const salvarCategoria = () => {
    const nomeNova = categoriaDigitada.trim()
    if (!nomeNova) return
    if (modoCategoria === 'nova') {
      if (categoriasSaidas.includes(nomeNova)) return
      setAppData((prev) => ({
        ...prev,
        bancoDeDados: {
          ...prev.bancoDeDados,
          [chaveAtual]: {
            ...prev.bancoDeDados[chaveAtual],
            categoriasSaidas: [...prev.bancoDeDados[chaveAtual].categoriasSaidas, nomeNova],
          },
        },
      }))
    } else {
      if (nomeNova === categoriaOriginal || categoriasSaidas.includes(nomeNova)) {
        fecharModalCategoriaNome()
        return
      }
      setAppData((prev) => ({
        ...prev,
        bancoDeDados: {
          ...prev.bancoDeDados,
          [chaveAtual]: {
            ...prev.bancoDeDados[chaveAtual],
            categoriasSaidas: prev.bancoDeDados[chaveAtual].categoriasSaidas.map((cat) =>
              cat === categoriaOriginal ? nomeNova : cat
            ),
            saidas: prev.bancoDeDados[chaveAtual].saidas.map((item) =>
              item.categoria === categoriaOriginal ? { ...item, categoria: nomeNova } : item
            ),
          },
        },
      }))
      if (filtroCategoria === categoriaOriginal) setFiltroCategoria(nomeNova)
    }
    fecharModalCategoriaNome()
  }

  const excluirCategoria = (categoria: string) => {
    const emUso = saidas.some((item) => item.categoria === categoria)
    if (emUso) return
    setAppData((prev) => ({
      ...prev,
      bancoDeDados: {
        ...prev.bancoDeDados,
        [chaveAtual]: {
          ...prev.bancoDeDados[chaveAtual],
          categoriasSaidas: prev.bancoDeDados[chaveAtual].categoriasSaidas.filter((cat) => cat !== categoria),
        },
      },
    }))
    if (filtroCategoria === categoria) setFiltroCategoria('Todas')
  }

  const abrirNovaNota = (tipo: NoteModalMode) => {
    setItemNotaEditandoId(null)
    setNoteModalType(tipo)
    setNotaTitulo('')
    setNotaConteudo('')
    setPixNome('')
    setPixChave('')
    setPixObservacao('')
    setPixLinks([''])
    setModalAnotacaoAberto(true)
  }

  const abrirEditarPix = (item: PixItem) => {
    setItemNotaEditandoId(item.id)
    setNoteModalType('pix')
    setPixNome(item.nome)
    setPixChave(item.chave)
    setPixObservacao(item.observacao)
    setPixLinks(item.links?.length ? item.links : [''])
    setModalAnotacaoAberto(true)
  }

  const abrirEditarNota = (item: NoteItem) => {
    setItemNotaEditandoId(item.id)
    setNoteModalType('nota')
    setNotaTitulo(item.titulo)
    setNotaConteudo(item.conteudo)
    setNotaLinks(item.links?.length ? item.links : [''])
    setModalAnotacaoAberto(true)
  }

  const fecharModalAnotacao = () => {
    setModalAnotacaoAberto(false)
    setItemNotaEditandoId(null)
    setNotaTitulo('')
    setNotaConteudo('')
    setPixNome('')
    setPixChave('')
    setPixObservacao('')
    setPixLinks([''])
    setNotaLinks([''])
  }

  const salvarAnotacao = () => {
    if (noteModalType === 'pix') {
      if (!pixNome.trim() || !pixChave.trim()) return
      const linksPixSanitizados = sanitizarListaLinks(pixLinks)
      setAppData((prev) => ({
        ...prev,
        global: {
          ...prev.global,
          pixContacts: itemNotaEditandoId
            ? prev.global.pixContacts.map((item) =>
                item.id === itemNotaEditandoId
                  ? { ...item, nome: pixNome.trim(), chave: pixChave.trim(), observacao: pixObservacao.trim(), links: linksPixSanitizados }
                  : item
              )
            : [
                ...prev.global.pixContacts,
                { id: `pix-${Date.now()}`, nome: pixNome.trim(), chave: pixChave.trim(), observacao: pixObservacao.trim(), links: linksPixSanitizados },
              ],
        },
      }))
    } else {
      if (!notaTitulo.trim()) return
      const linksNotaSanitizados = sanitizarListaLinks(notaLinks)
      setAppData((prev) => ({
        ...prev,
        global: {
          ...prev.global,
          notes: itemNotaEditandoId
            ? prev.global.notes.map((item) =>
                item.id === itemNotaEditandoId
                  ? { ...item, titulo: notaTitulo.trim(), conteudo: notaConteudo.trim(), links: linksNotaSanitizados }
                  : item
              )
            : [
                ...prev.global.notes,
                { id: `note-${Date.now()}`, titulo: notaTitulo.trim(), conteudo: notaConteudo.trim(), links: linksNotaSanitizados },
              ],
        },
      }))
    }
    fecharModalAnotacao()
  }

  const excluirPix = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      global: { ...prev.global, pixContacts: prev.global.pixContacts.filter((item) => item.id !== id) },
    }))
  }

  const excluirNota = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      global: { ...prev.global, notes: prev.global.notes.filter((item) => item.id !== id) },
    }))
  }

  const abrirModalNovaParcela = () => {
    setAbaInferior('cartao')
    setModoModalLancamento('novo')
    setTipoFormularioLancamento('parcela')
    setParcelaEditandoId(null)
    setNovaParcelaDescricao('')
    setNovaParcelaValor('R$ 0,00')
    setNovaParcelaAtual('1')
    setNovaParcelaTotal('1')
    setDiaEdicao(String(new Date().getDate()))
    setModalLancamentoAberto(true)
  }

  const abrirEditarParcela = (item: CardInstallment) => {
    setCardModalType('installment')
    setParcelaEditandoId(item.id)
    setNovaParcelaDescricao(item.descricao)
    setNovaParcelaValor(formatarValorInput(Number(item.valorParcela || 0) * Number(item.totalParcelas || 1)))
    setNovaParcelaAtual('1')
    setNovaParcelaTotal(String(item.totalParcelas))
    setDiaEdicao(String(item.dia || 1))
    setModalCartaoAberto(true)
  }

  const fecharModalCartao = () => {
    setModalCartaoAberto(false)
    setNovoCartaoNome('')
    setNovaParcelaDescricao('')
    setNovaParcelaValor('R$ 0,00')
    setNovaParcelaAtual('1')
    setNovaParcelaTotal('1')
    setParcelaEditandoId(null)
    setDiaEdicao('1')
  }

  const salvarCartaoOuParcela = () => {
    if (!selectedCardId || !novaParcelaDescricao.trim()) return
    const valorTotalCompra = moneyStringToNumber(novaParcelaValor)
    const totalParcelas = Math.max(1, Number(novaParcelaTotal || 1))
    const valor = totalParcelas > 0 ? valorTotalCompra / totalParcelas : valorTotalCompra
    const parcelaAtual = 1

    setAppData((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        cards: prev.global.cards.map((card) => {
          if (card.id !== selectedCardId) return card

          if (parcelaEditandoId) {
            return {
              ...card,
              parcelas: card.parcelas.map((item) =>
                item.id === parcelaEditandoId
                  ? {
                      ...item,
                      descricao: novaParcelaDescricao.trim(),
                      valorParcela: valor,
                      parcelaAtual,
                      totalParcelas,
                      dia: Math.min(31, Math.max(1, Number(diaEdicao || item.dia || 1))),
                    }
                  : item
              ),
            }
          }

          const purchaseGroupId = `purchase-${Date.now()}`
          const competenciaInicial = calcularCompetenciaInicialParcela(card.fechamento)
          const hojeDiaCompra = Math.min(31, Math.max(1, Number(diaEdicao || new Date().getDate())))
          const novasParcelas: CardInstallment[] = Array.from(
            { length: totalParcelas - parcelaAtual + 1 },
            (_, idx) => ({
              id: `installment-${Date.now()}-${idx}`,
              descricao: novaParcelaDescricao.trim(),
              valorParcela: valor,
              parcelaAtual: parcelaAtual + idx,
              totalParcelas,
              competencia: addMonthsToCompetencia(competenciaInicial, idx),
              dia: hojeDiaCompra,
              groupId: purchaseGroupId,
            })
          )

          return {
            ...card,
            parcelas: [...card.parcelas, ...novasParcelas],
          }
        }),
      },
    }))
    fecharModalCartao()
  }

  const excluirCartao = (id: string) => {
    setAppData((prev) => ({
      ...prev,
      global: { ...prev.global, cards: prev.global.cards.filter((item) => item.id !== id) },
    }))
    if (selectedCardId === id) setSelectedCardId(null)
  }

  const excluirParcela = (id: string) => {
    if (!selectedCardId) return
    setAppData((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        cards: prev.global.cards.map((card) =>
          card.id === selectedCardId ? { ...card, parcelas: card.parcelas.filter((item) => item.id !== id) } : card
        ),
      },
    }))
  }

  const anteciparFaturaSeguinte = () => {
    if (!selectedCardId) return
    const competenciaSeguinte = addMonthsToCompetencia(chaveAtual, 1)
    setAppData((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        cards: prev.global.cards.map((card) =>
          card.id === selectedCardId
            ? {
                ...card,
                parcelas: card.parcelas.map((item) =>
                  item.competencia === competenciaSeguinte ? { ...item, competencia: chaveAtual } : item
                ),
              }
            : card
        ),
      },
    }))
  }


  const atualizarPreferenciasInvestimento = (payload: Partial<Pick<GlobalData, 'investmentPercentage' | 'investmentBaseMode' | 'hideValues'>>) => {
    setAppData((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        ...payload,
      },
    }))
  }

  const atualizarPercentualInvestimento = (valor: number) => {
    const percentualNormalizado = clampInvestmentPercentageValue(valor)
    atualizarPreferenciasInvestimento({ investmentPercentage: percentualNormalizado })
  }


  const isParcelaFormulario = String(tipoFormularioLancamento) === 'parcela'
  const isEntradaFormulario = String(tipoFormularioLancamento) === 'entrada'
  const isSaidaFormulario = String(tipoFormularioLancamento) === 'saida'
  const algumModalAberto = anoModalAberto || mesModalAberto || modalLancamentoAberto || modalAcaoRapidaAberto || modalCategoriasAberto || modalCategoriaNomeAberto || modalAnotacaoAberto || modalCartaoAberto || modalAnoComparacaoAberto || modalMesComparacaoAberto || modalFiltroAberto || modalGerenciarCartoesAberto || modalNovoCartaoAberto || modalConfiguracoesAberto || modalObjetivoAberto || modalCompraDesejoAberto || modalPreviewImportacaoAberto || modalPreviewExportacaoAberto || !!confirmacaoExclusao

  const tituloModalLancamento =
    modoModalLancamento === 'novo'
      ? 'Adicionar lançamento'
      : tipoFormularioLancamento === 'saida'
      ? 'Editar saída'
      : tipoFormularioLancamento === 'fixo'
      ? 'Editar gasto fixo'
      : tipoFormularioLancamento === 'parcela'
      ? 'Adicionar parcela'
      : 'Editar entrada'

  if (carregando) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style={temaEscuro ? 'light' : 'dark'} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size='large' color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Carregando seus dados...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const totalCategorias = dadosPizza.reduce((acc, item) => acc + item.valor, 0)
  const centerX = 68
  const centerY = 68
  const outerRadius = 58
  const innerRadius = 34
  let currentAngle = 0

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style={temaEscuro ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>

      <ScrollView
        ref={mainScrollRef}
        onScroll={(event) => {
          mainScrollYRef.current = event.nativeEvent.contentOffset.y
        }}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scrollContent,
          { backgroundColor: theme.background, paddingBottom: 150 + Math.max(insets.bottom, 16) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps='handled'
      >
        <View style={styles.topRow}>
          <View style={[styles.avatar, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
            {avatarEhImagem(avatarPerfil) ? (
              <Image source={{ uri: avatarPerfil }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarText, { color: theme.text }]}>{iniciais || 'U'}</Text>
            )}
          </View>

          <View style={styles.topActions}>
            <Pressable style={[styles.themeButton, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setModalConfiguracoesAberto(true)}><Text style={[styles.themeButtonText, { color: theme.text }]}>⚙</Text></Pressable>
            <Pressable style={[styles.themeButton, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={alternarTema}>
              <Text style={[styles.themeButtonText, { color: theme.text }]}>{temaEscuro ? '☀' : '☾'}</Text>
            </Pressable>
            <Pressable
              style={[
                styles.themeButton,
                styles.valueToggleButton,
                { backgroundColor: ocultarValores ? theme.primary : theme.card, borderColor: ocultarValores ? theme.primary : theme.border },
              ]}
              onPress={() => atualizarPreferenciasInvestimento({ hideValues: !ocultarValores })}
            >
              <EyeToggleIcon closed={ocultarValores} color={ocultarValores ? theme.white : theme.text} />
            </Pressable>
            <Pressable style={[styles.logoutButton, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={handleSair}>
              <Text style={[styles.logoutButtonText, { color: theme.text }]}>Sair</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.eyebrow, { color: theme.muted }]}>Controle Financeiro</Text>
        <Text style={[styles.title, { color: theme.text }]}>Olá, {nome}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]} numberOfLines={1}>{email}</Text>

        <View
          style={[
            styles.homePremiumBadgeWrap,
            {
              backgroundColor: premiumValido ? theme.green : theme.cardSoft,
              borderColor: premiumValido ? theme.green : theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.homePremiumBadgeText,
              { color: premiumValido ? theme.white : theme.text },
            ]}
          >
            {premiumValido ? 'Premium ativo' : 'Premium inativo'}
          </Text>
        </View>

        <View style={[styles.brandHeroCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
          <View style={[styles.brandHeroAccentLine, { backgroundColor: theme.primary }]} />
          <View style={[styles.brandHeroIconShell, { backgroundColor: theme.backgroundSoft, borderColor: theme.borderStrong }]}>
            <Image source={require('../assets/images/icon-removebg.png')} style={styles.brandHeroIcon} resizeMode='contain' />
          </View>
          <View style={styles.brandHeroTextWrap}>
            <View style={[styles.brandHeroBadge, { backgroundColor: theme.backgroundSoft, borderColor: theme.border }]}> 
              <Text style={[styles.brandHeroEyebrow, { color: theme.primary }]}>Brazllet</Text>
            </View>
            <Text style={[styles.brandHeroTitle, { color: theme.text }]}>Seu mês, mais elegante</Text>
            <Text style={[styles.brandHeroSub, { color: theme.muted }]}>Resumo visual premium em menos espaço.</Text>
          </View>
        </View>

        <View style={styles.searchWrap}><TextInput value={buscaGlobal} onChangeText={setBuscaGlobal} placeholder='Busca global no app' placeholderTextColor={theme.muted} style={[styles.searchInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]} /></View>
        {resultadosBuscaGlobal.length > 0 && (
          <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 0, marginBottom: 8 }]}>
            <Text style={[styles.manageTitle, { color: theme.text, marginBottom: 8 }]}>Busca global</Text>
            {resultadosBuscaGlobal.map((item, index) => (
              <Pressable
                key={`${item.tipo}-${item.id}-${index}`}
                onPress={() => irParaResultadoBuscaGlobal(item)}
                style={[styles.fullRowCard, { borderColor: theme.border, backgroundColor: theme.cardSoft, marginTop: index === 0 ? 0 : 8 }]}
              >
                <Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.titulo}</Text>
                <Text style={[styles.rowItemMeta, { color: theme.muted }]}>{item.tipo} · {item.subtitulo}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={styles.selectorGroup}>
          <Pressable style={[styles.dropdownButton, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setAnoModalAberto(true)}>
            <Text style={[styles.dropdownLabel, { color: theme.muted }]}>Ano</Text>
            <View style={styles.dropdownValueRow}>
              <Text style={[styles.dropdownValue, { color: theme.text }]}>{anoSelecionado}</Text>
              <Text style={[styles.dropdownIcon, { color: theme.muted }]}>⌄</Text>
            </View>
          </Pressable>

          <Pressable style={[styles.dropdownButton, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setMesModalAberto(true)}>
            <Text style={[styles.dropdownLabel, { color: theme.muted }]}>Mês</Text>
            <View style={styles.dropdownValueRow}>
              <Text style={[styles.dropdownValue, { color: theme.text }]}>{mesSelecionado}</Text>
              <Text style={[styles.dropdownIcon, { color: theme.muted }]}>⌄</Text>
            </View>
          </Pressable>
        </View>

        {abaInferior === 'home' && (
          <>
            <View style={[styles.salaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
              <Text style={[styles.cardLabelCentered, { color: theme.muted }]}>Salário</Text>
              <View style={styles.salaryRowCentered}>
                {salarioEmEdicao ? (
                  <TextInput
                    ref={salaryInputRef}
                    value={salarioTexto}
                    onChangeText={(value) => handleMaskedMoneyInput(value, setSalarioTexto)}
                    onBlur={salvarSalarioEdicao}
                    onSubmitEditing={salvarSalarioEdicao}
                    keyboardType='number-pad'
                    inputMode='numeric'
                    style={[styles.salaryInput, { color: theme.green }]}
                    placeholder='R$ 0,00'
                    placeholderTextColor={theme.muted}
                    returnKeyType='done'
                  />
                ) : (
                  <>
                    <Text style={[styles.salaryValueCentered, { color: theme.green }]}>{formatarValorVisivel(salario)}</Text>
                    <Pressable style={styles.salaryEditButton} onPress={iniciarEdicaoSalario}>
                      <Text style={[styles.salaryEditText, { color: theme.text }]}>✎</Text>
                    </Pressable>
                  </>
                )}
              </View>
            </View>

            <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
              <Text style={[styles.cardLabelCentered, { color: theme.muted }]}>Saldo atual</Text>
              <Text style={[styles.balanceValueCentered, { color: saldoAtual >= 0 ? theme.green : theme.red }]}>
                {formatarValorVisivel(saldoAtual)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.smallLabel, { color: theme.muted }]}>Entradas</Text>
                <Text style={[styles.smallValue, { color: theme.green }]} numberOfLines={1}>{formatarValorVisivel(totalEntradas)}</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.smallLabel, { color: theme.muted }]}>Saídas</Text>
                <Text style={[styles.smallValue, { color: theme.red }]} numberOfLines={1}>{formatarValorVisivel(totalSaidas)}</Text>
              </View>
            </View>

            <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
              <Text style={[styles.chartTitle, { color: theme.text }]}>Saídas por categoria</Text>
              {dadosPizza.length === 0 ? (
                <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
                  <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhuma saída categorizada ainda.</Text>
                </View>
              ) : (
                <View style={styles.chartContentRow}>
                  <View style={styles.pieWrapSide}>
                    <Svg width={136} height={136} viewBox='0 0 136 136'>
                      <G rotation='0' origin='68, 68'>
                        {dadosPizza.length === 1 ? (
                          <Circle cx={centerX} cy={centerY} r={(outerRadius + innerRadius) / 2} stroke={dadosPizza[0].cor} strokeWidth={outerRadius - innerRadius} fill='none' />
                        ) : (
                          dadosPizza.map((item) => {
                            const sweepAngle = totalCategorias > 0 ? (item.valor / totalCategorias) * 360 : 0
                            const startAngle = currentAngle
                            const endAngle = currentAngle + sweepAngle
                            currentAngle = endAngle
                            const path = createDonutSlicePath(centerX, centerY, outerRadius, innerRadius, startAngle, endAngle)
                            return <Path key={item.categoria} d={path} fill={item.cor} />
                          })
                        )}
                        <Circle cx={centerX} cy={centerY} r={innerRadius - 2} fill={theme.card} />
                      </G>
                    </Svg>
                    <View style={styles.pieCenterLabel}>
                      <Text style={[styles.pieCenterSmall, { color: theme.muted }]}>Total</Text>
                      <Text style={[styles.pieCenterValue, { color: theme.text }]}>{formatarValorVisivel(totalCategorias)}</Text>
                    </View>
                  </View>

                  <View style={styles.legendSideList}>
                    {dadosPizza.map((item) => (
                      <View key={item.categoria} style={[styles.legendSideItem, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                        <View style={styles.legendSideTop}>
                          <View style={[styles.legendDot, { backgroundColor: item.cor }]} />
                          <Text style={[styles.legendCategory, { color: theme.text }]} numberOfLines={1}>{item.categoria}</Text>
                        </View>
                        <Text style={[styles.legendPercentInline, { color: theme.muted }]}>{item.percentual.toFixed(1).replace('.', ',')}%</Text>
                        <Text style={[styles.legendValueInline, { color: theme.text }]} numberOfLines={1}>{formatarValorVisivel(item.valor)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={[styles.investmentCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}> 
              <View style={styles.investmentHeaderRow}>
                <View style={{ flex: 1 }}>
                                    <Text style={[styles.investmentTitle, { color: theme.text }]}>Investimentos do mês</Text>
                  <Text style={[styles.investmentSub, { color: theme.muted }]}>Defina um percentual para separar automaticamente.</Text>
                </View>
                <View style={[styles.investmentBadge, { backgroundColor: theme.backgroundSoft, borderColor: theme.border }]}> 
                  <Text style={[styles.investmentBadgeText, { color: theme.text }]}>{formatarPercentualVisivel(percentualInvestimentoExibicao)}</Text>
                </View>
              </View>

              <View style={styles.investmentBaseRow}>
                <Pressable
                  onPress={() => atualizarPreferenciasInvestimento({ investmentBaseMode: 'salary' })}
                  style={[
                    styles.investmentBaseChip,
                    { backgroundColor: baseInvestimentoModo === 'salary' ? theme.primary : theme.cardSoft, borderColor: baseInvestimentoModo === 'salary' ? theme.primary : theme.border },
                  ]}
                >
                  <Text style={[styles.investmentBaseChipText, { color: baseInvestimentoModo === 'salary' ? theme.white : theme.text }]}>Salário</Text>
                </Pressable>
                <Pressable
                  onPress={() => atualizarPreferenciasInvestimento({ investmentBaseMode: 'salary_plus_entries' })}
                  style={[
                    styles.investmentBaseChip,
                    { backgroundColor: baseInvestimentoModo === 'salary_plus_entries' ? theme.primary : theme.cardSoft, borderColor: baseInvestimentoModo === 'salary_plus_entries' ? theme.primary : theme.border },
                  ]}
                >
                  <Text style={[styles.investmentBaseChipText, { color: baseInvestimentoModo === 'salary_plus_entries' ? theme.white : theme.text }]}>Salário + entradas</Text>
                </Pressable>
              </View>

              <View style={[styles.investmentHighlightCard, { backgroundColor: theme.cardSoft, borderColor: theme.borderStrong }]}> 
                <View style={styles.investmentHighlightTopRow}>
                  <View>
                    <Text style={[styles.investmentHighlightLabel, { color: theme.muted }]}>Aporte sugerido</Text>
                    <Text style={[styles.investmentHighlightValue, { color: theme.text }]}>{formatarValorVisivel(valorInvestimentoSugerido)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.investmentMiniLabel, { color: theme.muted }]}>Base usada</Text>
                    <Text style={[styles.investmentMiniValue, { color: theme.text }]}>{formatarValorVisivel(baseInvestimentoValor)}</Text>
                  </View>
                </View>
                <Text style={[styles.investmentHelperText, { color: theme.muted }]}>Padrão Brazllet para construir constância sem perder flexibilidade.</Text>
              </View>

              <View style={styles.investmentSliderBlock}>
                <View style={styles.investmentSliderHeader}>
                  <Text style={[styles.investmentSliderLabel, { color: theme.text }]}>Percentual desejado</Text>
                </View>

                <View style={styles.investmentSliderScale}>
                  {[5, 10, 15, 20].map((step) => (
                    <Pressable
                      key={step}
                      onPress={() => {
                        setInvestmentManualInput(String(step))
                        atualizarPercentualInvestimento(step)
                      }}
                      style={[styles.investmentScalePill, { backgroundColor: percentualInvestimentoExibicao === step ? theme.primary : theme.cardSoft, borderColor: percentualInvestimentoExibicao === step ? theme.primary : theme.border }]}
                    >
                      <Text style={[styles.investmentScalePillText, { color: percentualInvestimentoExibicao === step ? theme.white : theme.text }]}>{step}%</Text>
                    </Pressable>
                  ))}
                </View>

                <View
                  style={[styles.modalField, styles.investmentManualField]}
                  onLayout={(event) => {
                    investmentManualFieldYRef.current = event.nativeEvent.layout.y + 26
                  }}
                >
                  <Text style={[styles.modalLabel, { color: theme.muted }]}>Percentual manual</Text>
                  <View style={styles.investmentManualField}>
                    <View style={styles.investmentManualInputRow}>
                      <TextInput
                        value={investmentManualInput}
                        onChangeText={(value) => {
                          const sanitized = String(value || '').replace(/[^\d,\.]/g, '').replace('.', ',')
                          const partes = sanitized.split(',')
                          const valorFinal = partes.length > 2 ? `${partes[0]},${partes.slice(1).join('')}` : sanitized
                          setInvestmentManualInput(valorFinal)
                          const normalizado = Number(valorFinal.replace(',', '.'))
                          if (!Number.isNaN(normalizado)) {
                            atualizarPercentualInvestimento(normalizado)
                          }
                        }}
                        onFocus={scrollToInvestmentManualField}
                        keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
                        placeholder='12,5'
                        placeholderTextColor={theme.muted}
                        style={[styles.modalInput, styles.investmentManualInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                      />
                      <Text style={[styles.investmentManualSuffix, { color: theme.text }]}>%</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.sectionSpacerLarge} />

            <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
              <Text style={[styles.chartTitle, { color: theme.text }]}>Comparação</Text>
              <View style={styles.selectorGroup}>
                <Pressable style={[styles.dropdownButton, { backgroundColor: theme.cardSoft, borderColor: theme.border }]} onPress={() => setModalAnoComparacaoAberto(true)}>
                  <Text style={[styles.dropdownLabel, { color: theme.muted }]}>Ano</Text>
                  <View style={styles.dropdownValueRow}>
                    <Text style={[styles.dropdownValue, { color: theme.text }]}>{anoComparacao}</Text>
                    <Text style={[styles.dropdownIcon, { color: theme.muted }]}>⌄</Text>
                  </View>
                </Pressable>
                <Pressable style={[styles.dropdownButton, { backgroundColor: theme.cardSoft, borderColor: theme.border }]} onPress={() => setModalMesComparacaoAberto(true)}>
                  <Text style={[styles.dropdownLabel, { color: theme.muted }]}>Mês</Text>
                  <View style={styles.dropdownValueRow}>
                    <Text style={[styles.dropdownValue, { color: theme.text }]}>{mesComparacao}</Text>
                    <Text style={[styles.dropdownIcon, { color: theme.muted }]}>⌄</Text>
                  </View>
                </Pressable>
              </View>
              <View style={[styles.comparisonGrid, { marginTop: 4 }]}>
                {comparativosResumo.map((item) => {
                  const variacao = calcularVariacaoPercentual(item.atual, item.comparado)
                  const melhorou = item.melhorQuandoMaior ? item.atual >= item.comparado : item.atual <= item.comparado
                  const corVariacao = variacao === 0 ? theme.muted : melhorou ? theme.green : theme.red
                  const prefixo = variacao > 0 ? '+' : ''
                  return (
                    <View key={item.label} style={[styles.summaryCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                      <Text style={[styles.smallLabel, { color: theme.muted }]}>{item.label}</Text>
                      <Text style={[styles.smallValue, { color: theme.text }]}>{formatarValorVisivel(item.atual)}</Text>
                      <Text style={[styles.compareMetaText, { color: theme.muted }]}>Comparado: {formatarValorVisivel(item.comparado)}</Text>
                      <Text style={[styles.compareMetaText, { color: corVariacao }]}>{prefixo}{variacao.toFixed(1).replace('.', ',')}%</Text>
                    </View>
                  )
                })}
                <View style={[styles.summaryCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                  <Text style={[styles.smallLabel, { color: theme.muted }]}>Total somado</Text>
                  <Text style={[styles.smallValue, { color: totalAcumuladoComparacao >= 0 ? theme.green : theme.red }]}>{formatarValorVisivel(totalAcumuladoComparacao)}</Text>
                  <Text style={[styles.compareMetaText, { color: theme.muted }]}>Saldo atual + mês comparado</Text>
                </View>
              </View>
            </View>

            <View style={styles.sectionSpacerLarge} />

            <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
              <View style={styles.manageHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.manageTitle, { color: theme.text }]}>Coisas para comprar</Text>
                  <Text style={[styles.manageSub, { color: theme.muted }]}>Itens que você quer acompanhar antes de decidir comprar.</Text>
                </View>
                <Pressable onPress={() => abrirNovaCompraDesejo()} style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.smallActionBtnText, { color: theme.white }]}>+ Item</Text></Pressable>
              </View>
              {comprasDesejoVisiveis.length === 0 ? (
                <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}><Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhum item salvo.</Text></View>
              ) : (
                comprasDesejoVisiveis.map((item) => (
                  <View key={item.id} onLayout={(event) => registrarLayoutItem(item.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)} style={[styles.fullRowCard, highlightedItemId === item.id && styles.searchHighlightCard, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                    {renderHighlightOverlay(item.id)}
                    <View style={styles.fullRowTop}>
                      <View style={styles.fullRowTitleWrap}>
                        <Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.nome}</Text>
                        <Text style={[styles.rowItemMeta, { color: theme.muted }]}>Preço encontrado: {formatarValorVisivel(item.precoAtual)}</Text>
                        <Text style={[styles.rowItemMeta, { color: theme.muted }]}>{item.loja || 'Loja não informada'} · {item.dataVista || 'Data não informada'}</Text>
                        {!!item.observacao && <Text style={[styles.rowItemMeta, { color: theme.muted }]}>{item.observacao}</Text>}
                      </View>
                      <View style={styles.inlineActions}>
                        <Pressable onPress={() => alternarCompraDesejoComprado(item.id, !item.comprado)} style={[styles.statusBtn, { backgroundColor: item.comprado ? theme.green : theme.card, borderWidth: 1, borderColor: item.comprado ? theme.green : theme.border }]}>
                          <Text style={[styles.statusBtnText, { color: item.comprado ? theme.white : theme.text }]}>{item.comprado ? 'Comprado' : 'Não comprado'}</Text>
                        </Pressable>
                        <Pressable onPress={() => abrirNovaCompraDesejo(item)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text></Pressable>
                        <Pressable onPress={() => abrirConfirmacaoExclusao('compra_desejo', item.id, item.nome)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text></Pressable>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.sectionSpacerLarge} />

            <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
              <View style={styles.manageHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.manageTitle, { color: theme.text }]}>Objetivos</Text>
                  <Text style={[styles.manageSub, { color: theme.muted }]}>Acompanhe metas e progresso.</Text>
                </View>
                <Pressable onPress={() => abrirNovoObjetivo()} style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.smallActionBtnText, { color: theme.white }]}>+ Objetivo</Text></Pressable>
              </View>
              {objetivos.length === 0 ? (
                <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}><Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhum objetivo criado.</Text></View>
              ) : (
                objetivos.map((goal) => {
                  const progresso = goal.alvo > 0 ? Math.min((goal.atual / goal.alvo) * 100, 100) : 0
                  return (
                    <View key={goal.id} style={[styles.fullRowCard, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                      <View style={styles.fullRowTop}>
                        <View style={styles.fullRowTitleWrap}>
                          <Text style={[styles.rowItemTitle, { color: theme.text }]}>{goal.titulo}</Text>
                          <Text style={[styles.rowItemMeta, { color: theme.muted }]}>Atual {formatarValorVisivel(goal.atual)} de {formatarValorVisivel(goal.alvo)}</Text>
                        </View>
                        <View style={styles.inlineActions}>
                          <Pressable onPress={() => abrirNovoObjetivo(goal)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text></Pressable>
                          <Pressable onPress={() => abrirConfirmacaoExclusao('objetivo', goal.id, goal.titulo)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text></Pressable>
                        </View>
                      </View>
                      <View style={[styles.compareBarTrack, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
                        <View style={[styles.compareBarFill, { width: `${Math.max(4, progresso)}%` as const, backgroundColor: theme.blue }]} />
                      </View>
                    </View>
                  )
                })
              )}
            </View>

            <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
              <View style={styles.manageHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.manageTitle, { color: theme.text }]}>Anotações e Pix</Text>
                  <Text style={[styles.manageSub, { color: theme.muted }]}>Guarde chaves Pix e lembretes importantes aqui.</Text>
                </View>
                <View style={styles.categoryToolbar}>
                  <Pressable onPress={() => abrirNovaNota('pix')} style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.smallActionBtnText, { color: theme.white }]}>+ Pix</Text></Pressable>
                  <Pressable onPress={() => abrirNovaNota('nota')} style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.smallActionBtnText, { color: theme.text }]}>+ Nota</Text></Pressable>
                  <Pressable onPress={() => abrirFiltro('notas')} style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.smallActionBtnIcon, { color: theme.text }]}>☷</Text></Pressable>
                </View>
              </View>

              <Text style={[styles.sectionBlockTitle, { color: theme.text }]}>Pix salvos</Text>
              {pixOrdenados.length === 0 ? (
                <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}><Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhum Pix salvo.</Text></View>
              ) : (
                pixOrdenados.map((item) => (
                  <View key={item.id} onLayout={(event) => registrarLayoutItem(item.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)} style={[styles.fullRowCard, highlightedItemId === item.id && styles.searchHighlightCard, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                    {renderHighlightOverlay(item.id)}
                    <View style={styles.fullRowTop}>
                      <View style={styles.fullRowTitleWrap}>
                        <Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.nome}</Text>
                        {renderTextoSecundario(item.chave, item.chave, theme.muted)}
                        {!!item.observacao && renderTextoSecundario(item.observacao, item.observacao, theme.muted)}
                        {renderListaLinks(item.links)}
                      </View>
                      <View style={styles.inlineActions}>
                        <Pressable onPress={() => copiarPix(item.id, item.chave)} style={styles.iconBtn}>
                          <Text style={[styles.iconBtnText, { color: copiedPixId === item.id ? theme.green : theme.text }]}>
                            {copiedPixId === item.id ? '✓' : '⎘'}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => abrirEditarPix(item)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text></Pressable>
                        <Pressable onPress={() => abrirConfirmacaoExclusao('pix', item.id, item.nome)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text></Pressable>
                      </View>
                    </View>
                  </View>
                ))
              )}
              <Text style={[styles.sectionBlockTitle, { color: theme.text, marginTop: 18 }]}>Outras anotações</Text>
              {notasOrdenadas.length === 0 ? (
                <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}><Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhuma anotação salva.</Text></View>
              ) : (
                notasOrdenadas.map((item) => (
                  <View key={item.id} onLayout={(event) => registrarLayoutItem(item.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)} style={[styles.fullRowCard, highlightedItemId === item.id && styles.searchHighlightCard, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                    {renderHighlightOverlay(item.id)}<View style={styles.fullRowTop}><View style={styles.fullRowTitleWrap}><Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.titulo}</Text>{renderTextoSecundario(item.conteudo, 'Sem conteúdo', theme.muted)}{renderListaLinks(item.links)}</View><View style={styles.inlineActions}><Pressable onPress={() => abrirEditarNota(item)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text></Pressable><Pressable onPress={() => abrirConfirmacaoExclusao('nota', item.id, item.titulo)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text></Pressable></View></View></View>
                ))
              )}
            </View>
          </>
        )}

        {abaInferior === 'fixo' && (
          <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <View style={styles.manageHeaderRow}><View style={{ flex: 1 }}><Text style={[styles.manageTitle, { color: theme.text }]}>Gastos fixos</Text><Text style={[styles.manageSub, { color: theme.muted }]}>Pago: {formatarValorVisivel(totalFixoPago)} · Não pago: {formatarValorVisivel(totalFixoNaoPago)}</Text></View><Pressable onPress={() => abrirFiltro('fixo')} style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.smallActionBtnIcon, { color: theme.text }]}>☷</Text></Pressable></View>

            {fixosOrdenados.map((item) => (
              <View key={item.id} onLayout={(event) => registrarLayoutItem(item.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)} style={[styles.fullRowCard, highlightedItemId === item.id && styles.searchHighlightCard, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                    {renderHighlightOverlay(item.id)}
                <View style={styles.fullRowTop}>
                  <View style={styles.fullRowTitleWrap}>
                    <Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.nome}</Text>
                          <Text style={[styles.rowItemMeta, { color: theme.muted }]}>{formatarDiaMes(item.dia, chaveAtual)}</Text>
                  </View>
                  <View style={styles.inlineActions}>
                    <Text style={[styles.rowItemValue, { color: theme.text }]}>{formatarValorVisivel(item.valor)}</Text>
                    <Pressable style={[styles.statusBtn, { backgroundColor: item.pago ? theme.green : theme.red }]} onPress={() => alternarPagoFixo(item.id)}>
                      <Text style={styles.statusBtnText}>{item.pago ? 'Pago' : 'Não pago'}</Text>
                    </Pressable>
                    <Pressable onPress={() => abrirEditarFixo(item)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text></Pressable>
                    <Pressable onPress={() => abrirConfirmacaoExclusao('fixo', item.id, item.nome)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text></Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {abaInferior === 'variavel' && (
          <>
            <View style={[styles.manageCard, styles.sectionCardSpaced, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.manageHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.manageTitle, { color: theme.text }]}>VARIÁVEL</Text>
                  <Text style={[styles.manageSub, { color: theme.muted }]}>
                    {tipoVariavelTab === 'entrada'
                      ? `Total de entradas: ${formatarValorVisivel(totalEntradas)}`
                      : `Total da categoria marcada: ${formatarMoeda(totalCategoriaSelecionada)}`}
                  </Text>
                </View>
                <View style={styles.categoryToolbar}>
                  {tipoVariavelTab === 'saida' && (
                    <>
                      <Pressable onPress={abrirModalNovaCategoria} style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}>
                        <Text style={[styles.smallActionBtnText, { color: theme.white }]}>+ Categoria</Text>
                      </Pressable>
                      <Pressable onPress={() => setModalCategoriasAberto(true)} style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                        <Text style={[styles.smallActionBtnText, { color: theme.text }]}>Gerenciar</Text>
                      </Pressable>
                    </>
                  )}
                  <Pressable onPress={() => abrirFiltro(tipoVariavelTab === 'entrada' ? 'entradas' : 'saidas')} style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                    <Text style={[styles.smallActionBtnIcon, { color: theme.text }]}>☷</Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.variableSwitchRow}>
                <Pressable
                  onPress={() => setTipoVariavelTab('entrada')}
                  style={[styles.variableSwitchBtn, { backgroundColor: tipoVariavelTab === 'entrada' ? theme.primary : theme.cardSoft, borderColor: tipoVariavelTab === 'entrada' ? theme.primary : theme.border }]}
                >
                  <Text style={[styles.variableSwitchBtnText, { color: tipoVariavelTab === 'entrada' ? theme.white : theme.text }]}>Entradas</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTipoVariavelTab('saida')}
                  style={[styles.variableSwitchBtn, { backgroundColor: tipoVariavelTab === 'saida' ? theme.primary : theme.cardSoft, borderColor: tipoVariavelTab === 'saida' ? theme.primary : theme.border }]}
                >
                  <Text style={[styles.variableSwitchBtnText, { color: tipoVariavelTab === 'saida' ? theme.white : theme.text }]}>Saídas</Text>
                </Pressable>
              </View>

              {tipoVariavelTab === 'saida' && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                  <Pressable onPress={() => setFiltroCategoria('Todas')} style={[styles.filterPill, { backgroundColor: filtroCategoria === 'Todas' ? theme.primary : theme.cardSoft, borderColor: filtroCategoria === 'Todas' ? theme.primary : theme.border }]}>
                    <Text style={[styles.filterPillText, { color: filtroCategoria === 'Todas' ? theme.white : theme.text }]}>Todas</Text>
                  </Pressable>
                  {categoriasSaidas.map((categoria) => (
                    <Pressable key={categoria} onPress={() => setFiltroCategoria(categoria)} style={[styles.filterPill, { backgroundColor: filtroCategoria === categoria ? theme.primary : theme.cardSoft, borderColor: filtroCategoria === categoria ? theme.primary : theme.border }]}>
                      <Text style={[styles.filterPillText, { color: filtroCategoria === categoria ? theme.white : theme.text }]}>{categoria}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {tipoVariavelTab === 'entrada' ? (
                entradas.length === 0 ? (
                  <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
                    <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhuma entrada cadastrada.</Text>
                  </View>
                ) : (
                  entradasOrdenadas.map((item) => (
                    <View key={item.id} onLayout={(event) => registrarLayoutItem(item.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)} style={[styles.fullRowCard, highlightedItemId === item.id && styles.searchHighlightCard, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                    {renderHighlightOverlay(item.id)}
                      <View style={styles.fullRowTop}>
                        <View style={styles.fullRowTitleWrap}>
                          <Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.nome}</Text>
                          <Text style={[styles.rowItemMeta, { color: theme.muted }]}>{formatarDiaMes(item.dia, chaveAtual)}</Text>
                        </View>
                        <View style={styles.inlineActions}>
                          <Text style={[styles.rowItemValue, { color: theme.green }]}>{formatarValorVisivel(item.valor)}</Text>
                          <Pressable onPress={() => abrirEditarEntrada(item)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text></Pressable>
                          <Pressable onPress={() => abrirConfirmacaoExclusao('entrada', item.id, item.nome)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text></Pressable>
                        </View>
                      </View>
                    </View>
                  ))
                )
              ) : saidasOrdenadas.length === 0 ? (
                <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
                  <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhuma saída nesta categoria.</Text>
                </View>
              ) : (
                saidasOrdenadas.map((item) => (
                  <View key={item.id} onLayout={(event) => registrarLayoutItem(item.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)} style={[styles.fullRowCard, highlightedItemId === item.id && styles.searchHighlightCard, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                    {renderHighlightOverlay(item.id)}
                    <View style={styles.fullRowTop}>
                      <View style={styles.fullRowTitleWrap}>
                        <Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.nome}</Text>
                        <Text style={[styles.rowItemMeta, { color: theme.muted }]}>{item.categoria} · {formatarDiaMes(item.dia, chaveAtual)}</Text>
                      </View>
                      <View style={styles.inlineActions}>
                        <Text style={[styles.rowItemValue, { color: theme.red }]}>{formatarValorVisivel(item.valor)}</Text>
                        <Pressable onPress={() => abrirEditarSaida(item)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text></Pressable>
                        <Pressable onPress={() => abrirConfirmacaoExclusao('saida', item.id, item.nome)} style={styles.iconBtn}><Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text></Pressable>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {abaInferior === 'cartao' && (
          <>
            <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.manageHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.manageTitle, { color: theme.text }]}>Cartões</Text>
                  <Text style={[styles.manageSub, { color: theme.muted }]}>Total do mês selecionado: {formatarValorVisivel(totalCartaoSelecionado)}</Text>
                </View>
                <View style={styles.categoryToolbar}>
                  <Pressable onPress={abrirModalNovoCartao} style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.smallActionBtnIcon, { color: theme.white }]}>＋</Text>
                  </Pressable>
                  <Pressable onPress={abrirGerenciarCartoes} style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                    <Text style={[styles.smallActionBtnText, { color: theme.text }]}>Gerenciar</Text>
                  </Pressable>
                  <Pressable onPress={() => abrirFiltro('cartao')} style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                    <Text style={[styles.smallActionBtnIcon, { color: theme.text }]}>☷</Text>
                  </Pressable>
                </View>
              </View>

              {selectedCard && (
                <View onLayout={(event) => registrarLayoutItem(selectedCard.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)} style={[styles.settingsCard, highlightedItemId === selectedCard.id && styles.searchHighlightCard, { backgroundColor: theme.cardSoft, borderColor: theme.border, marginTop: 0, marginBottom: 10 }]}>
                  {renderHighlightOverlay(selectedCard.id)} 
                  <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Fatura real</Text>
                  <Text style={[styles.rowItemMeta, { color: theme.muted, marginBottom: 10 }]}>Fechamento da parcela: {datasFaturaCartao.fechamentoAtual} · Vencimento: {datasFaturaCartao.vencimentoAtual}</Text>
                  <View style={styles.settingsInfoGrid}>
                    <View style={[styles.settingsInfoPill, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                      <Text style={[styles.settingsInfoLabel, { color: theme.muted }]}>Limite</Text>
                      <Text style={[styles.settingsInfoValue, { color: theme.text }]}>{formatarValorVisivel(limiteCartaoSelecionado)}</Text>
                    </View>
                    <View style={[styles.settingsInfoPill, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                      <Text style={[styles.settingsInfoLabel, { color: theme.muted }]}>Disponível</Text>
                      <Text style={[styles.settingsInfoValue, { color: theme.text }]}>{formatarValorVisivel(limiteDisponivelCartao)}</Text>
                    </View>
                    <View style={[styles.settingsInfoPill, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                      <Text style={[styles.settingsInfoLabel, { color: theme.muted }]}>Fatura atual</Text>
                      <Text style={[styles.settingsInfoValue, { color: theme.text }]}>{formatarValorVisivel(totalFaturaAtual)}</Text>
                    </View>
                    <View style={[styles.settingsInfoPill, { backgroundColor: theme.card, borderColor: theme.border }]}> 
                      <Text style={[styles.settingsInfoLabel, { color: theme.muted }]}>Próxima</Text>
                      <Text style={[styles.settingsInfoValue, { color: theme.text }]}>{formatarValorVisivel(totalProximaFatura)}</Text>
                    </View>
                  </View>
                  <View style={[styles.compareBarTrack, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}> 
                    <View style={[styles.compareBarFill, { width: `${Math.max(4, percentualUsoCartao)}%` as const, backgroundColor: percentualUsoCartao >= 85 ? theme.red : theme.blue }]} />
                  </View>
                  <Text style={[styles.cardLimitPercent, { color: theme.muted }]}>{percentualUsoCartao.toFixed(1).replace('.', ',')}% do limite usado</Text>
                  {totalProximaFatura > 0 ? (
                    <Pressable onPress={anteciparFaturaSeguinte} style={[styles.settingsActionBtn, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}> 
                      <Text style={[styles.settingsActionBtnText, { color: theme.text }]}>Antecipar fatura do mês seguinte</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {cards.map((card) => (
                  <Pressable
                    key={card.id}
                    onPress={() => setSelectedCardId(card.id)}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: selectedCardId === card.id ? theme.primary : theme.cardSoft,
                        borderColor: selectedCardId === card.id ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text style={[styles.filterPillText, { color: selectedCardId === card.id ? theme.white : theme.text }]}>
                      {card.nome}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {!selectedCard ? (
                <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
                  <Text style={[styles.emptyChartText, { color: theme.muted }]}>Crie ou selecione um cartão.</Text>
                </View>
              ) : parcelasOrdenadas.length === 0 ? (
                <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
                  <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhuma parcela neste mês.</Text>
                </View>
              ) : (
                parcelasOrdenadas.map((item) => (
                  <View key={item.id} onLayout={(event) => registrarLayoutItem(item.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)} style={[styles.fullRowCard, highlightedItemId === item.id && styles.searchHighlightCard, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                    {renderHighlightOverlay(item.id)}
                    <View style={styles.fullRowTop}>
                      <View style={styles.fullRowTitleWrap}>
                        <Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.descricao}</Text>
                        <Text style={[styles.rowItemMeta, { color: theme.muted }]}>
                          {item.parcelaAtual}/{item.totalParcelas} parcelas · {formatarDiaMes(item.dia, item.competencia)}
                        </Text>
                      </View>
                      <View style={styles.inlineActions}>
                        <Text style={[styles.rowItemValue, { color: theme.blue }]}>{formatarValorVisivel(item.valorParcela)}</Text>
                        <Pressable onPress={() => abrirEditarParcela(item)} style={styles.iconBtn}>
                          <Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text>
                        </Pressable>
                        <Pressable onPress={() => abrirConfirmacaoExclusao('parcela', item.id, item.descricao)} style={styles.iconBtn}>
                          <Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
      </View>

      {!algumModalAberto && <View style={[styles.bottomBar, { backgroundColor: theme.card, borderColor: theme.border, bottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.bottomHalf}>
          <Pressable onPress={() => setAbaInferior('home')} style={styles.bottomItem}>
            <Text style={[styles.bottomItemText, { color: abaInferior === 'home' ? theme.blue : theme.text }]}>HOME</Text>
          </Pressable>
          <View style={[styles.bottomDivider, { backgroundColor: theme.borderStrong }]} />
          <Pressable onPress={() => setAbaInferior('cartao')} style={styles.bottomItem}>
            <Text style={[styles.bottomItemText, { color: abaInferior === 'cartao' ? theme.blue : theme.text }]}>CARTÃO</Text>
          </Pressable>
        </View>
        <Pressable onPress={abrirAcaoRapida} style={[styles.plusButton, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}> 
          <Text style={[styles.plusButtonText, { color: theme.white }]}>＋</Text>
        </Pressable>
        <View style={styles.bottomHalf}>
          <Pressable onPress={() => setAbaInferior('fixo')} style={styles.bottomItem}>
            <Text style={[styles.bottomItemText, { color: abaInferior === 'fixo' ? theme.blue : theme.text }]}>FIXO</Text>
          </Pressable>
          <View style={[styles.bottomDivider, { backgroundColor: theme.borderStrong }]} />
          <Pressable onPress={() => setAbaInferior('variavel')} style={styles.bottomItem}>
            <Text style={[styles.bottomItemText, { color: abaInferior === 'variavel' ? theme.blue : theme.text }]}>VARIÁVEL</Text>
          </Pressable>
        </View>
      </View>}

      <AppModal visible={modalAcaoRapidaAberto} onClose={() => setModalAcaoRapidaAberto(false)}>
        <View style={[styles.modalCard, styles.modalQuickActions, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Adicionar</Text>
          <View style={styles.quickActionGrid}>
            {([
              ['entrada', 'Entrada'],
              ['saida', 'Saída'],
              ['fixo', 'Fixo'],
              ['parcela', 'Parcela'],
            ] as [QuickAddType, string][]).map(([tipo, label]) => (
              <Pressable
                key={tipo}
                onPress={() => abrirFormularioPorAcao(tipo)}
                style={[
                  styles.quickActionBtn,
                  {
                    backgroundColor: acaoRapidaPadrao === tipo ? theme.primary : theme.cardSoft,
                    borderColor: acaoRapidaPadrao === tipo ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.quickActionBtnText, { color: acaoRapidaPadrao === tipo ? theme.white : theme.text }]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </AppModal>

      <AppModal visible={anoModalAberto} onClose={() => setAnoModalAberto(false)}>
        <View style={[styles.modalCard, styles.modalCardYear, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Selecionar ano</Text>
          {listaAnos.map((ano) => (
            <Pressable key={ano} style={[styles.modalOption, { backgroundColor: anoSelecionado === ano ? theme.cardSoft : 'transparent', borderColor: theme.border }]} onPress={() => { setAnoSelecionado(ano); setAnoModalAberto(false) }}>
              <Text style={[styles.modalOptionText, { color: anoSelecionado === ano ? theme.text : theme.muted }]}>{ano}</Text>
            </Pressable>
          ))}
        </View>
      </AppModal>

      <AppModal visible={mesModalAberto} onClose={() => setMesModalAberto(false)}>
        <View style={[styles.modalCard, styles.modalCardScrollHint, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Selecionar mês</Text>
          <View style={[styles.modalHintWrap, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalHintText, { color: theme.muted }]}>Deslize para ver mais ↓</Text></View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.monthModalScroll}>
            {meses.map((mes) => (
              <Pressable key={mes} style={[styles.modalOption, { backgroundColor: mesSelecionado === mes ? theme.cardSoft : 'transparent', borderColor: theme.border }]} onPress={() => { setMesSelecionado(mes); setMesModalAberto(false) }}>
                <Text style={[styles.modalOptionText, { color: mesSelecionado === mes ? theme.text : theme.muted }]}>{mes}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </AppModal>

      <AppModal visible={modalLancamentoAberto} onClose={fecharModalLancamento}>
        <View
          style={[
            styles.modalCard,
            (tipoFormularioLancamento === 'parcela' || isSaidaFormulario || isEntradaFormulario) && styles.modalCardWithFixedFooter,
            modoModalLancamento === 'editar'
              ? tipoFormularioLancamento === 'saida'
                ? styles.modalCardEditSaida
                : tipoFormularioLancamento === 'fixo'
                ? styles.modalCardEditFixo
                : styles.modalCardEditEntrada
              : tipoFormularioLancamento === 'saida'
              ? keyboardAberto
                ? styles.modalCardLancamentoSaidaKeyboard
                : styles.modalCardLancamentoSaida
              : tipoFormularioLancamento === 'parcela'
              ? keyboardAberto
                ? styles.modalCardLancamentoParcelaKeyboard
                : styles.modalCardLancamentoParcela
              : keyboardAberto
              ? styles.modalCardLancamentoSaidaKeyboard
              : styles.modalCardLancamentoEntrada,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {(tipoFormularioLancamento === 'parcela' || isSaidaFormulario || isEntradaFormulario) ? (
            <View style={styles.modalContentFill}>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={[styles.modalScrollContent, styles.modalScrollContentWithFooter]}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps='always'
              nestedScrollEnabled
              scrollEnabled
            >
              <View style={styles.modalContentWrap}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{tituloModalLancamento}</Text>

                {modoModalLancamento === 'novo' && (
                  <View style={styles.switchRowThree}>
                    {([
                      ['entrada', 'Entrada'],
                      ['saida', 'Saída'],
                      ['fixo', 'Fixo'],
                      ['parcela', 'Parcela'],
                    ] as [QuickAddType, string][]).map(([tipo, label]) => (
                      <Pressable
                        key={tipo}
                        onPress={() => {
                          setTipoFormularioLancamento(tipo)
                          if (tipo === 'entrada' || tipo === 'saida') {
                            setTipoVariavelTab(tipo)
                            setAbaInferior('variavel')
                          } else if (tipo === 'fixo') {
                            setAbaInferior('fixo')
                          } else if (tipo === 'parcela') {
                            setAbaInferior('cartao')
                          }
                        }}
                        style={[
                          styles.switchBtnThree,
                          {
                            backgroundColor: tipoFormularioLancamento === tipo ? theme.primary : theme.cardSoft,
                            borderColor: tipoFormularioLancamento === tipo ? theme.primary : theme.border,
                          },
                        ]}
                      >
                        <Text style={[styles.switchBtnText, { color: tipoFormularioLancamento === tipo ? theme.white : theme.text }]}>
                          {label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {tipoFormularioLancamento === 'parcela' ? (
                  <>
                    <View style={styles.modalField}>
                      <Text style={[styles.modalLabel, { color: theme.muted }]}>CARTÃO</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                        {cards.map((card) => (
                          <Pressable
                            key={card.id}
                            onPress={() => setSelectedCardId(card.id)}
                            style={[
                              styles.filterPill,
                              {
                                backgroundColor: selectedCardId === card.id ? theme.primary : theme.cardSoft,
                                borderColor: selectedCardId === card.id ? theme.primary : theme.border,
                              },
                            ]}
                          >
                            <Text style={[styles.filterPillText, { color: selectedCardId === card.id ? theme.white : theme.text }]}>{card.nome}</Text>
                          </Pressable>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.modalField}>
                      <Text style={[styles.modalLabel, { color: theme.muted }]}>Descrição</Text>
                      <TextInput value={novaParcelaDescricao} onChangeText={setNovaParcelaDescricao} placeholder='Ex.: tênis, curso...' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
                    </View>

                    <View style={styles.modalField}>
                      <Text style={[styles.modalLabel, { color: theme.muted }]}>Valor total da compra</Text>
                      <TextInput value={novaParcelaValor} onChangeText={(value) => handleMaskedMoneyInput(value, setNovaParcelaValor)} placeholder='R$ 0,00' placeholderTextColor={theme.muted} keyboardType='number-pad' inputMode='numeric' style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
                    </View>

                    <View style={[styles.modalField, styles.totalParcelasField, styles.totalParcelasFieldWide]}>
                      <Text style={[styles.modalLabel, styles.dualFieldLabel, { color: theme.muted }]}>Total de parcelas</Text>
                      <TextInput value={novaParcelaTotal} onChangeText={setNovaParcelaTotal} keyboardType='number-pad' inputMode='numeric' placeholder='Exemplo: 1' placeholderTextColor={theme.muted} style={[styles.modalInput, styles.totalParcelasInput, styles.totalParcelasInputWide, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
                    </View>

                    <View style={styles.modalField}>
                      <Text style={[styles.modalLabel, { color: theme.muted }]}>Dia da compra</Text>
                      <View style={styles.dateInputRow}><TextInput value={diaEdicao} onChangeText={setDiaEdicao} keyboardType='number-pad' inputMode='numeric' placeholder='1' placeholderTextColor={theme.muted} style={[styles.modalInput, styles.dateInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /><Pressable onPress={() => abrirCalendario('dia_edicao', diaEdicao, meses.indexOf(mesSelecionado) + 1)} style={[styles.calendarBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.calendarBtnText, { color: theme.text }]}>📅</Text></Pressable></View>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.modalField}>
                      <Text style={[styles.modalLabel, { color: theme.muted }]}>Nome</Text>
                      <TextInput value={novoNome} onChangeText={setNovoNome} placeholder='Digite o nome' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
                    </View>

                    {tipoFormularioLancamento === 'saida' && (
                      <View style={styles.modalField}>
                        <Text style={[styles.modalLabel, { color: theme.muted }]}>Categoria</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                          {categoriasSaidas.map((categoria) => (
                            <Pressable key={categoria} onPress={() => setNovaCategoria(categoria)} style={[styles.filterPill, { backgroundColor: novaCategoria === categoria ? theme.primary : theme.cardSoft, borderColor: novaCategoria === categoria ? theme.primary : theme.border }]}>
                              <Text style={[styles.filterPillText, { color: novaCategoria === categoria ? theme.white : theme.text }]}>{categoria}</Text>
                            </Pressable>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <View style={styles.modalField}>
                      <Text style={[styles.modalLabel, { color: theme.muted }]}>Valor</Text>
                      <TextInput value={novoValor} onChangeText={(value) => handleMaskedMoneyInput(value, setNovoValor)} placeholder='R$ 0,00' placeholderTextColor={theme.muted} keyboardType='number-pad' inputMode='numeric' style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
                    </View>

                    <View style={styles.modalField}>
                      <Text style={[styles.modalLabel, { color: theme.muted }]}>Dia</Text>
                      <View style={styles.dateInputRow}><TextInput value={diaEdicao} onChangeText={setDiaEdicao} keyboardType='number-pad' inputMode='numeric' placeholder='1' placeholderTextColor={theme.muted} style={[styles.modalInput, styles.dateInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /><Pressable onPress={() => abrirCalendario('dia_edicao', diaEdicao, meses.indexOf(mesSelecionado) + 1)} style={[styles.calendarBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.calendarBtnText, { color: theme.text }]}>📅</Text></Pressable></View>
                    </View>
                  </>
                )}

              </View>
            </ScrollView>
            <View style={[styles.modalActionsSticky, { borderTopColor: theme.border, backgroundColor: theme.card }]}> 
              <View style={styles.modalActions}>
              <Pressable onPress={fecharModalLancamento} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={salvarLancamento} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}> 
                <Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text>
              </Pressable>
              </View>
            </View>
            </View>
          ) : (
            <View style={styles.modalContentWrap}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{tituloModalLancamento}</Text>

              {modoModalLancamento === 'novo' && (
                <View style={styles.switchRowThree}>
                  {([
                    ['entrada', 'Entrada'],
                    ['saida', 'Saída'],
                    ['fixo', 'Fixo'],
                    ['parcela', 'Parcela'],
                  ] as [QuickAddType, string][]).map(([tipo, label]) => (
                    <Pressable key={tipo} onPress={() => {
                      setTipoFormularioLancamento(tipo)
                      if (tipo === 'entrada' || tipo === 'saida') {
                        setTipoVariavelTab(tipo)
                        setAbaInferior('variavel')
                      } else if (tipo === 'fixo') {
                        setAbaInferior('fixo')
                      } else if (tipo === 'parcela') {
                        setAbaInferior('cartao')
                      }
                    }} style={[styles.switchBtnThree, { backgroundColor: tipoFormularioLancamento === tipo ? theme.primary : theme.cardSoft, borderColor: tipoFormularioLancamento === tipo ? theme.primary : theme.border }]}>
                      <Text style={[styles.switchBtnText, { color: tipoFormularioLancamento === tipo ? theme.white : theme.text }]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.muted }]}>Nome</Text>
                <TextInput value={novoNome} onChangeText={setNovoNome} placeholder='Digite o nome' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
              </View>

              {tipoFormularioLancamento === 'saida' && (
                <View style={styles.modalField}>
                  <Text style={[styles.modalLabel, { color: theme.muted }]}>Categoria</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {categoriasSaidas.map((categoria) => (
                      <Pressable key={categoria} onPress={() => setNovaCategoria(categoria)} style={[styles.filterPill, { backgroundColor: novaCategoria === categoria ? theme.primary : theme.cardSoft, borderColor: novaCategoria === categoria ? theme.primary : theme.border }]}>
                        <Text style={[styles.filterPillText, { color: novaCategoria === categoria ? theme.white : theme.text }]}>{categoria}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.muted }]}>Valor</Text>
                <TextInput value={novoValor} onChangeText={(value) => handleMaskedMoneyInput(value, setNovoValor)} placeholder='R$ 0,00' placeholderTextColor={theme.muted} keyboardType='number-pad' inputMode='numeric' style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
              </View>

              {modoModalLancamento === 'editar' ? (
                <View style={styles.modalField}>
                  <Text style={[styles.modalLabel, { color: theme.muted }]}>Dia</Text>
                  <View style={styles.dateInputRow}><TextInput value={diaEdicao} onChangeText={setDiaEdicao} keyboardType='number-pad' inputMode='numeric' placeholder='1' placeholderTextColor={theme.muted} style={[styles.modalInput, styles.dateInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /><Pressable onPress={() => abrirCalendario('dia_edicao', diaEdicao, meses.indexOf(mesSelecionado) + 1)} style={[styles.calendarBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.calendarBtnText, { color: theme.text }]}>📅</Text></Pressable></View>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable onPress={fecharModalLancamento} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                  <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={salvarLancamento} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}> 
                  <Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </AppModal>

      <AppModal visible={modalCategoriasAberto} onClose={() => setModalCategoriasAberto(false)}>
        <View style={[styles.modalCard, styles.modalCardScrollHint, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Gerenciar categorias</Text>
            <View style={[styles.modalHintWrap, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalHintText, { color: theme.muted }]}>Deslize para ver mais ↓</Text></View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingBottom: 8 }}>
              {categoriasSaidas.map((categoria) => (
                <View key={categoria} style={[styles.categoryManageRow, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                  <Text style={[styles.categoryManageText, { color: theme.text }]} numberOfLines={1}>{categoria}</Text>
                  <View style={styles.categoryManageActions}>
                    <Pressable onPress={() => abrirModalEditarCategoria(categoria)} style={[styles.manageMiniBtn, { backgroundColor: theme.card, borderColor: theme.border }]}><Text style={[styles.manageMiniBtnText, { color: theme.text }]}>✎</Text></Pressable>
                    <Pressable onPress={() => abrirConfirmacaoExclusao('categoria', categoria, categoria)} style={[styles.manageMiniBtn, { backgroundColor: theme.card, borderColor: theme.border }]}><Text style={[styles.manageMiniBtnText, { color: theme.red }]}>×</Text></Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setModalCategoriasAberto(false)} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.modalActionText, { color: theme.white }]}>Fechar</Text></Pressable>
            </View>
          </View>
      </AppModal>

      <AppModal visible={modalCategoriaNomeAberto} onClose={fecharModalCategoriaNome}>
        <View style={[styles.modalCard, styles.modalCardNewCategory, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{modoCategoria === 'nova' ? 'Nova categoria' : 'Renomear categoria'}</Text>
            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.muted }]}>Nome</Text>
              <TextInput value={categoriaDigitada} onChangeText={setCategoriaDigitada} placeholder='Digite o nome' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={fecharModalCategoriaNome} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text></Pressable>
              <Pressable onPress={salvarCategoria} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text></Pressable>
            </View>
          </View>
      </AppModal>

      <AppModal visible={modalAnotacaoAberto} onClose={fecharModalAnotacao}>
        <View style={[styles.modalCard, styles.modalCardNotesFixedFooter, styles.modalCardWithFixedFooter, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.modalContentFill}>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={[styles.modalScrollContent, styles.modalScrollContentWithFooter]}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps='always'
              nestedScrollEnabled
              scrollEnabled
            >
              <View style={styles.modalContentWrap}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{noteModalType === 'pix' ? 'Salvar Pix' : 'Salvar anotação'}</Text>
                {noteModalType === 'pix' ? (
                  <>
                    <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Nome</Text><TextInput value={pixNome} onChangeText={setPixNome} placeholder='Ex.: Mãe, João, fornecedor...' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
                    <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Chave Pix</Text><TextInput value={pixChave} onChangeText={setPixChave} placeholder='CPF, e-mail, telefone...' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
                    <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Observação</Text><TextInput value={pixObservacao} onChangeText={setPixObservacao} placeholder='Apelido, banco, detalhe...' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
                    <View style={styles.modalField}>
                      <View style={styles.linkFieldHeader}>
                        <Text style={[styles.modalLabel, { color: theme.muted }]}>Links</Text>
                        <Pressable onPress={() => adicionarCampoLink(setPixLinks)} style={[styles.smallActionBtn, styles.linkAddBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                          <Text style={[styles.smallActionBtnIcon, { color: theme.text }]}>＋</Text>
                        </Pressable>
                      </View>
                      {pixLinks.map((link, index) => (
                        <View key={`pix-link-${index}`} style={styles.linkInputRow}>
                          <TextInput value={link} onChangeText={(value) => atualizarCampoLink(setPixLinks, index, value)} placeholder='Cole um link aqui' placeholderTextColor={theme.muted} autoCapitalize='none' autoCorrect={false} keyboardType='url' style={[styles.modalInput, styles.linkInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
                          <Pressable onPress={() => removerCampoLink(setPixLinks, index)} style={[styles.linkRemoveBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                            <Text style={[styles.linkRemoveBtnText, { color: theme.red }]}>×</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Título</Text><TextInput value={notaTitulo} onChangeText={setNotaTitulo} placeholder='Digite o título' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
                    <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Conteúdo</Text><TextInput value={notaConteudo} onChangeText={setNotaConteudo} multiline scrollEnabled textAlignVertical='top' placeholder='Escreva sua anotação' placeholderTextColor={theme.muted} style={[styles.modalInput, styles.modalInputMultiline, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
                    <View style={styles.modalField}>
                      <View style={styles.linkFieldHeader}>
                        <Text style={[styles.modalLabel, { color: theme.muted }]}>Links</Text>
                        <Pressable onPress={() => adicionarCampoLink(setNotaLinks)} style={[styles.smallActionBtn, styles.linkAddBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                          <Text style={[styles.smallActionBtnIcon, { color: theme.text }]}>＋</Text>
                        </Pressable>
                      </View>
                      {notaLinks.map((link, index) => (
                        <View key={`nota-link-${index}`} style={styles.linkInputRow}>
                          <TextInput value={link} onChangeText={(value) => atualizarCampoLink(setNotaLinks, index, value)} placeholder='Cole um link aqui' placeholderTextColor={theme.muted} autoCapitalize='none' autoCorrect={false} keyboardType='url' style={[styles.modalInput, styles.linkInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
                          <Pressable onPress={() => removerCampoLink(setNotaLinks, index)} style={[styles.linkRemoveBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                            <Text style={[styles.linkRemoveBtnText, { color: theme.red }]}>×</Text>
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </ScrollView>

            <View style={[styles.modalActionsSticky, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
              <View style={styles.modalActions}>
                <Pressable onPress={fecharModalAnotacao} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text></Pressable>
                <Pressable onPress={salvarAnotacao} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text></Pressable>
              </View>
            </View>
          </View>
        </View>
      </AppModal>

      <AppModal visible={modalCartaoAberto} onClose={fecharModalCartao}>
        <View style={[styles.modalCard, styles.modalCardCartaoCompra, { backgroundColor: theme.card, borderColor: theme.border }]}> 
            <Text style={[styles.modalTitle, { color: theme.text }]}>{parcelaEditandoId ? 'Editar parcela' : 'Nova compra parcelada'}</Text>
            <>
                <View style={styles.modalField}>
                  <Text style={[styles.modalLabel, { color: theme.muted }]}>CARTÃO</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {cards.map((card) => (
                      <Pressable
                        key={card.id}
                        onPress={() => setSelectedCardId(card.id)}
                        style={[styles.filterPill, { backgroundColor: selectedCardId === card.id ? theme.primary : theme.cardSoft, borderColor: selectedCardId === card.id ? theme.primary : theme.border }]}
                      >
                        <Text style={[styles.filterPillText, { color: selectedCardId === card.id ? theme.white : theme.text }]}>{card.nome}</Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
                <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Descrição</Text><TextInput value={novaParcelaDescricao} onChangeText={setNovaParcelaDescricao} placeholder='Ex.: tênis, curso...' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
                <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Valor total da compra</Text><TextInput value={novaParcelaValor} onChangeText={(value) => handleMaskedMoneyInput(value, setNovaParcelaValor)} keyboardType='number-pad' inputMode='numeric' placeholder='R$ 0,00' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
                <View style={[styles.modalField, styles.totalParcelasField, styles.totalParcelasFieldWide]}><Text style={[styles.modalLabel, styles.dualFieldLabel, { color: theme.muted }]}>Total de parcelas</Text><TextInput value={novaParcelaTotal} onChangeText={setNovaParcelaTotal} keyboardType='number-pad' inputMode='numeric' placeholder='Exemplo: 1' placeholderTextColor={theme.muted} style={[styles.modalInput, styles.totalParcelasInput, styles.totalParcelasInputWide, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
                {parcelaEditandoId ? <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Dia</Text><View style={styles.dateInputRow}><TextInput value={diaEdicao} onChangeText={setDiaEdicao} keyboardType='number-pad' inputMode='numeric' placeholder='1' placeholderTextColor={theme.muted} style={[styles.modalInput, styles.dateInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /><Pressable onPress={() => abrirCalendario('dia_edicao', diaEdicao, meses.indexOf(mesSelecionado) + 1)} style={[styles.calendarBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.calendarBtnText, { color: theme.text }]}>📅</Text></Pressable></View></View> : null}
              </>
            <View style={styles.modalActions}>
              <Pressable onPress={fecharModalCartao} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text></Pressable>
              <Pressable onPress={salvarCartaoOuParcela} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text></Pressable>
            </View>
          </View>
      </AppModal>

      <AppModal visible={modalAnoComparacaoAberto} onClose={() => setModalAnoComparacaoAberto(false)}>
        <View style={[styles.modalCard, styles.modalCardYear, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Selecionar ano</Text>
            {listaAnos.map((ano) => (
              <Pressable key={ano} style={[styles.modalOption, { backgroundColor: anoComparacao === ano ? theme.cardSoft : 'transparent', borderColor: theme.border }]} onPress={() => { setAnoComparacao(ano); setModalAnoComparacaoAberto(false) }}>
                <Text style={[styles.modalOptionText, { color: anoComparacao === ano ? theme.text : theme.muted }]}>{ano}</Text>
              </Pressable>
            ))}
          </View>
      </AppModal>

      <AppModal visible={modalMesComparacaoAberto} onClose={() => setModalMesComparacaoAberto(false)}>
        <View style={[styles.modalCard, styles.modalCardScrollHint, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Selecionar mês</Text>
            <View style={[styles.modalHintWrap, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalHintText, { color: theme.muted }]}>Deslize para ver mais ↓</Text></View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.monthModalScroll}>
              {meses.map((mes) => (
                <Pressable key={mes} style={[styles.modalOption, { backgroundColor: mesComparacao === mes ? theme.cardSoft : 'transparent', borderColor: theme.border }]} onPress={() => { setMesComparacao(mes); setModalMesComparacaoAberto(false) }}>
                  <Text style={[styles.modalOptionText, { color: mesComparacao === mes ? theme.text : theme.muted }]}>{mes}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
      </AppModal>

      <AppModal visible={modalFiltroAberto} onClose={() => setModalFiltroAberto(false)}>
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Filtro</Text>
            {opcoesFiltro.map((opcao) => (
              <Pressable key={opcao.value} style={[styles.modalOption, { backgroundColor: filtroSelecionado === opcao.value ? theme.cardSoft : 'transparent', borderColor: theme.border }]} onPress={() => aplicarFiltro(opcao.value)}>
                <Text style={[styles.modalOptionText, { color: filtroSelecionado === opcao.value ? theme.text : theme.muted }]}>{opcao.label}</Text>
              </Pressable>
            ))}
          </View>
      </AppModal>

      <AppModal visible={modalGerenciarCartoesAberto} onClose={() => setModalGerenciarCartoesAberto(false)}>
        <View style={[styles.modalCard, styles.modalCardManageCards, styles.modalCardScrollHint, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Gerenciar cartões</Text>
            <Text style={[styles.modalHintText, { color: theme.muted }]}>Edite ou exclua um cartão ↓</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={{ paddingBottom: 8, marginTop: 6 }}>
              {cards.map((card) => (
                <View key={card.id} style={[styles.categoryManageRow, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
                  <Text style={[styles.categoryManageText, { color: theme.text }]} numberOfLines={1}>{card.nome}</Text>
                  <View style={styles.categoryManageActions}>
                    <Pressable onPress={() => iniciarEdicaoCartao(card)} style={[styles.manageMiniBtn, { backgroundColor: theme.card, borderColor: theme.border }]}><Text style={[styles.manageMiniBtnText, { color: theme.text }]}>✎</Text></Pressable>
                    <Pressable onPress={() => abrirConfirmacaoExclusao('cartao', card.id, card.nome)} style={[styles.manageMiniBtn, { backgroundColor: theme.card, borderColor: theme.border }]}><Text style={[styles.manageMiniBtnText, { color: theme.red }]}>×</Text></Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={[styles.modalActions, styles.modalActionsLower]}>
              <Pressable onPress={() => setModalGerenciarCartoesAberto(false)} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
                <Text style={[styles.modalActionText, { color: theme.white }]}>Fechar</Text>
              </Pressable>
            </View>
          </View>
      </AppModal>

      <AppModal visible={modalNovoCartaoAberto} onClose={fecharModalNovoCartao}>
        <View style={[styles.modalCard, styles.modalCardNewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>{cartaoEditandoId ? 'Editar cartão' : 'Novo cartão'}</Text>
          <View style={styles.modalField}>
            <Text style={[styles.modalLabel, { color: theme.muted }]}>Nome do cartão</Text>
            <TextInput
              value={gerenciarCartaoNome}
              onChangeText={setGerenciarCartaoNome}
              placeholder='Ex.: Nubank, Inter...'
              placeholderTextColor={theme.muted}
              style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
            />
          </View>
          <View style={styles.modalField}>
            <Text style={[styles.modalLabel, { color: theme.muted }]}>Limite</Text>
            <TextInput value={gerenciarCartaoLimite} onChangeText={(value) => handleMaskedMoneyInput(value, setGerenciarCartaoLimite)} placeholder='R$ 0,00' placeholderTextColor={theme.muted} keyboardType='number-pad' inputMode='numeric' style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
          </View>
          <View style={styles.dualFieldRow}>
            <View style={[styles.modalField, styles.dualFieldItem]}>
              <Text style={[styles.modalLabel, { color: theme.muted }]}>Fechamento (dia/mês)</Text>
              <View style={styles.dateInputRow}><TextInput value={gerenciarCartaoFechamento} onChangeText={(value) => setGerenciarCartaoFechamento(formatarInputDiaMes(value))} placeholder='DD/MM' placeholderTextColor={theme.muted} keyboardType='number-pad' inputMode='numeric' style={[styles.modalInput, styles.dateInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /><Pressable onPress={() => abrirCalendario('cartao_fechamento', gerenciarCartaoFechamento, meses.indexOf(mesSelecionado) + 1)} style={[styles.calendarBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.calendarBtnText, { color: theme.text }]}>📅</Text></Pressable></View>
            </View>
            <View style={[styles.modalField, styles.dualFieldItem]}>
              <Text style={[styles.modalLabel, { color: theme.muted }]}>Vencimento (dia/mês)</Text>
              <View style={styles.dateInputRow}><TextInput value={gerenciarCartaoVencimento} onChangeText={(value) => setGerenciarCartaoVencimento(formatarInputDiaMes(value))} placeholder='DD/MM' placeholderTextColor={theme.muted} keyboardType='number-pad' inputMode='numeric' style={[styles.modalInput, styles.dateInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /><Pressable onPress={() => abrirCalendario('cartao_vencimento', gerenciarCartaoVencimento, Math.min(12, Math.max(1, (meses.indexOf(mesSelecionado) + 2))))} style={[styles.calendarBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.calendarBtnText, { color: theme.text }]}>📅</Text></Pressable></View>
            </View>
          </View>
          <View style={styles.modalActions}>
            <Pressable onPress={fecharModalNovoCartao} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={salvarCartaoGerenciado} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
              <Text style={[styles.modalActionText, { color: theme.white }]}>{cartaoEditandoId ? 'Salvar' : 'Adicionar'}</Text>
            </Pressable>
          </View>
        </View>
      </AppModal>



      <AppModal visible={!!linkPendenteConfirmacao} onClose={() => setLinkPendenteConfirmacao(null)}>
        <View style={[styles.modalCard, styles.modalCardConfirmDelete, styles.modalCardLinkConfirm, { backgroundColor: theme.card, borderColor: theme.borderStrong }]}> 
          <View style={[styles.linkConfirmIconWrap, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
            <Text style={[styles.linkConfirmIcon, { color: theme.primary }]}>↗</Text>
          </View>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Abrir link</Text>
          <Text style={[styles.emptyChartText, { color: theme.muted, marginBottom: 14, textAlign: 'center' }]}>Deseja abrir este link no navegador?</Text>
          <View style={[styles.linkPreviewCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
            <Text numberOfLines={3} style={[styles.linkPreviewText, { color: theme.primary }]}>{linkPendenteConfirmacao || ''}</Text>
          </View>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setLinkPendenteConfirmacao(null)} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={confirmarAberturaLink} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
              <Text style={[styles.modalActionText, { color: theme.white }]}>Abrir</Text>
            </Pressable>
          </View>
        </View>
      </AppModal>

      <AppModal visible={!!avisoAtualizacao} onClose={() => setAvisoAtualizacao(null)}>
        <View style={[styles.modalCard, styles.modalCardConfirmDelete, styles.modalCardUpdateNotice, { backgroundColor: theme.card, borderColor: theme.borderStrong }]}> 
          <View style={[styles.updateNoticeIconWrap, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
            <Text style={[styles.updateNoticeIcon, { color: theme.primary }]}>{avisoAtualizacao?.acao ? '↻' : '✓'}</Text>
          </View>
          <Text style={[styles.modalTitle, { color: theme.text, textAlign: 'center' }]}>{avisoAtualizacao?.titulo || 'Atualizações'}</Text>
          <Text style={[styles.emptyChartText, { color: theme.muted, marginBottom: 16, textAlign: 'center' }]}>{avisoAtualizacao?.mensagem || ''}</Text>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setAvisoAtualizacao(null)} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
              <Text style={[styles.modalActionText, { color: theme.text }]}>{avisoAtualizacao?.acao ? 'Depois' : 'Fechar'}</Text>
            </Pressable>
            {avisoAtualizacao?.acao ? (
              <Pressable onPress={executarAcaoAvisoAtualizacao} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}> 
                <Text style={[styles.modalActionText, { color: theme.white }]}>{avisoAtualizacao?.botaoPrincipal || 'Atualizar'}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </AppModal>

      <AppModal visible={!!confirmacaoExclusao} onClose={() => setConfirmacaoExclusao(null)}>
        <View style={[styles.modalCard, styles.modalCardNewCategory, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Confirmar exclusão</Text>
          <Text style={[styles.emptyChartText, { color: theme.muted, marginBottom: 16 }]}>
            Tem certeza que deseja excluir {confirmacaoExclusao?.label ? `"${confirmacaoExclusao.label}"` : 'este item'}?
          </Text>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setConfirmacaoExclusao(null)} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={confirmarExclusao} style={[styles.modalActionBtn, { backgroundColor: '#dc2626' }]}>
              <Text style={[styles.modalActionText, { color: theme.white }]}>Excluir</Text>
            </Pressable>
          </View>
        </View>
      </AppModal>


      <AppModal visible={modalConfiguracoesAberto} onClose={() => setModalConfiguracoesAberto(false)}>
        <View style={[styles.modalCard, styles.modalCardSettings, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ScrollView
            style={styles.modalSettingsScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps='handled'
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Perfil e configurações</Text>

            <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Premium Brazllet</Text>
              <Text style={[styles.rowItemMeta, { color: theme.muted, marginBottom: 10 }]}>{premiumStatusTexto}</Text>
              <View style={styles.settingsStack}>
                <Pressable onPress={irParaTelaPremium} style={[styles.settingsActionBtn, { backgroundColor: premiumValido ? theme.card : theme.primary, borderColor: premiumValido ? theme.border : theme.primary }]}> 
                  <Text style={[styles.settingsActionBtnText, { color: premiumValido ? theme.text : theme.white }]}>{premiumValido ? 'Gerenciar Premium' : 'Virar Premium'}</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.settingsCard, styles.profileSettingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Perfil</Text>

              <View style={styles.profilePreviewWrap}>
                <View style={[styles.profileBadgeLarge, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  {avatarEhImagem(avatarEditavel || avatarPerfil) ? (
                    <Image source={{ uri: avatarEditavel || avatarPerfil }} style={styles.profileBadgeImage} />
                  ) : (
                    <Text style={[styles.profileBadgeLargeText, { color: theme.text }]}>{iniciais || 'U'}</Text>
                  )}
                </View>
                <View style={styles.profilePreviewTextWrap}>
                  <Text style={[styles.profilePreviewTitle, { color: theme.text }]}>{nomeEditavel.trim() || nome || 'Seu perfil'}</Text>
                  <Text style={[styles.profilePreviewSub, { color: theme.muted }]}>{email || 'Sem e-mail'}</Text>
                  <Text style={[styles.profilePreviewHint, { color: theme.muted }]}>Ao escolher pela galeria, ajuste o recorte antes de confirmar.</Text>
                </View>
              </View>

              <View style={styles.profileFormBlock}>
                <Text style={[styles.profileLabel, { color: theme.muted }]}>Nome</Text>
                <TextInput value={nomeEditavel} onChangeText={setNomeEditavel} placeholder='Seu nome' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text, minHeight: 40 }]} />

                <Text style={[styles.profileLabel, { color: theme.muted, marginTop: 10 }]}>Foto de perfil</Text>
                <View style={styles.profilePhotoActions}>
                  <Pressable onPress={escolherImagemPerfil} style={[styles.settingsActionBtn, styles.profilePhotoButton, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.settingsActionBtnText, { color: theme.text }]}>Abrir galeria</Text>
                  </Pressable>
                </View>

                <Pressable onPress={salvarPerfil} style={[styles.settingsActionBtn, { backgroundColor: theme.primary, borderColor: theme.primary, marginTop: 12 }]}>
                  <Text style={[styles.settingsActionBtnText, { color: theme.white }]}>Salvar perfil</Text>
                </Pressable>

                <View style={[styles.profileInfoLine, { borderColor: theme.border }]}>
                  <Text style={[styles.profileLabel, { color: theme.muted, marginBottom: 0 }]}>Competência atual</Text>
                  <Text style={[styles.profileValue, { color: theme.text }]}>{mesSelecionado} de {anoSelecionado}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Tema</Text>
              <View style={[styles.settingsRow, { borderColor: theme.border, backgroundColor: 'transparent', marginTop: 4, borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowItemTitle, { color: theme.text }]}>Seguir tema do celular</Text>
                  <Text style={[styles.rowItemMeta, { color: theme.muted }]}>Quando ativo, o app alterna sozinho entre claro e escuro.</Text>
                </View>
                <Pressable onPress={alternarModoTemaSistema} style={[styles.switchTrack, { backgroundColor: themeMode === 'system' ? theme.primary : theme.card, borderColor: themeMode === 'system' ? theme.primary : theme.borderStrong }]}>
                  <View style={[styles.switchThumb, { backgroundColor: themeMode === 'system' ? theme.white : theme.muted }, themeMode === 'system' ? styles.switchThumbActive : null]} />
                </Pressable>
              </View>
            </View>

            <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Resumo</Text>
              <View style={styles.settingsInfoGrid}>
                <View style={[styles.settingsInfoPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.settingsInfoLabel, { color: theme.muted }]}>Pix</Text>
                  <Text style={[styles.settingsInfoValue, { color: theme.text }]}>{pixContacts.length}</Text>
                </View>
                <View style={[styles.settingsInfoPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.settingsInfoLabel, { color: theme.muted }]}>Notas</Text>
                  <Text style={[styles.settingsInfoValue, { color: theme.text }]}>{notes.length}</Text>
                </View>
                <View style={[styles.settingsInfoPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.settingsInfoLabel, { color: theme.muted }]}>Cartões</Text>
                  <Text style={[styles.settingsInfoValue, { color: theme.text }]}>{cards.length}</Text>
                </View>
                <View style={[styles.settingsInfoPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.settingsInfoLabel, { color: theme.muted }]}>Categorias</Text>
                  <Text style={[styles.settingsInfoValue, { color: theme.text }]}>{categoriasSaidas.length}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Backup e exportação</Text>
              <Text style={[styles.rowItemMeta, { color: theme.muted, marginBottom: 12 }]}>Exportações com identidade Brazllet, estrutura mais elegante e apresentação mais limpa.</Text>
              <View style={styles.exportGrid}>
                <Pressable onPress={() => abrirPreviewExportacao('csv')} style={[styles.exportPremiumBtn, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}> 
                  <View style={[styles.exportPremiumIcon, { backgroundColor: theme.backgroundSoft, borderColor: theme.border }]}><Text style={styles.exportPremiumIconText}>◫</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exportPremiumTitle, { color: theme.text }]}>{processandoArquivo === 'csv' ? 'Gerando CSV...' : 'Exportar CSV'}</Text>
                    <Text style={[styles.exportPremiumSub, { color: theme.muted }]}>Resumo estruturado com assinatura Brazllet.</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => abrirPreviewExportacao('excel')} style={[styles.exportPremiumBtn, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}> 
                  <View style={[styles.exportPremiumIcon, { backgroundColor: theme.backgroundSoft, borderColor: theme.border }]}><Text style={styles.exportPremiumIconText}>▦</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exportPremiumTitle, { color: theme.text }]}>{processandoArquivo === 'excel' ? 'Gerando Excel...' : 'Exportar Excel'}</Text>
                    <Text style={[styles.exportPremiumSub, { color: theme.muted }]}>Planilha organizada em abas por área.</Text>
                  </View>
                </Pressable>
                <Pressable onPress={() => abrirPreviewExportacao('pdf')} style={[styles.exportPremiumBtn, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}> 
                  <View style={[styles.exportPremiumIcon, { backgroundColor: theme.backgroundSoft, borderColor: theme.border }]}><Text style={styles.exportPremiumIconText}>▤</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exportPremiumTitle, { color: theme.text }]}>{processandoArquivo === 'pdf' ? 'Gerando PDF...' : 'Exportar PDF'}</Text>
                    <Text style={[styles.exportPremiumSub, { color: theme.muted }]}>Relatório visual completo para compartilhar.</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Importação</Text>
              <Text style={[styles.rowItemMeta, { color: theme.muted, marginBottom: 10 }]}>Importe arquivos CSV, Excel (.xlsx) ou OFX. PDF aparece na seleção, mas ainda não possui leitura automática nesta versão.</Text>
              <View style={styles.settingsStack}>
                <Pressable onPress={importarDadosBanco} style={[styles.exportPremiumBtn, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}> 
                  <View style={[styles.exportPremiumIcon, { backgroundColor: theme.backgroundSoft, borderColor: theme.border }]}><Text style={styles.exportPremiumIconText}>⇪</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.exportPremiumTitle, { color: theme.text }]}>{processandoArquivo === 'importar' ? 'Importando...' : 'Importar dados'}</Text>
                    <Text style={[styles.exportPremiumSub, { color: theme.muted }]}>PDF, CSV, Excel ou OFX com pré-visualização.</Text>
                  </View>
                </Pressable>
              </View>
            </View>

            <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
              <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Atualizações</Text>
              <Text style={[styles.rowItemMeta, { color: theme.muted, marginBottom: 12 }]}>Verifique se existe uma atualização rápida do app ou uma nova versão do APK disponível.</Text>
              <Pressable onPress={checarAtualizacoesManual} disabled={checandoAtualizacoes} style={[styles.updateCheckBoxBtn, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow, opacity: checandoAtualizacoes ? 0.65 : 1 }]}> 
                <Text style={[styles.updateCheckBoxText, { color: theme.text }]}>{checandoAtualizacoes ? 'Checando...' : 'Checar atualizações'}</Text>
              </Pressable>
            </View>

          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setModalConfiguracoesAberto(false)} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
              <Text style={[styles.modalActionText, { color: theme.white }]}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </AppModal>


      <AppModal visible={modalPreviewExportacaoAberto} onClose={() => setModalPreviewExportacaoAberto(false)}>
        <View style={[styles.modalCard, styles.modalCardExportPreview, styles.modalCardWithFixedFooter, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <View style={styles.modalContentFill}>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={[styles.modalScrollContent, styles.modalScrollContentWithFooter]}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps='handled'
            >
              <View style={styles.exportPreviewBodyWrap}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Prévia da exportação</Text>
                <Text style={[styles.rowItemMeta, { color: theme.muted, marginBottom: 10 }]}>Formato: {previewExportacaoTipo.toUpperCase()} · Arquivo {exportFileBaseName}</Text>

                {previewExportacaoTipo === 'pdf' ? (
                  <View style={styles.exportPreviewPdfWrap}>
                    {previewPdfGerando ? (
                      <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft, flex: 1 }]}> 
                        <ActivityIndicator size='large' color={theme.primary} />
                        <Text style={[styles.emptyChartText, { color: theme.muted, marginTop: 10 }]}>Gerando PDF real...</Text>
                      </View>
                    ) : previewPdfUri ? (
                      <View style={[styles.exportPreviewPdfCard, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}> 
                        <PdfPreview
  style={styles.exportPreviewPdfNative}
  uri={previewPdfUri}
/>
                      </View>
                    ) : (
                      <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft, flex: 1 }]}> 
                        <Text style={[styles.emptyChartText, { color: theme.muted }]}>Não foi possível abrir o PDF agora.</Text>
                      </View>
                    )}
                  </View>
                ) : previewExportacaoTipo === 'excel' ? (
                  <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border, marginTop: 0 }]}> 
                    <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Prévia da planilha</Text>
                    {['Resumo', 'Entradas', 'Fixos', 'Saídas', 'Categorias', 'Cartões'].map((sheet) => (
                      <View key={sheet} style={[styles.fullRowCard, { borderColor: theme.border, backgroundColor: theme.card }]}> 
                        <Text style={[styles.rowItemTitle, { color: theme.text }]}>{sheet}</Text>
                        <Text style={[styles.rowItemMeta, { color: theme.muted }]}>{sheet === 'Resumo' ? 'Indicadores do mês e saldo.' : `Aba ${sheet} pronta para exportação.`}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border, marginTop: 0 }]}> 
                    <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Prévia do CSV</Text>
                    <View style={[styles.fullRowCard, { borderColor: theme.border, backgroundColor: theme.card, marginTop: 0 }]}> 
                      <Text style={[styles.rowItemMeta, { color: theme.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]} selectable>{buildExportRows(';').slice(0, 1400)}</Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={[styles.modalActionsSticky, { borderTopColor: theme.border, backgroundColor: theme.card }]}> 
              <View style={styles.modalActions}>
                <Pressable onPress={() => setModalPreviewExportacaoAberto(false)} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalActionText, { color: theme.text }]}>Fechar</Text></Pressable>
                <Pressable onPress={confirmarExportacaoPreview} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.modalActionText, { color: theme.white }]}>{previewExportacaoTipo === 'pdf' ? 'Compartilhar PDF' : 'Exportar'}</Text></Pressable>
              </View>
            </View>
          </View>
        </View>
      </AppModal>

      <AppModal visible={modalPreviewImportacaoAberto} onClose={() => setModalPreviewImportacaoAberto(false)}>
        <View style={[styles.modalCard, styles.modalCardSettings, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Prévia da importação</Text>
          <Text style={[styles.rowItemMeta, { color: theme.muted, marginBottom: 10 }]}>Arquivo: {arquivoImportacaoNome}</Text>
          <ScrollView style={styles.modalSettingsScroll} showsVerticalScrollIndicator={false}>
            <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Entradas reconhecidas ({previewImportacao.entradas.length})</Text>
              {previewImportacao.entradas.length === 0 ? <Text style={[styles.rowItemMeta, { color: theme.muted }]}>Nenhuma entrada</Text> : previewImportacao.entradas.slice(0, 8).map((item) => <View key={item.id} style={[styles.fullRowCard, { borderColor: theme.border, backgroundColor: theme.card }]}><Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.nome}</Text><Text style={[styles.rowItemMeta, { color: theme.muted }]}>{formatarValorVisivel(item.valor)} · {formatarDiaMes(item.dia, chaveAtual)}</Text></View>)}
            </View>
            <View style={[styles.settingsCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Saídas reconhecidas ({previewImportacao.saidas.length})</Text>
              {previewImportacao.saidas.length === 0 ? <Text style={[styles.rowItemMeta, { color: theme.muted }]}>Nenhuma saída</Text> : previewImportacao.saidas.slice(0, 8).map((item) => <View key={item.id} style={[styles.fullRowCard, { borderColor: theme.border, backgroundColor: theme.card }]}><Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.nome}</Text><Text style={[styles.rowItemMeta, { color: theme.muted }]}>{item.categoria} · {formatarValorVisivel(item.valor)} · {formatarDiaMes(item.dia, chaveAtual)}</Text></View>)}
            </View>
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setModalPreviewImportacaoAberto(false)} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text></Pressable>
            <Pressable onPress={confirmarImportacaoPreview} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.modalActionText, { color: theme.white }]}>Importar</Text></Pressable>
          </View>
        </View>
      </AppModal>


      <AppModal visible={modalCompraDesejoAberto} onClose={limparModalCompraDesejo}>
        <View style={[styles.modalCard, styles.modalCardNotesFixedFooter, styles.modalCardWithFixedFooter, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.modalContentFill}>
            <ScrollView
              ref={shoppingModalScrollRef}
              style={styles.modalScroll}
              contentContainerStyle={[styles.modalScrollContent, styles.modalScrollContentWithFooter]}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps='always'
              nestedScrollEnabled
              scrollEnabled
            >
              <View style={styles.modalContentWrap}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{compraDesejoEditandoId ? 'Editar item' : 'Novo item para comprar'}</Text>

                <View style={styles.modalField} onLayout={(event) => registrarShoppingFieldLayout('nome', event.nativeEvent.layout.y)}>
                  <Text style={[styles.modalLabel, { color: theme.muted }]}>Nome do item</Text>
                  <TextInput value={compraDesejoNome} onChangeText={setCompraDesejoNome} onFocus={() => scrollShoppingModalToField('nome')} placeholder='Ex.: Fone, tênis, mochila...' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
                </View>

                <View style={styles.modalField} onLayout={(event) => registrarShoppingFieldLayout('preco', event.nativeEvent.layout.y)}>
                  <Text style={[styles.modalLabel, { color: theme.muted }]}>Preço encontrado</Text>
                  <TextInput value={compraDesejoPreco} onChangeText={(value) => handleMaskedMoneyInput(value, setCompraDesejoPreco)} onFocus={() => scrollShoppingModalToField('preco')} placeholder='R$ 0,00' placeholderTextColor={theme.muted} keyboardType='number-pad' inputMode='numeric' style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
                </View>

                <View style={styles.modalField} onLayout={(event) => registrarShoppingFieldLayout('loja', event.nativeEvent.layout.y)}>
                  <Text style={[styles.modalLabel, { color: theme.muted }]}>Loja</Text>
                  <TextInput value={compraDesejoLoja} onChangeText={setCompraDesejoLoja} onFocus={() => scrollShoppingModalToField('loja')} placeholder='Onde você encontrou' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
                </View>

                <View style={styles.modalField} onLayout={(event) => registrarShoppingFieldLayout('data', event.nativeEvent.layout.y)}>
                  <Text style={[styles.modalLabel, { color: theme.muted }]}>Data que viu</Text>
                  <View style={styles.dateInputRow}>
                    <TextInput value={compraDesejoData} onChangeText={(value) => setCompraDesejoData(formatarInputDiaMes(value))} onFocus={() => scrollShoppingModalToField('data')} keyboardType='number-pad' inputMode='numeric' placeholder='dd/mm' placeholderTextColor={theme.muted} style={[styles.modalInput, styles.dateInputField, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
                    <Pressable onPress={() => abrirCalendario('wish_data', compraDesejoData, meses.indexOf(mesSelecionado) + 1)} style={[styles.calendarBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                      <Text style={[styles.calendarBtnText, { color: theme.text }]}>📅</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.modalField} onLayout={(event) => registrarShoppingFieldLayout('obs', event.nativeEvent.layout.y)}>
                  <Text style={[styles.modalLabel, { color: theme.muted }]}>Observação</Text>
                  <TextInput value={compraDesejoObservacao} onChangeText={setCompraDesejoObservacao} onFocus={() => scrollShoppingModalToField('obs')} multiline scrollEnabled={false} textAlignVertical='top' placeholder='Cor, modelo, condição, prioridade...' placeholderTextColor={theme.muted} style={[styles.modalInput, styles.modalInputMultilineSmall, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} />
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalActionsSticky, { borderTopColor: theme.border, backgroundColor: theme.card }]}>
              <View style={styles.modalActions}>
                <Pressable onPress={limparModalCompraDesejo} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text></Pressable>
                <Pressable onPress={salvarCompraDesejo} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text></Pressable>
              </View>
            </View>
          </View>
        </View>
      </AppModal>

      <AppModal visible={modalObjetivoAberto} onClose={() => setModalObjetivoAberto(false)}>
        <View style={[styles.modalCard, styles.modalCardGoal, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>{objetivoEditandoId ? 'Editar objetivo' : 'Novo objetivo'}</Text>
          <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Título</Text><TextInput value={objetivoTitulo} onChangeText={setObjetivoTitulo} placeholder='Ex.: Reserva de emergência' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
          <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Valor alvo</Text><TextInput value={objetivoAlvo} onChangeText={(value) => handleMaskedMoneyInput(value, setObjetivoAlvo)} placeholder='R$ 0,00' placeholderTextColor={theme.muted} keyboardType='number-pad' inputMode='numeric' style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
          <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Quanto já tenho</Text><TextInput value={objetivoAtual} onChangeText={(value) => handleMaskedMoneyInput(value, setObjetivoAtual)} placeholder='R$ 0,00' placeholderTextColor={theme.muted} keyboardType='number-pad' inputMode='numeric' style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setModalObjetivoAberto(false)} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text></Pressable>
            <Pressable onPress={salvarObjetivo} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text></Pressable>
          </View>
        </View>
      </AppModal>

      <AppModal visible={modalCalendarioAberto} onClose={() => setModalCalendarioAberto(false)}>
        <View style={[styles.modalCard, styles.modalCardCalendar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Selecionar data</Text>
          <View style={styles.calendarSection}>
            <Text style={[styles.modalLabel, { color: theme.muted }]}>Mês</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {meses.map((mes, index) => {
                const mesNumero = index + 1
                const ativo = calendarMes === mesNumero
                return (
                  <Pressable key={mes} onPress={() => setCalendarMes(mesNumero)} style={[styles.filterPill, { backgroundColor: ativo ? theme.primary : theme.cardSoft, borderColor: ativo ? theme.primary : theme.border }]}>
                    <Text style={[styles.filterPillText, { color: ativo ? theme.white : theme.text }]}>{String(mesNumero).padStart(2, '0')}</Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
          <View style={styles.calendarSection}>
            <Text style={[styles.modalLabel, { color: theme.muted }]}>Dia</Text>
            <View style={styles.calendarDaysGrid}>
              {Array.from({ length: diasDisponiveisNoCalendario }, (_, index) => {
                const dia = index + 1
                const ativo = calendarDia === dia
                return (
                  <Pressable key={dia} onPress={() => setCalendarDia(dia)} style={[styles.calendarDayBtn, { backgroundColor: ativo ? theme.primary : theme.cardSoft, borderColor: ativo ? theme.primary : theme.border }]}>
                    <Text style={[styles.calendarDayText, { color: ativo ? theme.white : theme.text }]}>{String(dia).padStart(2, '0')}</Text>
                  </Pressable>
                )
              })}
            </View>
          </View>
          <Text style={[styles.rowItemMeta, { color: theme.muted, textAlign: 'center', marginTop: 6 }]}>Selecionado: {formatarDiaMesInput(calendarDia, calendarMes, anoSelecionado)}</Text>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setModalCalendarioAberto(false)} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text></Pressable>
            <Pressable onPress={confirmarCalendario} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.modalActionText, { color: theme.white }]}>Aplicar</Text></Pressable>
          </View>
        </View>
      </AppModal>

      <AppModal visible={modalPremiumBloqueioAberto} onClose={() => setModalPremiumBloqueioAberto(false)}>
        <View style={[styles.modalCard, styles.modalCardPremiumLock, { backgroundColor: theme.card, borderColor: theme.border }]}> 
          <View style={[styles.premiumLockGlow, { backgroundColor: theme.backgroundSoft, borderColor: theme.borderStrong }]}> 
            <Text style={styles.premiumLockGlowText}>✦</Text>
          </View>
          <Text style={[styles.modalTitle, styles.modalTitleCentered, { color: theme.text }]}>{premiumBloqueioTitulo}</Text>
          <Text style={[styles.premiumLockDescription, { color: theme.muted }]}>{premiumBloqueioMensagem}</Text>
          <View style={[styles.premiumLockInfoCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
            <Text style={[styles.premiumLockInfoTitle, { color: theme.text }]}>Acesso premium</Text>
            <Text style={[styles.premiumLockInfoText, { color: theme.muted }]}>{premiumStatusTexto}</Text>
          </View>
          <View style={styles.modalActions}>
            <Pressable onPress={() => setModalPremiumBloqueioAberto(false)} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.modalActionText, { color: theme.text }]}>Agora não</Text>
            </Pressable>
            <Pressable onPress={irParaTelaPremium} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
              <Text style={[styles.modalActionText, { color: theme.white }]}>Virar Premium</Text>
            </Pressable>
          </View>
        </View>
      </AppModal>

      {sincronizando && (
        <View style={[styles.syncBadge, { backgroundColor: temaEscuro ? '#1e293b' : '#dbeafe', borderColor: temaEscuro ? '#334155' : '#bfdbfe', bottom: 115 + Math.max(insets.bottom, 10) }]}>
          <Text style={[styles.syncBadgeText, { color: temaEscuro ? '#93c5fd' : '#2563eb' }]}>Salvando...</Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  sectionSpacer: { height: 12 },
  sectionSpacerLarge: { height: 18 },
  safeArea: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 16, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 14, paddingTop: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  homePremiumBadgeWrap: {
    alignSelf: 'flex-start',
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 12,
  },

  homePremiumBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 46, height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarText: { fontSize: 16, fontWeight: '900' },
  themeButton: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  valueToggleButton: { marginLeft: -2 },
  themeButtonText: { fontSize: 17, fontWeight: '900', lineHeight: 17 },
  logoutButton: { minHeight: 40, paddingHorizontal: 14, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  logoutButtonText: { fontSize: 13, fontWeight: '800' },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  subtitle: { fontSize: 12, lineHeight: 16, textAlign: 'center', marginTop: 3, marginBottom: 12 },
  brandHeroCard: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 22, paddingLeft: 14, paddingRight: 14, paddingVertical: 12, borderWidth: 1, marginBottom: 12, shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  brandHeroAccentLine: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: 999 },
  brandHeroIconShell: { width: 62, height: 62, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  brandHeroIcon: { width: 44, height: 44 },
  brandHeroTextWrap: { flex: 1, justifyContent: 'center' },
  brandHeroBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, marginBottom: 6 },
  brandHeroEyebrow: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1 },
  brandHeroTitle: { fontSize: 16, fontWeight: '900', marginBottom: 3 },
  brandHeroSub: { fontSize: 12, fontWeight: '700', lineHeight: 16, maxWidth: '94%' },
  selectorGroup: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  dropdownButton: { flex: 1, minHeight: 58, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, justifyContent: 'center' },
  dropdownLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3, textAlign: 'center' },
  dropdownValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dropdownValue: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  dropdownIcon: { fontSize: 15, fontWeight: '900', marginTop: -2 },
  salaryCard: { borderRadius: 20, padding: 14, borderWidth: 1, marginBottom: 8 },
  cardLabelCentered: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, textAlign: 'center' },
  salaryRowCentered: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  salaryValueCentered: { fontSize: 25, fontWeight: '900', textAlign: 'center' },
  salaryInput: { minWidth: 170, fontSize: 24, fontWeight: '900', textAlign: 'center', paddingVertical: 0 },
  salaryEditButton: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  salaryEditText: { fontSize: 16, fontWeight: '800' },
  balanceCard: { borderRadius: 20, padding: 14, borderWidth: 1, marginBottom: 8 },
  balanceValueCentered: { fontSize: 27, fontWeight: '900', textAlign: 'center' },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  summaryCard: { flex: 1, minWidth: '47%', borderRadius: 18, padding: 12, borderWidth: 1 },
  smallLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4, textAlign: 'center' },
  smallValue: { fontSize: 16, fontWeight: '900', textAlign: 'center' },
  chartCard: { borderRadius: 20, padding: 12, borderWidth: 1, marginTop: 14 },
  investmentCard: { borderRadius: 24, padding: 16, borderWidth: 1, marginTop: 14, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  investmentHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  investmentEyebrow: { fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 6 },
  investmentTitle: { fontSize: 18, fontWeight: '900' },
  investmentSub: { marginTop: 4, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  investmentBadge: { minWidth: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
  investmentBadgeText: { fontSize: 18, fontWeight: '900' },
  investmentBaseRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  investmentBaseChip: { flex: 1, minHeight: 44, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  investmentBaseChipText: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
  investmentHighlightCard: { borderRadius: 20, borderWidth: 1, padding: 14, marginBottom: 14 },
  investmentHighlightTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  investmentHighlightLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  investmentHighlightValue: { fontSize: 24, fontWeight: '900' },
  investmentMiniLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  investmentMiniValue: { fontSize: 14, fontWeight: '800' },
  investmentHelperText: { marginTop: 10, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  investmentSliderBlock: { marginTop: 2 },
  investmentSliderHeader: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: 10 },
  investmentSliderLabel: { fontSize: 14, fontWeight: '800' },
  investmentSliderValue: { fontSize: 16, fontWeight: '900' },
  investmentSliderMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 2 },
  investmentSliderMetaText: { fontSize: 11, fontWeight: '800' },
  investmentTrackOuter: { position: 'relative', borderWidth: 1, borderRadius: 22, minHeight: 64, justifyContent: 'center', paddingHorizontal: 14, marginTop: 2 },
  investmentTrackBar: { height: 8, borderRadius: 999 },
  investmentTrackFill: { position: 'absolute', left: 14, top: '50%', marginTop: -4, height: 8, borderRadius: 999 },
  investmentTrackTick: { position: 'absolute', top: 20, width: 2, height: 24, marginLeft: -1, borderRadius: 999, opacity: 0.6 },
  investmentKnob: { position: 'absolute', top: '50%', marginTop: -14, marginLeft: -14, width: 28, height: 28, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  investmentKnobInner: { width: 10, height: 10, borderRadius: 999 },
  investmentSliderScale: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  investmentScalePill: { minWidth: 46, paddingHorizontal: 10, minHeight: 34, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  investmentScalePillText: { fontSize: 11, fontWeight: '800' },
  investmentManualField: { marginTop: 10, width: '44%', minWidth: 140, maxWidth: 175, alignSelf: 'flex-start' },
  investmentManualInput: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '800' },
  investmentManualInputRow: { flexDirection: 'row', alignItems: 'center', width: '100%', gap: 8 },
  investmentManualSuffix: { fontSize: 16, fontWeight: '900' },
  modalInputMultilineSmall: { minHeight: 96, maxHeight: 118, textAlignVertical: 'top', paddingTop: 12, paddingBottom: 12 },
  chartTitle: { fontSize: 15, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  chartContentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  pieWrapSide: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  emptyChart: { borderRadius: 14, padding: 16, alignItems: 'center', justifyContent: 'center' },
  emptyChartText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  pieCenterLabel: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pieCenterSmall: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  pieCenterValue: { fontSize: 11, fontWeight: '900', textAlign: 'center', paddingHorizontal: 20 },
  legendSideList: { flex: 1, gap: 6 },
  legendSideItem: { borderRadius: 14, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  legendSideTop: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  legendDot: { width: 10, height: 10, borderRadius: 999 },
  legendCategory: { fontSize: 12, fontWeight: '800', flex: 1 },
  legendPercentInline: { fontSize: 11, fontWeight: '700', marginHorizontal: 6 },
  legendValueInline: { fontSize: 11, fontWeight: '900', maxWidth: 88, textAlign: 'right' },
  manageCard: { borderRadius: 20, padding: 12, borderWidth: 1, marginTop: 14 },
  manageHeader: { marginBottom: 8 },
  manageHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 },
  manageTitle: { fontSize: 15, fontWeight: '900', flexShrink: 1 },
  manageSub: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  sectionBlockTitle: { fontSize: 14, fontWeight: '900', marginBottom: 10 },
  fullRowCard: { position: 'relative', overflow: 'hidden', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, marginTop: 8, width: '100%' },
  fullRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  fullRowTitleWrap: { flex: 1, minWidth: 0 },
  rowItemTitle: { fontSize: 14, fontWeight: '800', lineHeight: 18 },
  rowItemMeta: { fontSize: 11, fontWeight: '700', marginTop: 3 },
  linkListWrap: { marginTop: 6, gap: 6 },
  linkChip: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: 'rgba(212,170,76,0.12)', borderWidth: 1 },
  linkChipText: { fontSize: 11, fontWeight: '800' },
  linkFieldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  linkInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  linkInputField: { flex: 1, minHeight: 44 },
  linkAddBtn: { minWidth: 30, minHeight: 30, paddingHorizontal: 0, borderRadius: 10 },
  linkRemoveBtn: { width: 34, height: 34, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  linkRemoveBtnText: { fontSize: 18, fontWeight: '900', lineHeight: 18 },
  modalCardLinkConfirm: { alignItems: 'center', justifyContent: 'center' },
  linkConfirmIconWrap: { width: 52, height: 52, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  linkConfirmIcon: { fontSize: 24, fontWeight: '900' },
  linkPreviewCard: { width: '100%', borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, marginBottom: 2 },
  linkPreviewText: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
  modalCardUpdateNotice: { alignItems: 'center', justifyContent: 'center' },
  updateNoticeIconWrap: { width: 58, height: 58, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  updateNoticeIcon: { fontSize: 26, fontWeight: '900' },
  rowItemValue: { fontSize: 13, fontWeight: '900' },
  inlineActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap', justifyContent: 'center', maxWidth: '62%' },
  statusBtn: { minHeight: 28, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  statusBtnText: { fontSize: 10, fontWeight: '900', color: '#ffffff' },
  iconBtn: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  iconBtnText: { fontSize: 18, fontWeight: '900', lineHeight: 18 },
  categoryToolbar: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  smallActionBtn: { minHeight: 34, minWidth: 34, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  smallActionBtnText: { fontSize: 11, fontWeight: '800' },
  smallActionBtnIcon: { fontSize: 14, fontWeight: '900' },
  filterRow: { gap: 8, paddingRight: 10 },
  filterPill: { minHeight: 34, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  filterPillText: { fontSize: 12, fontWeight: '800' },
  variableSwitchRow: { flexDirection: 'row', gap: 8, marginTop: 2, marginBottom: 12 },
  variableSwitchBtn: { flex: 1, minHeight: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  variableSwitchBtnText: { fontSize: 13, fontWeight: '900' },
  sectionCardSpaced: { marginTop: 18 },
  quickActionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickActionBtn: { width: '47%', minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quickActionBtnText: { fontSize: 14, fontWeight: '900' },
  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateInputField: { flex: 1, minWidth: 0 },
  calendarBtn: { width: 42, minHeight: 46, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calendarBtnText: { fontSize: 18 },
  modalCardCalendar: { paddingBottom: 45, minHeight: 470 },
  calendarSection: { marginBottom: 10 },
  calendarDaysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  calendarDayBtn: { width: '14%', minWidth: 40, minHeight: 40, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  calendarDayText: { fontSize: 12, fontWeight: '800' },
  bottomBar: { position: 'absolute', left: 12, right: 12, minHeight: 64, borderRadius: 30, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 6, shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  bottomHalf: { flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', gap: 4, paddingBottom: 0 },
  bottomDivider: { width: 1, height: 20, borderRadius: 999, opacity: 0.9 },
  bottomItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  bottomItemText: { fontSize: 12, fontWeight: '900', lineHeight: 16, textTransform: 'uppercase', letterSpacing: 0.6 },
  plusButton: { width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 0, alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  plusButtonText: { fontSize: 23, fontWeight: '900', lineHeight: 24, marginTop: -1 },
  syncBadge: { position: 'absolute', right: 18, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  syncBadgeText: { fontSize: 12, fontWeight: '800' },
  modalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  modalCenterWrap: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdropTouch: { ...StyleSheet.absoluteFillObject },
  modalKeyboardWrap: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
  width: '84%',
  maxWidth: 420,
  maxHeight: '94%',
  alignSelf: 'center',
  borderRadius: 28,
  paddingHorizontal: 18,
  paddingTop: 18,
  paddingBottom: 30,
  borderWidth: 1,
  overflow: 'hidden',
  shadowColor: '#000000',
  shadowOpacity: 0.18,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 12 },
  elevation: 14,
},
  modalCardExtraBottom: { paddingBottom: 36 },
  modalCardExtraTall: { paddingBottom: 40 },
  modalCardNotesFixedFooter: { width: '88%', maxWidth: 440, minHeight: 430, maxHeight: '86%', paddingBottom: 0 },
  modalCardYear: { paddingBottom: 34 },
  modalCardScrollHint: { paddingBottom: 30 },
  modalCardConfirmDelete: { width: '78%', maxWidth: 360, minHeight: 180, paddingBottom: 20 },
  modalCardGoal: { paddingBottom: 40, minHeight: 270 },
  modalCardLancamentoEntrada: { paddingBottom: 0, minHeight: 378, maxHeight: '86%' },
  modalCardEditEntrada: { paddingBottom: 0, minHeight: 330, maxHeight: '86%' },
  modalCardEditFixo: { paddingBottom: 35, minHeight: 330 },
  modalCardEditSaida: { paddingBottom: 0, minHeight: 440, maxHeight: '86%' },
  modalCardLancamentoSaida: { paddingBottom: 0, minHeight: 470, maxHeight: '86%' },
  modalCardLancamentoSaidaKeyboard: { paddingBottom: 0, minHeight: 336, maxHeight: '68%' },
  modalCardManageCards: { paddingBottom: 24, minHeight: 360 },
  modalCardNewCard: { paddingBottom: 30, minHeight: 225 },
  modalCardNewCategory: { paddingBottom: 20, minHeight: 204 },
  modalCardLancamentoParcela: { paddingBottom: 0, minHeight: 500, maxHeight: '86%' },
  modalCardLancamentoParcelaKeyboard: { paddingBottom: 0, minHeight: 336, maxHeight: '68%' },
  modalCardCartaoCompra: { paddingBottom: 36, minHeight: 430 },
  modalQuickActions: { paddingBottom: 26 },
  modalTitle: { fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 14 },
  modalHintWrap: { alignSelf: 'center', minHeight: 28, borderRadius: 999, paddingHorizontal: 12, marginBottom: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalOption: { minHeight: 38, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 5, paddingHorizontal: 12 },
  modalOptionText: { fontSize: 15, fontWeight: '800' },
  monthModalScroll: { maxHeight: 340 },
  switchRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  switchRowThree: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  switchBtnThree: { width: '48%', minHeight: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  switchBtn: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  switchBtnText: { fontSize: 13, fontWeight: '900' },
  modalField: { marginBottom: 10 },
  modalLabel: { fontSize: 12, fontWeight: '800', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalInput: { minHeight: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, fontWeight: '700' },
  modalInputMultiline: { minHeight: 120, maxHeight: 140, textAlignVertical: 'top', paddingTop: 12, paddingBottom: 12 },
  noteInputWrap: { position: 'relative' },
  noteInputWithIndicator: { paddingRight: 26 },
  noteScrollIndicatorTrack: { position: 'absolute', right: 10, top: 14, bottom: 14, width: 4, borderRadius: 999, overflow: 'hidden' },
  noteScrollIndicatorThumb: { position: 'absolute', top: 0, width: 4, height: 34, borderRadius: 999 },
  dualFieldRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  dualFieldItem: { flex: 1 },
  dualFieldLabel: { textAlign: 'center' },
  totalParcelasField: { alignItems: 'center' },
  totalParcelasFieldWide: { alignItems: 'stretch' },
  totalParcelasInput: { width: '48%', minWidth: 120, textAlign: 'center' },
  totalParcelasInputWide: { width: '100%', minWidth: 0 },
  modalHintText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12, width: '100%' },
  modalActionsLower: { marginTop: 16 },
  modalActionsFixedFooter: { marginTop: 12, paddingTop: 10 },
  modalActionBtn: { flex: 1, minHeight: 42, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalActionText: { fontSize: 13, fontWeight: '900' },
  categoryScroll: { maxHeight: 340 },
  categoryManageRow: { borderRadius: 14, padding: 10, borderWidth: 1, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryManageText: { fontSize: 14, fontWeight: '800', flex: 1, marginRight: 10 },
  categoryManageActions: { flexDirection: 'row', gap: 8 },
  manageMiniBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  manageMiniBtnText: { fontSize: 14, fontWeight: '900' },
  deleteCardButton: { marginTop: 12, minHeight: 42, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  deleteCardButtonText: { fontSize: 12, fontWeight: '800' },
  compareSelectorRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginTop: 10,
},  modalContentWrap: {
    width: '100%',
  },
  modalFormScroll: { width: '100%', maxHeight: 320 },
  modalFormScrollContent: { paddingBottom: 4 },

  modalScroll: {
    width: '100%',
  },

  modalScrollContent: {
    paddingBottom: 4,
    flexGrow: 1,
  },

compareArrow: {
  width: 40,
  height: 40,
  borderRadius: 999,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
},

compareArrowText: {
  fontSize: 24,
  fontWeight: '800',
  lineHeight: 24,
},

comparePill: {
  flex: 1,
  minHeight: 42,
  borderRadius: 14,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  paddingHorizontal: 10,
},

comparePillText: {
  fontSize: 14,
  fontWeight: '800',
},

comparisonGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
},

compareMetaText: {
  fontSize: 11,
  fontWeight: '700',
  marginTop: 4,
  textAlign: 'center',
},

settingsRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 10,
  borderRadius: 16,
  borderWidth: 1,
  paddingHorizontal: 2,
  paddingVertical: 2,
},

switchTrack: {
  width: 58,
  height: 34,
  borderRadius: 999,
  padding: 3,
  justifyContent: 'center',
  borderWidth: 1,
},

switchThumb: {
  width: 26,
  height: 26,
  borderRadius: 999,
},

switchThumbActive: {
  alignSelf: 'flex-end',
},

  compareBarTrack: {
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    overflow: 'hidden',
  },
  compareBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  searchWrap: {
    marginTop: 10,
    marginBottom: 10,
  },
  modalContentFill: { flex: 1 },
  modalScrollContentWithFooter: { paddingBottom: 26 },
  modalCardWithFixedFooter: { overflow: 'hidden' },
  modalActionsSticky: { borderTopWidth: 1, paddingTop: 1, paddingHorizontal: 2, paddingBottom: 10 },
  searchHighlightCard: { overflow: 'visible' },
  searchHighlightOverlay: { position: 'absolute', top: -1, right: -1, bottom: -1, left: -1, borderWidth: 2, borderRadius: 16, opacity: 0, backgroundColor: 'transparent' },

  searchInput: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '700',
  },
  cardLimitPercent: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 6,
  },
  modalCardSettings: {
    paddingBottom: 24,
    minHeight: Platform.OS === 'web' ? 0 : 520,
    maxHeight: '86%',
  },
  modalSettingsScroll: {
    flex: 1,
    width: '100%',
    minHeight: 0,
  },
  settingsSectionTitle: { fontSize: 13, fontWeight: '900', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  settingsCard: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderRadius: 18, padding: 14, marginTop: 10 },
  settingsStack: { gap: 10 },
  profileHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileSettingsCard: { padding: 16 },
  profileBadge: { width: 48, height: 48, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  profileBadgeText: { fontSize: 16, fontWeight: '900' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 999 },
  profileBadgeImage: { width: '100%', height: '100%', borderRadius: 999 },
  profileBadgeLarge: { width: 78, height: 78, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'hidden' },
  profileBadgeLargeText: { fontSize: 24, fontWeight: '900' },
  profilePreviewWrap: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profilePreviewTextWrap: { flex: 1 },
  profilePreviewTitle: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
  profilePreviewSub: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  profilePreviewHint: { fontSize: 11, fontWeight: '700', lineHeight: 15 },
  profileFormBlock: { marginTop: 14 },
  profilePhotoActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' },
  profilePhotoButton: { flex: 1, minWidth: 132, borderRadius: 12 },
  profileInfoLine: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  profileLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  profileValue: { fontSize: 14, fontWeight: '800' },
  settingsInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  settingsInfoPill: { width: '48%', borderWidth: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10 },
  settingsInfoLabel: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 4, textAlign: 'center' },
  settingsInfoValue: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
  settingsActionBtn: { minHeight: 42, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  settingsActionBtnText: { fontSize: 13, fontWeight: '900' },
  updateCheckBoxBtn: { minHeight: 46, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  updateCheckBoxText: { fontSize: 13, fontWeight: '900' },
  exportGrid: { gap: 10 },
  exportPremiumBtn: { minHeight: 76, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  exportPremiumIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  exportPremiumIconText: { fontSize: 20, fontWeight: '900', color: '#b08b33' },
  exportPremiumTitle: { fontSize: 15, fontWeight: '900', marginBottom: 2 },
  exportPremiumSub: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
  modalCardExportPreview: { width: '90%', maxWidth: 560, minHeight: 460, maxHeight: '86%', paddingBottom: 0 },
  exportPreviewBodyWrap: { flexGrow: 1 },
  exportPreviewPdfWrap: { minHeight: 420, height: 420, marginBottom: 0 },
  exportPreviewPdfCard: { flex: 1, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  exportPreviewPdfNative: { flex: 1, width: '100%' },

  modalCardPremiumLock: { width: '84%', maxWidth: 390, minHeight: 258, paddingBottom: 35 },
  modalTitleCentered: { textAlign: 'center' },
  premiumLockGlow: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  premiumLockGlowText: { fontSize: 24, fontWeight: '900', color: '#b08b33' },
  premiumLockDescription: { fontSize: 14, fontWeight: '700', lineHeight: 20, textAlign: 'center', marginBottom: 14 },
  premiumLockInfoCard: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 14 },
  premiumLockInfoTitle: { fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6, textAlign: 'center' },
  premiumLockInfoText: { fontSize: 13, fontWeight: '700', lineHeight: 18, textAlign: 'center' },
  premiumBlockerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingBottom: 112,
    backgroundColor: 'rgba(2, 8, 6, 0.22)',
  },
  premiumBlockerCard: {
    width: '92%',
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  premiumBlockerEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#d4a93e',
    marginBottom: 6,
  },
  premiumBlockerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 6,
    textAlign: 'center',
  },
  premiumBlockerText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 18,
  },
})
