import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  AppState,
  InteractionManager,
  Alert,
  Animated,
  Linking,
  Keyboard,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type DimensionValue,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import * as Updates from 'expo-updates'
import * as XLSX from 'xlsx'
import { router } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import PdfPreview from '../components/PdfPreview'
import AppModal from '../components/common/AppModal'
import * as Haptics from 'expo-haptics'
import BottomTabItem from '../components/home/BottomTabItem'
import Calendario from '../components/common/Calendario'
import { gerarPdfUri } from '../src/utils/export/pdfDoc'
import { parseCsv, parseOfx, parseTabela } from '../src/utils/importar/parse'
import type { TransacaoImportada } from '../src/utils/importar/parse'
import AppHeader from '../components/home/AppHeader'
import BuscaGlobal from '../components/home/BuscaGlobal'
import PeriodoSelector from '../components/home/PeriodoSelector'
import HomeSkeleton from '../components/home/HomeSkeleton'
import PressableScale from '../components/common/motion/PressableScale'
import AppearIn from '../components/common/motion/AppearIn'
import SelectionModal from '../components/modals/SelectionModal'
import CategoryNameModal from '../components/modals/CategoryNameModal'
import NoteModal, { emptyNoteFormValues } from '../components/modals/NoteModal'
import type { NoteFormValues } from '../components/modals/NoteModal'
import ShoppingWishModal, { emptyShoppingWishValues } from '../components/modals/ShoppingWishModal'
import type { ShoppingWishFormValues } from '../components/modals/ShoppingWishModal'
import ConfirmDeleteModal from '../components/modals/ConfirmDeleteModal'
import SettingsModal from '../components/modals/SettingsModal'
import LaunchModal, { emptyLaunchFormValues } from '../components/modals/LaunchModal'
import type { LaunchFormValues } from '../components/modals/LaunchModal'
import CardPurchaseModal, { emptyCardPurchaseValues } from '../components/modals/CardPurchaseModal'
import type { CardPurchaseFormValues } from '../components/modals/CardPurchaseModal'
import ManageCardsModal from '../components/modals/ManageCardsModal'
import CardEditorModal, { emptyCardEditorValues } from '../components/modals/CardEditorModal'
import type { CardEditorFormValues } from '../components/modals/CardEditorModal'
import ManageCategoriesModal from '../components/modals/ManageCategoriesModal'
import ImageCropModal from '../components/modals/ImageCropModal'
import { supabase } from '../src/lib/supabase'
import { FinanceProvider, useFinance } from '../src/context/FinanceContext'
import { uploadAvatar } from '../src/utils/avatar'
import {
  baixarCsv,
  baixarUrl,
  baixarXlsx,
  escolherArquivo,
  lerArquivoComoArrayBuffer,
  lerArquivoComoTexto,
} from '../src/utils/download'
import { styles } from '../src/theme/homeStyles'
import FixoTab from '../components/tabs/FixoTab'
import VariavelTab from '../components/tabs/VariavelTab'
import CartaoTab from '../components/tabs/CartaoTab'
import ResumoCards from '../components/home/ResumoCards'
import GraficoCategoriasCard from '../components/home/GraficoCategoriasCard'
import ComprasDesejoCard from '../components/home/ComprasDesejoCard'
import NotasPixCard from '../components/home/NotasPixCard'
import {
  categoriaEhImportado,
  categoriasPadrao,
  extrairLinksTexto,
  normalizarAppData,
  normalizarCategoriaNome,
  sanitizarListaLinks,
} from '../src/data/appData'
import {
  digitsToMoneyString,
  formatarMoeda,
  formatarNumeroBR,
  formatarValorInput,
  handleMaskedMoneyInput,
  moneyStringToNumber,
} from '../src/utils/currency'
import {
  formatarDiaMes,
  formatarDiaMesInput,
  formatarInputDiaMes,
  getDiasNoMes,
  meses,
  parseDiaMesInput,
} from '../src/utils/dates'
import { addMonthsToCompetencia, competenciaMaiorOuIgual, listaAnosAtual, resolverMesComRecorrentes } from '../src/utils/competency'
import {
  buildExportRows,
  buildExportWorkbook,
  montarNomeArquivoExportacao,
} from '../src/utils/export'
import type { ExportData } from '../src/utils/export'
import Icon from '../components/common/Icon'
import type {
  EntradaItem, SaidaItem, FixoItem, NoteItem, PixItem, CardInstallment, CardItem,
  ShoppingWishItem, DadosMes, BancoDeDados, GlobalData,
  AppData, PremiumEntitlement, AbaInferior, SortMode, SettingsThemeMode,
  TipoVariavelTab, TipoFormularioLancamento, QuickAddType, ModoModal, ModoCategoria,
  NoteModalMode, SearchResult, CardModalMode, SortTarget, DeleteTarget, CalendarTarget,
} from './types'

// Paleta categorica do grafico: tons dessaturados ancorados no verde e no
// dourado da marca, escolhidos para manter contraste nos dois temas.
const coresPizza = ['#2FA765', '#E0A82E', '#4A90C4', '#E0685F', '#8B6FC7', '#2FA79A', '#E08A3C', '#8AA23C']

function calcularCompetenciaInicialPorFechamento(
  chaveBase: string,
  diaCompra: number,
  fechamento?: number | null
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

function HomeScreenContent() {
  const insets = useSafeAreaInsets()
  const dataAtual = new Date()
  const { height: screenHeight } = useWindowDimensions()
  const anoAtual = dataAtual.getFullYear()
  const mesAtualIndex = dataAtual.getMonth()
  // Dados, perfil, premium e tema agora vem do FinanceProvider.
  const {
    appData,
    setAppData,
    carregando,
    sincronizando,
    usuarioId,
    nome,
    setNome,
    email,
    avatarPerfil,
    setAvatarPerfil,
    premiumExpiresAt,
    premiumLoading,
    premiumValido,
    recarregarStatusPremium,
    theme,
    temaEscuro,
    alternarTema,
  } = useFinance()
  const [modalPremiumBloqueioAberto, setModalPremiumBloqueioAberto] = useState(false)
  const [premiumBloqueioTitulo, setPremiumBloqueioTitulo] = useState('Modo somente leitura')
  const [premiumBloqueioMensagem, setPremiumBloqueioMensagem] = useState('Você pode visualizar sua organização financeira, mas adicionar, editar, importar, exportar ou excluir informações exige o Brazllet Premium.')
  const [nomeEditavel, setNomeEditavel] = useState('')
  const [avatarEditavel, setAvatarEditavel] = useState('💼')
  const [modalCropAberto, setModalCropAberto] = useState(false)
  const [imagemParaCortar, setImagemParaCortar] = useState<string | null>(null)
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual)
  const [mesSelecionado, setMesSelecionado] = useState(meses[mesAtualIndex])

  // Navegacao mes a mes: vira o ano sozinho ao passar de dezembro/janeiro.
  const irParaMesVizinho = (passo: -1 | 1) => {
    const indice = meses.indexOf(mesSelecionado)
    const alvo = indice + passo
    if (alvo < 0) {
      setMesSelecionado(meses[11])
      setAnoSelecionado((ano) => ano - 1)
    } else if (alvo > 11) {
      setMesSelecionado(meses[0])
      setAnoSelecionado((ano) => ano + 1)
    } else {
      setMesSelecionado(meses[alvo])
    }
  }

  const voltarParaMesAtual = () => {
    setAnoSelecionado(anoAtual)
    setMesSelecionado(meses[mesAtualIndex])
  }

  const ehMesCorrente = anoSelecionado === anoAtual && mesSelecionado === meses[mesAtualIndex]
  const listaAnos = useMemo(() => listaAnosComDados(appData.bancoDeDados), [appData.bancoDeDados])
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
  // O campo de nome da categoria vive dentro do CategoryNameModal.
  const [categoriaFormKey, setCategoriaFormKey] = useState(0)
  const [categoriaInicial, setCategoriaInicial] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('Todas')
  const [itemEditandoId, setItemEditandoId] = useState<string | null>(null)
  const [diaEdicao, setDiaEdicao] = useState('1')
  // Os campos do formulario de lancamento agora vivem dentro do LaunchModal.
  // Aqui guardamos so os valores iniciais e uma chave que forca o modal a
  // remontar (e portanto reiniciar os campos) sempre que ele e reaberto.
  const [launchFormKey, setLaunchFormKey] = useState(0)
  const [launchInitialValues, setLaunchInitialValues] = useState<LaunchFormValues>(() => emptyLaunchFormValues(categoriasPadrao[0]))
  const [cardFormKey, setCardFormKey] = useState(0)
  const [cardInitialValues, setCardInitialValues] = useState<CardPurchaseFormValues>(() => emptyCardPurchaseValues())

  const [noteModalType, setNoteModalType] = useState<NoteModalMode>('pix')
  const [modalAnotacaoAberto, setModalAnotacaoAberto] = useState(false)
  // Campos de Pix/anotacao vivem dentro do NoteModal.
  const [noteFormKey, setNoteFormKey] = useState(0)
  const [noteInitialValues, setNoteInitialValues] = useState<NoteFormValues>(() => emptyNoteFormValues())
  const [linkPendenteConfirmacao, setLinkPendenteConfirmacao] = useState<string | null>(null)
  const [itemNotaEditandoId, setItemNotaEditandoId] = useState<string | null>(null)
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null)
  const [keyboardAberto, setKeyboardAberto] = useState(false)
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null)

  const [modalCartaoAberto, setModalCartaoAberto] = useState(false)
  const [modalNovoCartaoAberto, setModalNovoCartaoAberto] = useState(false)
  const [cardModalType, setCardModalType] = useState<CardModalMode>('card')
  const [novoCartaoNome, setNovoCartaoNome] = useState('')
  const [parcelaEditandoId, setParcelaEditandoId] = useState<string | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [sortFixo, setSortFixo] = useState<SortMode>('recentes')
  const [sortEntradas, setSortEntradas] = useState<SortMode>('recentes')
  const [sortSaidas, setSortSaidas] = useState<SortMode>('recentes')
  const [sortNotas, setSortNotas] = useState<SortMode>('recentes')
  const [sortCartao, setSortCartao] = useState<SortMode>('recentes')
  const [modalConfiguracoesAberto, setModalConfiguracoesAberto] = useState(false)
  const [modalGerenciarCartoesAberto, setModalGerenciarCartoesAberto] = useState(false)
  // Nome e limite vivem dentro do CardEditorModal; as datas ficam aqui
  // porque sao definidas pelo modal de calendario.
  const [cardEditorFormKey, setCardEditorFormKey] = useState(0)
  const [cardEditorInitialValues, setCardEditorInitialValues] = useState<CardEditorFormValues>(() => emptyCardEditorValues())
  const [gerenciarCartaoFechamento, setGerenciarCartaoFechamento] = useState('')
  const [gerenciarCartaoVencimento, setGerenciarCartaoVencimento] = useState('')
  const [cartaoEditandoId, setCartaoEditandoId] = useState<string | null>(null)
  const [modalFiltroAberto, setModalFiltroAberto] = useState(false)
  const [alvoFiltro, setAlvoFiltro] = useState<SortTarget>('fixo')
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState<{ type: DeleteTarget; id: string; label: string } | null>(null)
  const [processandoArquivo, setProcessandoArquivo] = useState<'csv' | 'excel' | 'pdf' | 'importar' | null>(null)
  const [modalPreviewExportacaoAberto, setModalPreviewExportacaoAberto] = useState(false)
  const [previewExportacaoTipo, setPreviewExportacaoTipo] = useState<'csv' | 'excel' | 'pdf'>('pdf')
  const [previewPdfUri, setPreviewPdfUri] = useState('')
  const [previewPdfGerando, setPreviewPdfGerando] = useState(false)
  const [buscaGlobal, setBuscaGlobal] = useState('')
  const [modalCompraDesejoAberto, setModalCompraDesejoAberto] = useState(false)
  const [compraDesejoEditandoId, setCompraDesejoEditandoId] = useState<string | null>(null)
  // Campos da compra desejada vivem dentro do ShoppingWishModal.
  // A data fica aqui porque e compartilhada com o modal de calendario.
  const [wishFormKey, setWishFormKey] = useState(0)
  const [wishInitialValues, setWishInitialValues] = useState<ShoppingWishFormValues>(() => emptyShoppingWishValues())
  const [compraDesejoData, setCompraDesejoData] = useState('')
  const [compraDesejoComprado, setCompraDesejoComprado] = useState(false)
  const [modalPreviewImportacaoAberto, setModalPreviewImportacaoAberto] = useState(false)
  const [arquivoImportacaoNome, setArquivoImportacaoNome] = useState('')
  const [previewImportacao, setPreviewImportacao] = useState<{ entradas: EntradaItem[]; saidas: SaidaItem[] }>({ entradas: [], saidas: [] })
  const [modalCalendarioAberto, setModalCalendarioAberto] = useState(false)
  const [backupsDisponiveis, setBackupsDisponiveis] = useState<{ id: string; created_at: string }[]>([])
  const [carregandoBackups, setCarregandoBackups] = useState(false)
  const [restaurandoBackupId, setRestaurandoBackupId] = useState<string | null>(null)
  const [avisoAtualizacao, setAvisoAtualizacao] = useState<{
    titulo: string
    mensagem: string
    acao?: 'reload' | 'apk'
    apkUrl?: string
    botaoPrincipal?: string
  } | null>(null)
  // O react-native-web cria uma div por Modal no fim do body, e quem foi
  // montado por ultimo fica por cima. Os modais de formulario remontam ao
  // abrir (por causa do key que reinicia os campos), entao o calendario
  // precisa remontar tambem — senao abre atras de quem o chamou.
  const [calendarioFormKey, setCalendarioFormKey] = useState(0)
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>('dia_edicao')
  const [calendarDia, setCalendarDia] = useState(1)
  const [calendarMes, setCalendarMes] = useState(mesAtualIndex + 1)

  const mainScrollRef = useRef<ScrollView | null>(null)
  const itemLayoutsRef = useRef<Record<string, { y: number; height: number }>>({})
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const highlightFadeAnim = useRef(new Animated.Value(0)).current
  const salaryInputRef = useRef<TextInput | null>(null)
  const mainScrollYRef = useRef(0)
  const appStateRef = useRef(AppState.currentState)
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

  const formatarValorVisivel = (valor: number) => (ocultarValores ? '••••••' : formatarMoeda(valor))
  const blurFocusedInput = () => {
    try {
      const inputState = TextInput.State as any
      const focused = inputState?.currentlyFocusedInput?.()
      if (focused && inputState?.blurTextInput) {
        inputState.blurTextInput(focused)
      } else {
        Keyboard.dismiss()
      }
    } catch (error) {
      console.warn('[teclado] Falha ao tentar fechar o teclado pelo campo focado:', error)
      Keyboard.dismiss()
    }
  }

  const registrarLayoutItem = (id: string, y: number, height = 0) => {
    itemLayoutsRef.current[id] = { y, height }
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
    modalCompraDesejoAberto,
    modalPreviewImportacaoAberto,
    modalPreviewExportacaoAberto,
    modalCalendarioAberto,
    confirmacaoExclusao,
  ])

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
    if (modalConfiguracoesAberto) {
      carregarBackupsAutomaticos()
    }
  }, [modalConfiguracoesAberto])

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
    }
  }, [carregando, anoAtual, mesAtualIndex])

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
    const mesVazio: DadosMes = {
      salario: 0,
      entradas: [],
      fixo: [],
      saidas: [],
      categoriasSaidas: [...categoriasPadrao],
    }
    return resolverMesComRecorrentes(bancoDeDados, chaveAtual, mesVazio)
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
    setCardEditorInitialValues(emptyCardEditorValues())
    setCardEditorFormKey((prev) => prev + 1)
    setGerenciarCartaoFechamento('')
    setGerenciarCartaoVencimento('')
    setModalNovoCartaoAberto(true)
  }

  const iniciarEdicaoCartao = (card: CardItem) => {
    setCartaoEditandoId(card.id)
    setCardEditorInitialValues({ name: card.nome, limit: formatarValorInput(card.limite || 0) })
    setCardEditorFormKey((prev) => prev + 1)
    setGerenciarCartaoFechamento(formatarDiaMesInput(card.fechamento, card.fechamentoMes || (meses.indexOf(mesSelecionado) + 1), anoSelecionado))
    setGerenciarCartaoVencimento(formatarDiaMesInput(card.vencimento, card.vencimentoMes || ((meses.indexOf(mesSelecionado) + 1) % 12) + 1, anoSelecionado))
    setModalNovoCartaoAberto(true)
  }

  const fecharModalNovoCartao = () => {
    setModalNovoCartaoAberto(false)
    setGerenciarCartaoFechamento('')
    setGerenciarCartaoVencimento('')
    setCartaoEditandoId(null)
  }

  const salvarCartaoGerenciado = (values: CardEditorFormValues) => {
    if (!values.name.trim()) return

    const limite = moneyStringToNumber(values.limit)
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
            card.id === cartaoEditandoId ? { ...card, nome: values.name.trim(), limite, fechamento, fechamentoMes, vencimento, vencimentoMes } : card
          ),
        },
      }))
    } else {
      const novoId = `card-${Date.now()}`
      setAppData((prev) => ({
        ...prev,
        global: {
          ...prev.global,
          cards: [...prev.global.cards, { id: novoId, nome: values.name.trim(), limite, fechamento, fechamentoMes, vencimento, vencimentoMes, parcelas: [] }],
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

  const [enviandoAvatar, setEnviandoAvatar] = useState(false)

  /**
   * Sobe a imagem para o Supabase Storage e devolve a URL publica.
   * Antes a foto so era copiada para uma pasta local do aparelho, e o
   * caminho salvo deixava de valer em outra instalacao.
   */
  const enviarImagemPerfil = async (uri: string) => {
    if (!usuarioId) {
      Alert.alert('Erro', 'Não foi possível identificar sua conta para salvar a foto.')
      return null
    }
    try {
      setEnviandoAvatar(true)
      return await uploadAvatar(usuarioId, uri)
    } catch (error) {
      console.error('[perfil] Falha ao enviar a foto de perfil:', error)
      Alert.alert('Erro', 'Não foi possível enviar sua foto agora. Tente novamente.')
      return null
    } finally {
      setEnviandoAvatar(false)
    }
  }

  const escolherImagemPerfil = async () => {
    if (enviandoAvatar) return
    try {
      if (Platform.OS === 'web') {
        // Na web não existe "permissão de galeria" nem recorte nativo — o próprio
        // seletor de arquivo do navegador já cuida disso. O recorte é feito
        // depois, na tela de ajuste (ImageCropModal).
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1,
        })
        if (result.canceled) return
        const uri = result.assets?.[0]?.uri
        if (!uri) return
        setImagemParaCortar(uri)
        setModalCropAberto(true)
        return
      }

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
      const avatarUri = await enviarImagemPerfil(uri)
      if (avatarUri) setAvatarEditavel(avatarUri)
    } catch (error) {
      console.error('[perfil] Falha ao escolher imagem de perfil:', error)
      abrirBloqueioPremium('Não foi possível abrir a galeria agora. Tente novamente em alguns instantes.', 'Imagem de perfil')
    }
  }

  const confirmarRecorteImagemWeb = async (dataUrl: string) => {
    if (enviandoAvatar) return
    const avatarUri = await enviarImagemPerfil(dataUrl)
    if (avatarUri) setAvatarEditavel(avatarUri)
    setModalCropAberto(false)
    setImagemParaCortar(null)
  }

  const cancelarRecorteImagemWeb = () => {
    setModalCropAberto(false)
    setImagemParaCortar(null)
  }

  const avatarEhImagem = (valor?: string) => Boolean(valor && (valor.startsWith('http') || valor.startsWith('data:')))

  const abrirCalendario = (target: CalendarTarget, rawValue?: string, fallbackMonth?: number) => {
    setCalendarioFormKey((prev) => prev + 1)
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
    } catch (error) {
      console.error('[link] Falha ao abrir link externo:', error)
      Alert.alert('Erro', 'Não foi possível abrir o link agora.')
    } finally {
      setLinkPendenteConfirmacao(null)
    }
  }

  const carregarBackupsAutomaticos = async () => {
    try {
      setCarregandoBackups(true)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user) return

      const { data, error } = await supabase
        .from('financial_data_backups')
        .select('id, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(15)

      if (error) {
        console.error('[backup] Falha ao carregar lista de backups:', error)
        return
      }

      setBackupsDisponiveis(data || [])
    } catch (error) {
      console.error('[backup] Falha ao carregar backups:', error)
    } finally {
      setCarregandoBackups(false)
    }
  }

  const restaurarBackupAutomatico = async (backupId: string) => {
    try {
      setRestaurandoBackupId(backupId)
      const { data, error } = await supabase
        .from('financial_data_backups')
        .select('data')
        .eq('id', backupId)
        .maybeSingle()

      if (error || !data?.data) {
        console.error('[backup] Falha ao buscar conteúdo do backup:', error)
        Alert.alert('Erro', 'Não foi possível carregar esse backup agora.')
        return
      }

      const normalizado = normalizarAppData(data.data)
      setAppData(normalizado)
      Alert.alert('Backup restaurado', 'Seus dados foram restaurados para o momento selecionado.')
    } catch (error) {
      console.error('[backup] Falha ao restaurar backup:', error)
      Alert.alert('Erro', 'Não foi possível restaurar esse backup agora.')
    } finally {
      setRestaurandoBackupId(null)
    }
  }

  const confirmarRestaurarBackup = (backupId: string, dataFormatada: string) => {
    Alert.alert(
      'Restaurar backup',
      `Isso vai substituir seus dados atuais pelos dados salvos em ${dataFormatada}. Essa ação não pode ser desfeita. Deseja continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Restaurar', style: 'destructive', onPress: () => restaurarBackupAutomatico(backupId) },
      ]
    )
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
          <PressableScale key={link} onPress={() => abrirLinkComConfirmacao(link)} style={[styles.linkChip, { borderColor: theme.borderStrong }]}>
            <Text numberOfLines={1} style={[styles.linkChipText, { color: theme.primary }]}>{link}</Text>
          </PressableScale>
        ))}
      </View>
    )
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

  const limparModalCompraDesejo = () => {
    setModalCompraDesejoAberto(false)
    setCompraDesejoEditandoId(null)
    setCompraDesejoData('')
    setCompraDesejoComprado(false)
  }

  const abrirNovaCompraDesejo = (item?: ShoppingWishItem) => {
    setCompraDesejoEditandoId(item?.id || null)
    setWishInitialValues({
      nome: item?.nome || '',
      preco: formatarValorInput(item?.precoAtual || 0),
      loja: item?.loja || '',
      observacao: item?.observacao || '',
    })
    setWishFormKey((prev) => prev + 1)
    setCompraDesejoData(item?.dataVista || '')
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

  const salvarCompraDesejo = (values: ShoppingWishFormValues) => {
    if (!values.nome.trim()) return
    const precoAtual = moneyStringToNumber(values.preco)
    const itemAnterior = compraDesejoEditandoId
      ? comprasDesejo.find((item) => item.id === compraDesejoEditandoId)
      : null
    const payload: ShoppingWishItem = {
      id: compraDesejoEditandoId || `wish-${Date.now()}`,
      nome: values.nome.trim(),
      precoAtual,
      loja: values.loja.trim(),
      dataVista: compraDesejoData.trim(),
      observacao: values.observacao.trim(),
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

  const calcularCompetenciaInicialParcela = (fechamento?: number | null) => {
    const hoje = new Date()
    return calcularCompetenciaInicialPorFechamento(chaveAtual, hoje.getDate(), fechamento)
  }

  const handleSair = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
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

  // Pacote unico entregue aos geradores de CSV, Excel e PDF (src/utils/export).
  const dadosExportacao: ExportData = useMemo(
    () => ({
      resumo: resumoExportacaoMes,
      entradas,
      fixos,
      saidas,
      categorias: categoriasExportacaoMes,
      parcelas: parcelasExportacaoMes,
    }),
    [resumoExportacaoMes, entradas, fixos, saidas, categoriasExportacaoMes, parcelasExportacaoMes]
  )

  const exportFileBaseName = montarNomeArquivoExportacao(mesSelecionado, anoSelecionado)

  const exportarCsv = async () => {
    try {
      setProcessandoArquivo('csv')
      const csv = buildExportRows(dadosExportacao, ';')
      baixarCsv(csv, `${exportFileBaseName}.csv`)
    } catch (error) {
      console.error('[exportar] Falha ao exportar CSV:', error)
      Alert.alert('Erro', 'Não foi possível exportar o arquivo CSV.')
    } finally {
      setProcessandoArquivo(null)
    }
  }

  const exportarExcel = async () => {
    try {
      setProcessandoArquivo('excel')
      const wb = buildExportWorkbook(dadosExportacao)
      const dados = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
      baixarXlsx(dados, `${exportFileBaseName}.xlsx`)
    } catch (error) {
      console.error('[exportar] Falha ao exportar Excel:', error)
      Alert.alert('Erro', 'Não foi possível exportar o arquivo Excel (.xlsx).')
    } finally {
      setProcessandoArquivo(null)
    }
  }

  const gerarArquivoPdf = async () => gerarPdfUri(dadosExportacao)

  const exportarPdf = async () => {
    try {
      setProcessandoArquivo('pdf')
      const finalUri = await gerarArquivoPdf()
      baixarUrl(finalUri, `${exportFileBaseName}.pdf`)
    } catch (error) {
      console.error('[pdf] Falha ao exportar PDF:', error)
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
      } catch (error) {
        console.error('[pdf] Falha ao gerar prévia do PDF:', error)
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

  /**
   * Converte as transacoes lidas do arquivo nos lancamentos do app.
   *
   * A leitura em si (CSV com aspas, Excel, OFX, formatos de data e de valor)
   * mora em src/utils/importar, que e testavel isoladamente.
   */
  const converterTransacoes = (transacoes: TransacaoImportada[]) => {
    const importedEntradas: EntradaItem[] = []
    const importedSaidas: SaidaItem[] = []
    const carimbo = Date.now()

    transacoes.forEach((t, indice) => {
      const diaSeguro = Math.min(31, Math.max(1, Number(t.dia || 1)))

      if (t.valor >= 0) {
        importedEntradas.push({
          id: `entrada-import-${carimbo}-${indice}`,
          nome: t.descricao,
          valor: t.valor,
          dia: diaSeguro,
        })
      } else {
        importedSaidas.push({
          id: `saida-import-${carimbo}-${indice}`,
          nome: t.descricao,
          valor: Math.abs(t.valor),
          categoria: categorizarAutomaticamente(t.descricao),
          dia: diaSeguro,
        })
      }
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
      const arquivo = await escolherArquivo('.csv,.ofx,.xls,.xlsx,.txt,text/csv,application/vnd.ms-excel')
      if (!arquivo) return

      const lowerName = String(arquivo.name || '').toLowerCase()
      if (lowerName.endsWith('.pdf')) {
        Alert.alert('Importação PDF', 'A importação automática de PDF ainda não está disponível nesta versão.')
        return
      }

      let importedEntradas: EntradaItem[] = []
      let importedSaidas: SaidaItem[] = []

      if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
        // A planilha vira matriz de celulas direto, sem passar por texto: o
        // caminho antigo juntava as celulas com ';' e corrompia qualquer
        // descricao que ja tivesse ponto e virgula.
        const buffer = await lerArquivoComoArrayBuffer(arquivo)
        const wb = XLSX.read(buffer, { type: 'array' })
        const planilha = wb.Sheets[wb.SheetNames[0]]
        const matriz = XLSX.utils.sheet_to_json<(string | number)[]>(planilha, {
          header: 1,
          defval: '',
          raw: true,
        })
        ;({ importedEntradas, importedSaidas } = converterTransacoes(parseTabela(matriz)))
      } else {
        const textContent = await lerArquivoComoTexto(arquivo)
        const transacoes = lowerName.endsWith('.ofx')
          ? parseOfx(textContent)
          : parseTabela(parseCsv(textContent))
        ;({ importedEntradas, importedSaidas } = converterTransacoes(transacoes))
      }
      if (!importedEntradas.length && !importedSaidas.length) {
        Alert.alert('Importação', 'Nenhum lançamento reconhecido no arquivo.')
        return
      }
      setArquivoImportacaoNome(arquivo.name || 'arquivo importado')
      setPreviewImportacao({ entradas: importedEntradas, saidas: importedSaidas })
      setModalPreviewImportacaoAberto(true)
    } catch (error) {
      console.error('[importar] Falha ao importar arquivo:', error)
      Alert.alert('Erro', 'Não foi possível importar o arquivo. Confira se o formato é CSV, OFX ou XLSX.')
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

    setLaunchInitialValues(emptyLaunchFormValues(categoriasSaidas[0] || 'Mercado'))
    setLaunchFormKey((prev) => prev + 1)
    setDiaEdicao(String(new Date().getDate()))
    setParcelaEditandoId(null)
    setModalLancamentoAberto(true)
  }

  const copiarPix = async (id: string, chave: string) => {
    try {
      await Clipboard.setStringAsync(chave)
      setCopiedPixId(id)
      setTimeout(() => setCopiedPixId((prev) => (prev === id ? null : prev)), 1500)
    } catch (error) {
      console.warn('[pix] Falha ao copiar chave PIX:', error)
    }
  }

  const abrirEditarFixo = (item: FixoItem) => {
    setModoModalLancamento('editar')
    setItemEditandoId(item.id)
    setTipoFormularioLancamento('fixo')
    setLaunchInitialValues({
      ...emptyLaunchFormValues(categoriasSaidas[0] || 'Mercado'),
      name: item.nome,
      value: formatarValorInput(item.valor),
    })
    setLaunchFormKey((prev) => prev + 1)
    setDiaEdicao(String(item.dia || 1))
    setModalLancamentoAberto(true)
  }

  const abrirEditarEntrada = (item: EntradaItem) => {
    setModoModalLancamento('editar')
    setItemEditandoId(item.id)
    setTipoVariavelTab('entrada')
    setTipoFormularioLancamento('entrada')
    setLaunchInitialValues({
      ...emptyLaunchFormValues(categoriasSaidas[0] || 'Mercado'),
      name: item.nome,
      value: formatarValorInput(item.valor),
    })
    setLaunchFormKey((prev) => prev + 1)
    setDiaEdicao(String(item.dia || 1))
    setModalLancamentoAberto(true)
  }

  const abrirEditarSaida = (item: SaidaItem) => {
    setModoModalLancamento('editar')
    setItemEditandoId(item.id)
    setTipoVariavelTab('saida')
    setTipoFormularioLancamento('saida')
    setLaunchInitialValues({
      ...emptyLaunchFormValues(item.categoria || categoriasSaidas[0] || 'Mercado'),
      name: item.nome,
      value: formatarValorInput(item.valor),
    })
    setLaunchFormKey((prev) => prev + 1)
    setDiaEdicao(String(item.dia || 1))
    setModalLancamentoAberto(true)
  }

  const fecharModalLancamento = () => {
    setModalLancamentoAberto(false)
    setModoModalLancamento('novo')
    setItemEditandoId(null)
    setDiaEdicao('1')
  }

  const salvarNovaParcelaDentroDoLancamento = (values: LaunchFormValues) => {
    if (!selectedCardId || !values.installmentDescription.trim()) return

    const valorTotalCompra = moneyStringToNumber(values.installmentValue)
    const totalParcelas = Math.max(1, Number(values.installmentTotal || 1))
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
              descricao: values.installmentDescription.trim(),
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

  const salvarLancamento = (values: LaunchFormValues) => {
    if (tipoFormularioLancamento === 'parcela') {
      salvarNovaParcelaDentroDoLancamento(values)
      return
    }

    if (!values.name.trim()) return
    const valorConvertido = moneyStringToNumber(values.value)

    if (modoModalLancamento === 'novo') {
      const diaLancamento = Math.min(31, Math.max(1, Number(diaEdicao || new Date().getDate())))
      const base = { id: `${tipoFormularioLancamento}-${Date.now()}`, nome: values.name.trim(), valor: valorConvertido, dia: diaLancamento }

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
                ? [...bancoAtualizado[chaveAtual].saidas, { ...base, categoria: values.selectedCategory || categoriasSaidas[0] || 'Mercado' }]
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
                      ? { ...item, nome: values.name.trim(), valor: valorConvertido, categoria: values.selectedCategory, dia: Math.min(31, Math.max(1, Number(diaEdicao || item.dia || 1))) }
                      : item
                  )
                : prev.bancoDeDados[chaveAtual].saidas,
            entradas:
              tipoFormularioLancamento === 'entrada'
                ? prev.bancoDeDados[chaveAtual].entradas.map((item) =>
                    item.id === itemEditandoId ? { ...item, nome: values.name.trim(), valor: valorConvertido, dia: Math.min(31, Math.max(1, Number(diaEdicao || item.dia || 1))) } : item
                  )
                : prev.bancoDeDados[chaveAtual].entradas,
            fixo:
              tipoFormularioLancamento === 'fixo'
                ? prev.bancoDeDados[chaveAtual].fixo.map((item) =>
                    item.id === itemEditandoId ? { ...item, nome: values.name.trim(), valor: valorConvertido, dia: Math.min(31, Math.max(1, Number(diaEdicao || item.dia || 1))) } : item
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
    setCategoriaInicial('')
    setCategoriaFormKey((prev) => prev + 1)
    setModalCategoriaNomeAberto(true)
  }

  const abrirModalEditarCategoria = (categoria: string) => {
    setModoCategoria('editar')
    setCategoriaOriginal(categoria)
    setCategoriaInicial(categoria)
    setCategoriaFormKey((prev) => prev + 1)
    setModalCategoriaNomeAberto(true)
  }

  const fecharModalCategoriaNome = () => {
    setModalCategoriaNomeAberto(false)
    setModoCategoria('nova')
    setCategoriaOriginal('')
    setCategoriaInicial('')
  }

  const salvarCategoria = (valorDigitado: string) => {
    const nomeNova = valorDigitado.trim()
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
    setNoteInitialValues(emptyNoteFormValues())
    setNoteFormKey((prev) => prev + 1)
    setModalAnotacaoAberto(true)
  }

  const abrirEditarPix = (item: PixItem) => {
    setItemNotaEditandoId(item.id)
    setNoteModalType('pix')
    setNoteInitialValues({
      ...emptyNoteFormValues(),
      pixNome: item.nome,
      pixChave: item.chave,
      pixObservacao: item.observacao,
      pixLinks: item.links?.length ? item.links : [''],
    })
    setNoteFormKey((prev) => prev + 1)
    setModalAnotacaoAberto(true)
  }

  const abrirEditarNota = (item: NoteItem) => {
    setItemNotaEditandoId(item.id)
    setNoteModalType('nota')
    setNoteInitialValues({
      ...emptyNoteFormValues(),
      notaTitulo: item.titulo,
      notaConteudo: item.conteudo,
      notaLinks: item.links?.length ? item.links : [''],
    })
    setNoteFormKey((prev) => prev + 1)
    setModalAnotacaoAberto(true)
  }

  const fecharModalAnotacao = () => {
    setModalAnotacaoAberto(false)
    setItemNotaEditandoId(null)
  }

  const salvarAnotacao = (values: NoteFormValues) => {
    if (noteModalType === 'pix') {
      if (!values.pixNome.trim() || !values.pixChave.trim()) return
      const linksPixSanitizados = sanitizarListaLinks(values.pixLinks)
      setAppData((prev) => ({
        ...prev,
        global: {
          ...prev.global,
          pixContacts: itemNotaEditandoId
            ? prev.global.pixContacts.map((item) =>
                item.id === itemNotaEditandoId
                  ? { ...item, nome: values.pixNome.trim(), chave: values.pixChave.trim(), observacao: values.pixObservacao.trim(), links: linksPixSanitizados }
                  : item
              )
            : [
                ...prev.global.pixContacts,
                { id: `pix-${Date.now()}`, nome: values.pixNome.trim(), chave: values.pixChave.trim(), observacao: values.pixObservacao.trim(), links: linksPixSanitizados },
              ],
        },
      }))
    } else {
      if (!values.notaTitulo.trim()) return
      const linksNotaSanitizados = sanitizarListaLinks(values.notaLinks)
      setAppData((prev) => ({
        ...prev,
        global: {
          ...prev.global,
          notes: itemNotaEditandoId
            ? prev.global.notes.map((item) =>
                item.id === itemNotaEditandoId
                  ? { ...item, titulo: values.notaTitulo.trim(), conteudo: values.notaConteudo.trim(), links: linksNotaSanitizados }
                  : item
              )
            : [
                ...prev.global.notes,
                { id: `note-${Date.now()}`, titulo: values.notaTitulo.trim(), conteudo: values.notaConteudo.trim(), links: linksNotaSanitizados },
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
    setLaunchInitialValues(emptyLaunchFormValues(categoriasSaidas[0] || 'Mercado'))
    setLaunchFormKey((prev) => prev + 1)
    setDiaEdicao(String(new Date().getDate()))
    setModalLancamentoAberto(true)
  }

  const abrirEditarParcela = (item: CardInstallment) => {
    setCardModalType('installment')
    setParcelaEditandoId(item.id)
    setCardInitialValues({
      description: item.descricao,
      totalValue: formatarValorInput(Number(item.valorParcela || 0) * Number(item.totalParcelas || 1)),
      totalInstallments: String(item.totalParcelas),
    })
    setCardFormKey((prev) => prev + 1)
    setDiaEdicao(String(item.dia || 1))
    setModalCartaoAberto(true)
  }

  const fecharModalCartao = () => {
    setModalCartaoAberto(false)
    setNovoCartaoNome('')
    setParcelaEditandoId(null)
    setDiaEdicao('1')
  }

  const salvarCartaoOuParcela = (values: CardPurchaseFormValues) => {
    if (!selectedCardId || !values.description.trim()) return
    const valorTotalCompra = moneyStringToNumber(values.totalValue)
    const totalParcelas = Math.max(1, Number(values.totalInstallments || 1))
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
                      descricao: values.description.trim(),
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
              descricao: values.description.trim(),
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

  /**
   * Remove todas as parcelas da mesma compra.
   *
   * As parcelas geradas juntas compartilham um `groupId`. Sem isto, apagar
   * uma compra de 12x exigia excluir parcela por parcela, mes a mes.
   */
  const excluirCompraParcelada = (id: string) => {
    if (!selectedCardId) return
    setAppData((prev) => {
      const cartao = prev.global.cards.find((card) => card.id === selectedCardId)
      const alvo = cartao?.parcelas.find((item) => item.id === id)
      const grupo = alvo?.groupId

      return {
        ...prev,
        global: {
          ...prev.global,
          cards: prev.global.cards.map((card) =>
            card.id === selectedCardId
              ? {
                  ...card,
                  parcelas: card.parcelas.filter((item) =>
                    grupo ? item.groupId !== grupo : item.id !== id
                  ),
                }
              : card
          ),
        },
      }
    })
  }

  /** Quantas parcelas a compra do item tem, para o modal oferecer a escolha. */
  const escopoDaParcela = (id: string) => {
    const cartao = cards.find((card) => card.id === selectedCardId)
    const alvo = cartao?.parcelas.find((item) => item.id === id)
    if (!alvo?.groupId) return null
    const irmas = (cartao?.parcelas || []).filter((item) => item.groupId === alvo.groupId)
    if (irmas.length <= 1) return null
    return { quantidade: irmas.length, descricao: alvo.descricao }
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

  const isParcelaFormulario = String(tipoFormularioLancamento) === 'parcela'
  const isEntradaFormulario = String(tipoFormularioLancamento) === 'entrada'
  const isSaidaFormulario = String(tipoFormularioLancamento) === 'saida'
  const algumModalAberto = anoModalAberto || mesModalAberto || modalLancamentoAberto || modalAcaoRapidaAberto || modalCategoriasAberto || modalCategoriaNomeAberto || modalAnotacaoAberto || modalCartaoAberto || modalFiltroAberto || modalGerenciarCartoesAberto || modalNovoCartaoAberto || modalConfiguracoesAberto || modalCompraDesejoAberto || modalPreviewImportacaoAberto || modalPreviewExportacaoAberto || !!confirmacaoExclusao

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
        <HomeSkeleton theme={theme} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style={temaEscuro ? 'light' : 'dark'} />
      <View style={{ flex: 1 }}>

      <AppHeader
        theme={theme}
        nome={nome}
        email={email}
        avatarUri={avatarEhImagem(avatarPerfil) ? avatarPerfil : null}
        iniciais={iniciais}
        premiumAtivo={premiumValido}
        valoresOcultos={ocultarValores}
        temaEscuro={temaEscuro}
        onAbrirPerfil={() => setModalConfiguracoesAberto(true)}
        onAlternarTema={alternarTema}
        onAlternarValores={() => atualizarPreferenciasInvestimento({ hideValues: !ocultarValores })}
        onSair={handleSair}
      />

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
        <BuscaGlobal theme={theme} valor={buscaGlobal} onChange={setBuscaGlobal} />
        {resultadosBuscaGlobal.length > 0 && (
          <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 0, marginBottom: 8 }]}>
            <Text style={[styles.manageTitle, { color: theme.text, marginBottom: 8 }]}>Busca global</Text>
            {resultadosBuscaGlobal.map((item, index) => (
              <PressableScale
                key={`${item.tipo}-${item.id}-${index}`}
                onPress={() => irParaResultadoBuscaGlobal(item)}
                style={[styles.fullRowCard, { borderColor: theme.border, backgroundColor: theme.cardSoft, marginTop: index === 0 ? 0 : 8 }]}
              >
                <Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.titulo}</Text>
                <Text style={[styles.rowItemMeta, { color: theme.muted }]}>{item.tipo} · {item.subtitulo}</Text>
              </PressableScale>
            ))}
          </View>
        )}

        <PeriodoSelector
          theme={theme}
          mes={mesSelecionado}
          ano={anoSelecionado}
          onAbrirMes={() => setMesModalAberto(true)}
          onAbrirAno={() => setAnoModalAberto(true)}
          onAnterior={() => irParaMesVizinho(-1)}
          onProximo={() => irParaMesVizinho(1)}
          onHoje={voltarParaMesAtual}
          ehMesAtual={ehMesCorrente}
        />

        {abaInferior === 'home' && (
          <>
            <ResumoCards
              theme={theme}
              salario={salario}
              saldoAtual={saldoAtual}
              totalEntradas={totalEntradas}
              totalSaidas={totalSaidas}
              salarioEmEdicao={salarioEmEdicao}
              salarioTexto={salarioTexto}
              onSalarioTextoChange={setSalarioTexto}
              onIniciarEdicaoSalario={iniciarEdicaoSalario}
              onSalvarSalario={salvarSalarioEdicao}
              salaryInputRef={salaryInputRef}
              ocultarValores={ocultarValores}
            />

            <AppearIn index={3}>
              <GraficoCategoriasCard
                theme={theme}
                dadosPizza={dadosPizza}
                formatarValorVisivel={formatarValorVisivel}
              />
            </AppearIn>

            <AppearIn index={5}>
              <ComprasDesejoCard
                theme={theme}
                itens={comprasDesejoVisiveis}
                highlightedItemId={highlightedItemId}
                formatarValorVisivel={formatarValorVisivel}
                registrarLayoutItem={registrarLayoutItem}
                renderHighlightOverlay={renderHighlightOverlay}
                onNovo={() => abrirNovaCompraDesejo()}
                onEditar={abrirNovaCompraDesejo}
                onAlternarComprado={alternarCompraDesejoComprado}
                onExcluir={(id, nome) => abrirConfirmacaoExclusao('compra_desejo', id, nome)}
              />
            </AppearIn>

            <AppearIn index={6}>
              <NotasPixCard
                theme={theme}
                pixOrdenados={pixOrdenados}
                notasOrdenadas={notasOrdenadas}
                copiedPixId={copiedPixId}
                highlightedItemId={highlightedItemId}
                registrarLayoutItem={registrarLayoutItem}
                renderHighlightOverlay={renderHighlightOverlay}
                renderTextoSecundario={renderTextoSecundario}
                renderListaLinks={renderListaLinks}
                onAbrirLink={abrirLinkComConfirmacao}
                onNovaNota={abrirNovaNota}
                onAbrirFiltro={() => abrirFiltro('notas')}
                onCopiarPix={copiarPix}
                onEditarPix={abrirEditarPix}
                onExcluirPix={(id, nome) => abrirConfirmacaoExclusao('pix', id, nome)}
                onEditarNota={abrirEditarNota}
                onExcluirNota={(id, titulo) => abrirConfirmacaoExclusao('nota', id, titulo)}
              />
            </AppearIn>
          </>
        )}

        {abaInferior === 'fixo' && (
          <FixoTab
            theme={theme}
            chaveAtual={chaveAtual}
            fixosOrdenados={fixosOrdenados}
            totalFixoPago={totalFixoPago}
            totalFixoNaoPago={totalFixoNaoPago}
            highlightedItemId={highlightedItemId}
            formatarValorVisivel={formatarValorVisivel}
            registrarLayoutItem={registrarLayoutItem}
            renderHighlightOverlay={renderHighlightOverlay}
            onAbrirFiltro={() => abrirFiltro('fixo')}
            onAlternarPago={alternarPagoFixo}
            onEditar={abrirEditarFixo}
            onExcluir={(id, nome) => abrirConfirmacaoExclusao('fixo', id, nome)}
          />
        )}

        {abaInferior === 'variavel' && (
          <VariavelTab
            theme={theme}
            chaveAtual={chaveAtual}
            tipoVariavelTab={tipoVariavelTab}
            onTipoChange={setTipoVariavelTab}
            totalEntradas={totalEntradas}
            totalCategoriaSelecionada={totalCategoriaSelecionada}
            categoriasSaidas={categoriasSaidas}
            filtroCategoria={filtroCategoria}
            onFiltroCategoriaChange={setFiltroCategoria}
            entradas={entradas}
            entradasOrdenadas={entradasOrdenadas}
            saidasOrdenadas={saidasOrdenadas}
            highlightedItemId={highlightedItemId}
            formatarValorVisivel={formatarValorVisivel}
            registrarLayoutItem={registrarLayoutItem}
            renderHighlightOverlay={renderHighlightOverlay}
            onNovaCategoria={abrirModalNovaCategoria}
            onGerenciarCategorias={() => setModalCategoriasAberto(true)}
            onAbrirFiltro={abrirFiltro}
            onEditarEntrada={abrirEditarEntrada}
            onExcluirEntrada={(id, nome) => abrirConfirmacaoExclusao('entrada', id, nome)}
            onEditarSaida={abrirEditarSaida}
            onExcluirSaida={(id, nome) => abrirConfirmacaoExclusao('saida', id, nome)}
          />
        )}

        {abaInferior === 'cartao' && (
          <CartaoTab
            theme={theme}
            cards={cards}
            selectedCard={selectedCard}
            selectedCardId={selectedCardId}
            onSelectCard={setSelectedCardId}
            parcelasOrdenadas={parcelasOrdenadas}
            totalCartaoSelecionado={totalCartaoSelecionado}
            limiteCartaoSelecionado={limiteCartaoSelecionado}
            limiteDisponivelCartao={limiteDisponivelCartao}
            totalFaturaAtual={totalFaturaAtual}
            totalProximaFatura={totalProximaFatura}
            percentualUsoCartao={percentualUsoCartao}
            datasFaturaCartao={datasFaturaCartao}
            highlightedItemId={highlightedItemId}
            formatarValorVisivel={formatarValorVisivel}
            registrarLayoutItem={registrarLayoutItem}
            renderHighlightOverlay={renderHighlightOverlay}
            onNovoCartao={abrirModalNovoCartao}
            onGerenciarCartoes={abrirGerenciarCartoes}
            onAbrirFiltro={() => abrirFiltro('cartao')}
            onAnteciparFatura={anteciparFaturaSeguinte}
            onEditarParcela={abrirEditarParcela}
            onExcluirParcela={(id, descricao) => abrirConfirmacaoExclusao('parcela', id, descricao)}
          />
        )}
      </ScrollView>
      </View>

      {!algumModalAberto && <View style={[styles.bottomBar, { backgroundColor: theme.card, borderColor: theme.border, bottom: Math.max(insets.bottom, 10) }]}>
        <View style={styles.bottomHalf}>
          <BottomTabItem label="Home" icon="aba_home" active={abaInferior === 'home'} theme={theme} onPress={() => setAbaInferior('home')} />
          <BottomTabItem label="Cartões" icon="aba_cartao" active={abaInferior === 'cartao'} theme={theme} onPress={() => setAbaInferior('cartao')} />
        </View>
        <PressableScale
          onPress={abrirAcaoRapida}
          scaleTo={0.9}
          hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
          style={[styles.plusButton, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
        >
          <Icon name="adicionar" size={26} color={theme.textInverse} />
        </PressableScale>
        <View style={styles.bottomHalf}>
          <BottomTabItem label="Fixos" icon="aba_fixo" active={abaInferior === 'fixo'} theme={theme} onPress={() => setAbaInferior('fixo')} />
          <BottomTabItem label="Variáveis" icon="aba_variavel" active={abaInferior === 'variavel'} theme={theme} onPress={() => setAbaInferior('variavel')} />
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
              <PressableScale
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
              </PressableScale>
            ))}
          </View>
        </View>
      </AppModal>

      <SelectionModal
        visible={anoModalAberto}
        onClose={() => setAnoModalAberto(false)}
        title='Selecionar ano'
        options={listaAnos.map((ano) => ({ value: ano, label: String(ano) }))}
        selectedValue={anoSelecionado}
        onSelect={(value) => {
          setAnoSelecionado(Number(value))
          setAnoModalAberto(false)
        }}
        theme={theme}
      />

      <SelectionModal
        visible={mesModalAberto}
        onClose={() => setMesModalAberto(false)}
        title='Selecionar mês'
        options={meses.map((mes) => ({ value: mes, label: mes }))}
        selectedValue={mesSelecionado}
        onSelect={(value) => {
          setMesSelecionado(String(value))
          setMesModalAberto(false)
        }}
        theme={theme}
        scrollable
        hint='Deslize para ver mais ↓'
      />

      <LaunchModal
        key={`launch-${launchFormKey}`}
        visible={modalLancamentoAberto}
        onClose={fecharModalLancamento}
        theme={theme}
        formType={tipoFormularioLancamento}
        mode={modoModalLancamento}
        keyboardOpen={keyboardAberto}
        title={tituloModalLancamento}
        isOutputForm={isSaidaFormulario}
        isInputForm={isEntradaFormulario}
        cards={cards}
        selectedCardId={selectedCardId}
        onSelectedCardIdChange={setSelectedCardId}
        categories={categoriasSaidas}
        initialValues={launchInitialValues}
        day={diaEdicao}
        onDayChange={setDiaEdicao}
        onOpenDayCalendar={() => abrirCalendario('dia_edicao', diaEdicao, meses.indexOf(mesSelecionado) + 1)}
        onTypeChange={(tipo) => {
          setTipoFormularioLancamento(tipo)
          if (tipo === 'entrada' || tipo === 'saida') {
            setTipoVariavelTab(tipo)
            setAbaInferior('variavel')
          } else if (tipo === 'fixo') {
            setAbaInferior('fixo')
          } else {
            setAbaInferior('cartao')
          }
        }}
        onSave={salvarLancamento}
      />

      <ManageCategoriesModal
        visible={modalCategoriasAberto}
        onClose={() => setModalCategoriasAberto(false)}
        theme={theme}
        categories={categoriasSaidas}
        onEdit={abrirModalEditarCategoria}
        onDelete={(categoria) => abrirConfirmacaoExclusao('categoria', categoria, categoria)}
      />

      <CategoryNameModal
        key={`categoria-${categoriaFormKey}`}
        visible={modalCategoriaNomeAberto}
        onClose={fecharModalCategoriaNome}
        mode={modoCategoria}
        initialValue={categoriaInicial}
        onSave={salvarCategoria}
        theme={theme}
      />

      <NoteModal
        key={`note-${noteFormKey}`}
        visible={modalAnotacaoAberto}
        onClose={fecharModalAnotacao}
        theme={theme}
        type={noteModalType}
        initialValues={noteInitialValues}
        onSave={salvarAnotacao}
      />

      <CardPurchaseModal
        key={`card-${cardFormKey}`}
        visible={modalCartaoAberto}
        onClose={fecharModalCartao}
        theme={theme}
        editingInstallment={!!parcelaEditandoId}
        cards={cards}
        selectedCardId={selectedCardId}
        onSelectedCardIdChange={setSelectedCardId}
        initialValues={cardInitialValues}
        day={diaEdicao}
        onDayChange={setDiaEdicao}
        onOpenDayCalendar={() => abrirCalendario('dia_edicao', diaEdicao, meses.indexOf(mesSelecionado) + 1)}
        onSave={salvarCartaoOuParcela}
      />

      <SelectionModal
        visible={modalFiltroAberto}
        onClose={() => setModalFiltroAberto(false)}
        title='Filtro'
        options={opcoesFiltro}
        selectedValue={filtroSelecionado}
        onSelect={(value) => aplicarFiltro(value as SortMode)}
        theme={theme}
      />

      <ManageCardsModal
        visible={modalGerenciarCartoesAberto}
        onClose={() => setModalGerenciarCartoesAberto(false)}
        theme={theme}
        cards={cards}
        onEdit={iniciarEdicaoCartao}
        onDelete={(card) => abrirConfirmacaoExclusao('cartao', card.id, card.nome)}
      />

      <CardEditorModal
        key={`card-editor-${cardEditorFormKey}`}
        visible={modalNovoCartaoAberto}
        onClose={fecharModalNovoCartao}
        theme={theme}
        editing={!!cartaoEditandoId}
        initialValues={cardEditorInitialValues}
        closing={gerenciarCartaoFechamento}
        onClosingChange={setGerenciarCartaoFechamento}
        due={gerenciarCartaoVencimento}
        onDueChange={setGerenciarCartaoVencimento}
        onOpenClosingCalendar={() => abrirCalendario('cartao_fechamento', gerenciarCartaoFechamento, meses.indexOf(mesSelecionado) + 1)}
        onOpenDueCalendar={() => abrirCalendario('cartao_vencimento', gerenciarCartaoVencimento, Math.min(12, Math.max(1, meses.indexOf(mesSelecionado) + 2)))}
        onSave={salvarCartaoGerenciado}
      />

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
            <PressableScale onPress={() => setLinkPendenteConfirmacao(null)} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
            </PressableScale>
            <PressableScale onPress={confirmarAberturaLink} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
              <Text style={[styles.modalActionText, { color: theme.white }]}>Abrir</Text>
            </PressableScale>
          </View>
        </View>
      </AppModal>

      <AppModal visible={!!avisoAtualizacao} onClose={() => setAvisoAtualizacao(null)}>
        <View style={[styles.modalCard, styles.modalCardConfirmDelete, styles.modalCardUpdateNotice, { backgroundColor: theme.card, borderColor: theme.borderStrong }]}> 
          <View style={[styles.updateNoticeIconWrap, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
            <Icon name={avisoAtualizacao?.acao ? "ordenar" : "confirmar"} size={26} color={theme.primary} />
          </View>
          <Text style={[styles.modalTitle, { color: theme.text, textAlign: 'center' }]}>{avisoAtualizacao?.titulo || 'Atualizações'}</Text>
          <Text style={[styles.emptyChartText, { color: theme.muted, marginBottom: 16, textAlign: 'center' }]}>{avisoAtualizacao?.mensagem || ''}</Text>
          <View style={styles.modalActions}>
            <PressableScale onPress={() => setAvisoAtualizacao(null)} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}> 
              <Text style={[styles.modalActionText, { color: theme.text }]}>{avisoAtualizacao?.acao ? 'Depois' : 'Fechar'}</Text>
            </PressableScale>
            {avisoAtualizacao?.acao ? (
              <PressableScale onPress={executarAcaoAvisoAtualizacao} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}> 
                <Text style={[styles.modalActionText, { color: theme.white }]}>{avisoAtualizacao?.botaoPrincipal || 'Atualizar'}</Text>
              </PressableScale>
            ) : null}
          </View>
        </View>
      </AppModal>

      <ConfirmDeleteModal
        visible={!!confirmacaoExclusao}
        label={confirmacaoExclusao?.label}
        onClose={() => setConfirmacaoExclusao(null)}
        onConfirm={confirmarExclusao}
        theme={theme}
        escopo={(() => {
          if (confirmacaoExclusao?.type !== 'parcela') return undefined
          const info = escopoDaParcela(confirmacaoExclusao.id)
          if (!info) return undefined
          return {
            quantidade: info.quantidade,
            descricaoConjunto: info.descricao,
            onConfirmarTodos: () => {
              excluirCompraParcelada(confirmacaoExclusao.id)
              setConfirmacaoExclusao(null)
            },
          }
        })()}
      />

      <SettingsModal
        visible={modalConfiguracoesAberto}
        onClose={() => setModalConfiguracoesAberto(false)}
        theme={theme}
        premiumStatusText={premiumStatusTexto}
        premiumValid={premiumValido}
        onPremiumPress={irParaTelaPremium}
        editableName={nomeEditavel}
        onEditableNameChange={setNomeEditavel}
        currentName={nome}
        email={email}
        editableAvatar={avatarEditavel}
        currentAvatar={avatarPerfil}
        initials={iniciais}
        onChooseProfileImage={escolherImagemPerfil}
        onSaveProfile={salvarPerfil}
        processingFile={processandoArquivo}
        onOpenExportPreview={abrirPreviewExportacao}
        onImportData={importarDadosBanco}
        backups={backupsDisponiveis}
        loadingBackups={carregandoBackups}
        restoringBackupId={restaurandoBackupId}
        onRestoreBackup={confirmarRestaurarBackup}
      />

      <ImageCropModal
        visible={modalCropAberto}
        imageUri={imagemParaCortar}
        theme={theme}
        onCancel={cancelarRecorteImagemWeb}
        onConfirm={confirmarRecorteImagemWeb}
      />

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
                          theme={theme}
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
                      <Text style={[styles.rowItemMeta, { color: theme.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }]} selectable>{buildExportRows(dadosExportacao, ';').slice(0, 1400)}</Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={[styles.modalActionsSticky, { borderTopColor: theme.border, backgroundColor: theme.card }]}> 
              <View style={styles.modalActions}>
                <PressableScale onPress={() => setModalPreviewExportacaoAberto(false)} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalActionText, { color: theme.text }]}>Fechar</Text></PressableScale>
                <PressableScale onPress={confirmarExportacaoPreview} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.modalActionText, { color: theme.white }]}>{previewExportacaoTipo === 'pdf' ? 'Compartilhar PDF' : 'Exportar'}</Text></PressableScale>
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
            <PressableScale onPress={() => setModalPreviewImportacaoAberto(false)} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text></PressableScale>
            <PressableScale onPress={confirmarImportacaoPreview} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.modalActionText, { color: theme.white }]}>Importar</Text></PressableScale>
          </View>
        </View>
      </AppModal>

      <ShoppingWishModal
        key={`wish-${wishFormKey}`}
        visible={modalCompraDesejoAberto}
        onClose={limparModalCompraDesejo}
        theme={theme}
        editing={!!compraDesejoEditandoId}
        initialValues={wishInitialValues}
        data={compraDesejoData}
        onDataChange={setCompraDesejoData}
        onOpenCalendar={() => abrirCalendario('wish_data', compraDesejoData, meses.indexOf(mesSelecionado) + 1)}
        onSave={salvarCompraDesejo}
      />

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
            <PressableScale onPress={() => setModalPremiumBloqueioAberto(false)} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.modalActionText, { color: theme.text }]}>Agora não</Text>
            </PressableScale>
            <PressableScale onPress={irParaTelaPremium} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}>
              <Text style={[styles.modalActionText, { color: theme.white }]}>Virar Premium</Text>
            </PressableScale>
          </View>
        </View>
      </AppModal>

      {sincronizando && (
        <View style={[styles.syncBadge, { backgroundColor: theme.accentSoft, borderColor: theme.borderStrong, bottom: 115 + Math.max(insets.bottom, 10) }]}>
          <Text style={[styles.syncBadgeText, { color: theme.accent }]}>Salvando...</Text>
        </View>
      )}
      <AppModal
        key={`calendario-${calendarioFormKey}`}
        level={100}
        visible={modalCalendarioAberto}
        onClose={() => setModalCalendarioAberto(false)}
      >
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.modalTitle, { color: theme.text, textAlign: 'left', marginBottom: 16 }]}>
            Selecionar data
          </Text>

          <Calendario
            theme={theme}
            mes={calendarMes}
            ano={anoSelecionado}
            dia={calendarDia}
            onSelecionar={(dia, mes) => {
              setCalendarDia(dia)
              setCalendarMes(mes)
            }}
            onMudarMes={setCalendarMes}
          />

          <View style={styles.modalActions}>
            <PressableScale
              onPress={() => setModalCalendarioAberto(false)}
              style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
            >
              <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
            </PressableScale>
            <PressableScale
              onPress={confirmarCalendario}
              style={[styles.modalActionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
            >
              <Text style={[styles.modalActionText, { color: theme.textInverse }]}>Aplicar</Text>
            </PressableScale>
          </View>
        </View>
      </AppModal>

    </SafeAreaView>
  )
}

/**
 * A tela e embrulhada pelo FinanceProvider. Como o Provider e dono do estado
 * e fica acima, re-renders da tela nao invalidam o contexto.
 */
export default function HomeScreen() {
  return (
    <FinanceProvider>
      <HomeScreenContent />
    </FinanceProvider>
  )
}
