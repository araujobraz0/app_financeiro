// Primeiro acesso: a montagem da base do app, em cinco passos.
//
// Antes era uma pagina unica e comprida — salario, gastos fixos, categorias e
// cartoes empilhados num rolo so, com o resumo la no fim. Quem abria o app
// pela primeira vez via um formulario grande, sem saber onde aquilo acabava,
// e as quatro secoes competiam pela atencao ao mesmo tempo.
//
// Agora e um passo por tela: uma pergunta de cada vez, a barra de progresso
// no alto dizendo o quanto falta e os botoes de voltar e continuar fixos
// embaixo, sempre no mesmo lugar. O ultimo passo mostra o que vai ser criado
// antes de gravar.
//
// O calendario das datas do cartao passou a ser o mesmo do resto do app —
// semanas alinhadas por coluna, hoje marcado — em vez da grade de numeros
// soltos que so esta tela tinha.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'

import { supabase } from '../src/lib/supabase'
import { VERSAO_MIGRACAO_FIXOS } from '../src/data/appData'
import { spring } from '../src/theme/motion'
import {
  digitsToMoneyPlainString as digitsToMoneyString,
  formatarMoeda,
  handleMaskedMoneyInput,
  moneyStringToNumber,
} from '../src/utils/currency'
import {
  formatarDiaMesInput,
  formatarInputDiaMes,
  meses,
  parseDiaMesInputOptional as parseDiaMesInput,
} from '../src/utils/dates'
import type { AppData, BancoDeDados, CardItem, FixoRecorrente, Tema } from './types'
import AppModal from '../components/common/AppModal'
import Calendario from '../components/common/Calendario'
import Icon, { type IconName } from '../components/common/Icon'
import Interruptor from '../components/common/Interruptor'
import AppearIn from '../components/common/motion/AppearIn'
import PressableScale from '../components/common/motion/PressableScale'
import CartaoEditavel from '../components/tabs/CartaoEditavel'
import { useTemaSalvo } from '../src/theme/useTemaSalvo'

type FixedPreset = {
  id: string
  nome: string
  valorText: string
  selected: boolean
}

type CustomFixedItem = {
  id: string
  nome: string
  valorText: string
}

type DraftCardItem = {
  id: string
  nome: string
  fechamentoText: string
  vencimentoText: string
}

type AlvoDoCalendario =
  | 'new_closing'
  | 'new_due'
  | { id: string; field: 'fechamentoText' | 'vencimentoText' }

const STORAGE_KEY = 'controle-financeiro-v16'

const gastosFixosEEARBase: FixedPreset[] = [
  { id: 'fixo-comissao', nome: 'Comissão de formatura', valorText: '0,00', selected: false },
  { id: 'fixo-lavadeira', nome: 'Lavadeira', valorText: '0,00', selected: false },
  { id: 'fixo-fotos', nome: 'Empresa de fotos', valorText: '0,00', selected: false },
  { id: 'fixo-ct', nome: 'Centro de tradições', valorText: '0,00', selected: false },
]

const categoriasVariaveisBase = ['Mercado', 'Saúde', 'Transporte', 'Lazer', 'Comida', 'Extra']

/**
 * Os cinco passos, na ordem.
 *
 * `curto` e o que aparece na trilha do topo; `titulo` e a pergunta do passo.
 */
const PASSOS = [
  {
    chave: 'salario',
    curto: 'Salário',
    icone: 'investir' as IconName,
    titulo: 'Quanto você recebe por mês?',
    subtitulo: 'É a base de tudo. O único campo que o app não consegue adivinhar depois.',
  },
  {
    chave: 'fixos',
    curto: 'Fixos',
    icone: 'aba_fixo' as IconName,
    titulo: 'O que sai todo mês?',
    subtitulo: 'Aluguel, internet, academia. Eles entram já criados e se repetem sozinhos.',
  },
  {
    chave: 'categorias',
    curto: 'Categorias',
    icone: 'aba_variavel' as IconName,
    titulo: 'Como você separa os gastos do dia a dia?',
    subtitulo: 'Escolha as categorias que fazem sentido para você. Dá para mudar quando quiser.',
  },
  {
    chave: 'cartoes',
    curto: 'Cartões',
    icone: 'aba_cartao' as IconName,
    titulo: 'Você usa cartão de crédito?',
    subtitulo: 'Com o fechamento e o vencimento cadastrados, cada compra cai na fatura certa.',
  },
  {
    chave: 'resumo',
    curto: 'Pronto',
    icone: 'confirmar' as IconName,
    titulo: 'É assim que o app vai começar',
    subtitulo: 'Confira antes de entrar. Nada aqui é definitivo — tudo se edita depois.',
  },
] as const

const ULTIMO_PASSO = PASSOS.length - 1

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

/** Definicoes dos gastos fixos escolhidos no primeiro acesso. */
function criarFixosIniciais(fixos: { nome: string; valor: number }[]): FixoRecorrente[] {
  const primeiraCompetencia = `${new Date().getFullYear() - 2}-${meses[0]}`
  return fixos.map((item, index) => ({
    id: `fixo-inicial-${index}-${item.nome}`,
    criadoEm: primeiraCompetencia,
    encerradoEm: null,
    versoes: [{ desde: primeiraCompetencia, nome: item.nome, valor: item.valor }],
  }))
}

function criarBancoInicial(salario: number, categoriasVariaveis: string[]) {
  const dataAtual = new Date()
  const anoAtual = dataAtual.getFullYear()
  const listaAnos = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2]
  const banco: BancoDeDados = {}

  listaAnos.forEach((ano) => {
    meses.forEach((mes) => {
      const chave = `${ano}-${mes}`

      banco[chave] = {
        salario,
        entradas: [],
        // Os gastos fixos moram em global.fixosRecorrentes; aqui fica so o mes.
        fixo: [],
        saidas: [],
        categoriasSaidas: [...categoriasVariaveis],
      }
    })
  })

  return banco
}

export default function PrimeiroAcessoScreen() {
  const insets = useSafeAreaInsets()
  const { width: larguraTela } = useWindowDimensions()
  const { theme } = useTemaSalvo()
  const styles = useMemo(() => criarEstilos(theme), [theme])

  // O cartao acompanha a tela: com os campos dentro dele, os 250 fixos do
  // cartao so de leitura ficavam apertados demais para digitar.
  //
  // Desconta a margem da pagina (20 de cada lado) e o respiro do bloco que o
  // envolve (14 de cada lado). Sem essa conta o cartao nascia mais largo que
  // a caixa em que ele mora.
  const larguraDoCartao = Math.round(Math.max(240, Math.min(340, larguraTela - 40 - 28)))

  const [passo, setPasso] = useState(0)
  const scrollRef = useRef<ScrollView>(null)

  const [loading, setLoading] = useState(false)
  const [screenLoading, setScreenLoading] = useState(true)
  const [name, setName] = useState('')
  const [erro, setErro] = useState('')
  const [faltaSalario, setFaltaSalario] = useState(false)
  const salarioRef = useRef<TextInput>(null)

  const [salarioText, setSalarioText] = useState('0,00')
  const [isEEARStudent, setIsEEARStudent] = useState(false)
  const [fixedPresets, setFixedPresets] = useState<FixedPreset[]>(gastosFixosEEARBase)
  const [customFixedItems, setCustomFixedItems] = useState<CustomFixedItem[]>([])
  const [newCustomFixedName, setNewCustomFixedName] = useState('')
  const [newCustomFixedValue, setNewCustomFixedValue] = useState('0,00')
  const [selectedVariableCategories, setSelectedVariableCategories] = useState<string[]>([])
  const [customVariableCategories, setCustomVariableCategories] = useState<string[]>([])
  const [newCustomVariableName, setNewCustomVariableName] = useState('')
  const [hasCreditCards, setHasCreditCards] = useState(false)
  const [cards, setCards] = useState<DraftCardItem[]>([])
  const [newCardName, setNewCardName] = useState('')
  const [newCardClosing, setNewCardClosing] = useState('')
  const [newCardDue, setNewCardDue] = useState('')
  /**
   * O id do proximo cartao, sorteado antes de ele existir.
   *
   * A cor sai do id. Sem reservar o id agora, o cartao em branco teria uma
   * cor enquanto e preenchido e outra depois de criado — trocaria de cor no
   * toque do botao.
   */
  const [proximoCardId, setProximoCardId] = useState(() => createId('card'))

  const [calendarVisible, setCalendarVisible] = useState(false)
  const [calendarTarget, setCalendarTarget] = useState<AlvoDoCalendario>('new_closing')

  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth() + 1
  const diaAtual = new Date().getDate()
  const [calendarDia, setCalendarDia] = useState(diaAtual)
  const [calendarMes, setCalendarMes] = useState(mesAtual)

  // A barra do topo anda com mola, e nao aos saltos: da para ver de onde para
  // onde ela foi, o que e metade do sentido de existir uma barra de progresso.
  const progresso = useSharedValue((passo + 1) / PASSOS.length)
  useEffect(() => {
    progresso.value = withSpring((passo + 1) / PASSOS.length, spring.gentle)
  }, [passo, progresso])
  const estiloBarra = useAnimatedStyle(() => ({ width: `${progresso.value * 100}%` }))

  useEffect(() => {
    const load = async () => {
      setScreenLoading(true)
      setErro('')

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
          await supabase.auth.signOut()
          router.replace('/login')
          return
        }

        setName(
          String(
            session.user.user_metadata?.nome ||
              session.user.user_metadata?.name ||
              session.user.email?.split('@')[0] ||
              'Usuário'
          )
        )

        const { data, error } = await supabase
          .from('financial_data')
          .select('data')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (error) throw error

        if (data?.data) {
          router.replace('/home')
          return
        }
      } catch (error) {
        console.error('[primeiro acesso] Falha ao validar primeiro acesso:', error)
        setErro('Não foi possível validar seu primeiro acesso agora.')
      } finally {
        setScreenLoading(false)
      }
    }

    load()
  }, [])

  const dismissKeyboard = () => {
    Keyboard.dismiss()
  }

  const irParaPasso = (proximo: number) => {
    dismissKeyboard()
    setErro('')
    setPasso(Math.max(0, Math.min(ULTIMO_PASSO, proximo)))
    // Sem isto, o passo novo nasce com a tela ja rolada no meio.
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }))
  }

  const toggleFixedPreset = (id: string) => {
    setFixedPresets((prev) => prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)))
  }

  const setFixedPresetValue = (id: string, rawValue: string) => {
    setFixedPresets((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, valorText: digitsToMoneyString(rawValue.replace(/\D/g, '')) } : item
      )
    )
  }

  const adicionarNovoFixo = () => {
    const nome = newCustomFixedName.trim()
    if (!nome) return

    setCustomFixedItems((prev) => [
      ...prev,
      { id: createId('fixo-custom'), nome, valorText: newCustomFixedValue || '0,00' },
    ])

    setNewCustomFixedName('')
    setNewCustomFixedValue('0,00')
    dismissKeyboard()
  }

  const removerFixoCustom = (id: string) => {
    setCustomFixedItems((prev) => prev.filter((item) => item.id !== id))
  }

  const atualizarFixoCustomValor = (id: string, rawValue: string) => {
    setCustomFixedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, valorText: digitsToMoneyString(rawValue.replace(/\D/g, '')) } : item
      )
    )
  }

  const toggleVariableCategory = (categoria: string) => {
    setSelectedVariableCategories((prev) =>
      prev.includes(categoria) ? prev.filter((item) => item !== categoria) : [...prev, categoria]
    )
  }

  const adicionarCategoriaVariavelCustom = () => {
    const nome = newCustomVariableName.trim()
    if (!nome) return
    const jaExiste = [...categoriasVariaveisBase, ...selectedVariableCategories, ...customVariableCategories].some(
      (item) => item.toLowerCase() === nome.toLowerCase()
    )
    if (!jaExiste) {
      setCustomVariableCategories((prev) => [...prev, nome])
      setSelectedVariableCategories((prev) => [...prev, nome])
    }
    setNewCustomVariableName('')
    dismissKeyboard()
  }

  const removerCategoriaVariavelCustom = (categoria: string) => {
    setCustomVariableCategories((prev) => prev.filter((item) => item !== categoria))
    setSelectedVariableCategories((prev) => prev.filter((item) => item !== categoria))
  }

  const adicionarCartao = () => {
    const nome = newCardName.trim()
    if (!nome) return

    setCards((prev) => [
      ...prev,
      {
        id: proximoCardId,
        nome,
        fechamentoText: formatarInputDiaMes(newCardClosing),
        vencimentoText: formatarInputDiaMes(newCardDue),
      },
    ])

    setProximoCardId(createId('card'))
    setNewCardName('')
    setNewCardClosing('')
    setNewCardDue('')
    dismissKeyboard()
  }

  const removerCartao = (id: string) => {
    setCards((prev) => prev.filter((item) => item.id !== id))
  }

  const atualizarCartaoCampo = (
    id: string,
    campo: 'nome' | 'fechamentoText' | 'vencimentoText',
    valor: string
  ) => {
    setCards((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [campo]: campo === 'nome' ? valor : formatarInputDiaMes(valor) } : item
      )
    )
  }

  const abrirCalendarioCartao = (alvo: AlvoDoCalendario, valorAtual: string, mesPadrao?: number) => {
    dismissKeyboard()
    const lido = parseDiaMesInput(valorAtual || '', mesPadrao || mesAtual, anoAtual)
    setCalendarDia(lido.dia || diaAtual)
    setCalendarMes(lido.mes || mesPadrao || mesAtual)
    setCalendarTarget(alvo)
    setCalendarVisible(true)
  }

  const confirmarCalendarioCartao = () => {
    const dataFormatada = formatarDiaMesInput(calendarDia, calendarMes, anoAtual)

    if (calendarTarget === 'new_closing') setNewCardClosing(dataFormatada)
    else if (calendarTarget === 'new_due') setNewCardDue(dataFormatada)
    else atualizarCartaoCampo(calendarTarget.id, calendarTarget.field, dataFormatada)

    setCalendarVisible(false)
  }

  const salario = moneyStringToNumber(salarioText)

  const fixedItemsPreview = useMemo(() => {
    const presetsSelecionados = fixedPresets
      .filter((item) => item.selected)
      .map((item) => ({ nome: item.nome, valor: moneyStringToNumber(item.valorText) }))

    const extras = customFixedItems
      .map((item) => ({ nome: item.nome.trim(), valor: moneyStringToNumber(item.valorText) }))
      .filter((item) => item.nome)

    return [...presetsSelecionados, ...extras]
  }, [customFixedItems, fixedPresets])

  const categoriasVariaveisPreview = useMemo(
    () => Array.from(new Set(selectedVariableCategories.map((item) => item.trim()).filter(Boolean))),
    [selectedVariableCategories]
  )

  const totalFixosPreview = useMemo(
    () => fixedItemsPreview.reduce((acc, item) => acc + (Number(item.valor) || 0), 0),
    [fixedItemsPreview]
  )

  const cardsPreview = useMemo<CardItem[]>(
    () =>
      cards
        .map((item) => ({
          id: item.id,
          nome: item.nome.trim(),
          fechamento: parseDiaMesInput(item.fechamentoText, mesAtual, anoAtual).dia,
          fechamentoMes: parseDiaMesInput(item.fechamentoText, mesAtual, anoAtual).mes,
          vencimento: parseDiaMesInput(item.vencimentoText, Math.min(12, mesAtual + 1), anoAtual).dia,
          vencimentoMes: parseDiaMesInput(item.vencimentoText, Math.min(12, mesAtual + 1), anoAtual).mes,
          parcelas: [],
        }))
        .filter((item) => item.nome),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards]
  )

  const handleContinue = async () => {
    setLoading(true)
    setErro('')
    dismissKeyboard()

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session?.user) {
        await supabase.auth.signOut()
        router.replace('/login')
        return
      }

      const { data: existente, error: erroBusca } = await supabase
        .from('financial_data')
        .select('data')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (erroBusca) throw erroBusca

      if (existente?.data) {
        router.replace('/home')
        return
      }

      // O passo 1 ja barra isso, mas a rede de seguranca fica: sem salario o
      // app nasceria com a base zerada.
      if (!salario || salario <= 0) {
        setErro('Falta o salário — é o único campo obrigatório.')
        setFaltaSalario(true)
        setLoading(false)
        irParaPasso(0)
        setTimeout(() => salarioRef.current?.focus(), 120)
        return
      }

      const payload: AppData = {
        bancoDeDados: criarBancoInicial(salario, categoriasVariaveisPreview),
        global: {
          firstAccessCompleted: true,
          salaryMode: 'fixo',
          defaultFixedSalary: salario,
          onboardingFixedExpenses: fixedItemsPreview.map((item) => item.nome),
          categoriasAprendidas: {},
          fixosRecorrentes: criarFixosIniciais(fixedItemsPreview),
          limitesCategorias: {},
          fixosMigrados: true,
          fixosMigracaoVersao: VERSAO_MIGRACAO_FIXOS,
          pixContacts: [],
          notes: [],
          cards: hasCreditCards ? cardsPreview : [],
          profileAvatar: '💼',
          profileName: name,
          goals: [],
          shoppingWishes: [],
          investmentPercentage: 10,
          investmentBaseMode: 'salary',
          investimentos: [],
          hideValues: false,
        },
      }

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload))

      const { error: erroSalvar } = await supabase.from('financial_data').insert({
        user_id: session.user.id,
        data: payload,
        updated_at: new Date().toISOString(),
      })

      if (erroSalvar) throw erroSalvar

      router.replace('/home')
    } catch (error) {
      console.error('[primeiro acesso] Falha ao concluir primeiro acesso:', error)
      setErro('Não foi possível concluir o primeiro acesso.')
    } finally {
      setLoading(false)
    }
  }

  /** O botao da direita: avanca, ou grava tudo no ultimo passo. */
  const avancar = () => {
    if (passo === 0 && (!salario || salario <= 0)) {
      setErro('Falta o salário — é o único campo obrigatório.')
      setFaltaSalario(true)
      setTimeout(() => salarioRef.current?.focus(), 60)
      return
    }
    if (passo === ULTIMO_PASSO) {
      handleContinue()
      return
    }
    irParaPasso(passo + 1)
  }

  /** Campo de dinheiro, do tamanho grande do salario ao pequeno da linha. */
  const campoDeDinheiro = (
    valor: string,
    aoMudar: (texto: string) => void,
    variante: 'grande' | 'linha' | 'bloco' | 'metade',
    extra?: { ref?: React.RefObject<TextInput | null>; erro?: boolean; aceso?: boolean }
  ) => (
    <View
      style={[
        styles.dinheiroWrap,
        variante === 'grande' && styles.dinheiroWrapGrande,
        variante === 'linha' && styles.dinheiroWrapLinha,
        variante === 'metade' && styles.dinheiroWrapMetade,
        extra?.aceso && styles.dinheiroWrapAceso,
        extra?.erro && styles.dinheiroWrapErro,
      ]}
    >
      <Text style={[styles.dinheiroPrefixo, variante === 'grande' && styles.dinheiroPrefixoGrande]}>R$</Text>
      <TextInput
        ref={extra?.ref}
        value={valor}
        onChangeText={aoMudar}
        keyboardType="number-pad"
        placeholder="0,00"
        placeholderTextColor={theme.faint}
        style={[styles.dinheiroInput, variante === 'grande' && styles.dinheiroInputGrande]}
        returnKeyType="done"
        onSubmitEditing={dismissKeyboard}
        onBlur={dismissKeyboard}
        blurOnSubmit
      />
    </View>
  )

  const secaoVazia = (texto: string) => <Text style={styles.vazioTexto}>{texto}</Text>

  /**
   * O cabecalho dos blocos de criar.
   *
   * Antes cada um comecava com um rotulo de formulario em caixa alta solto no
   * topo. Com o simbolo e a explicacao na mesma linha, o bloco se apresenta
   * em vez de so rotular o que vem depois.
   */
  const cabecalhoDeCriar = (icone: IconName, titulo: string, subtitulo: string) => (
    <View style={styles.criarCabecalho}>
      <View style={styles.criarSelo}>
        <Icon name={icone} size={16} color={theme.primary} />
      </View>
      <View style={styles.criarTextos}>
        <Text style={styles.criarTitulo}>{titulo}</Text>
        <Text style={styles.criarSub}>{subtitulo}</Text>
      </View>
    </View>
  )

  const passoSalario = (
    <>
      <View style={styles.cartaoDestaque}>
        <Text style={styles.rotuloCampo}>Salário mensal</Text>
        {campoDeDinheiro(
          salarioText,
          (value) => {
            setFaltaSalario(false)
            handleMaskedMoneyInput(value, setSalarioText, { prefix: false, emptyAsBlank: false })
          },
          'grande',
          { ref: salarioRef, erro: faltaSalario }
        )}
        <Text style={styles.ajudaTexto}>
          Se o valor muda de mês para mês, coloque a média — o app deixa você corrigir mês a mês
          depois.
        </Text>
      </View>

    </>
  )

  const passoFixos = (
    <>
      {/* O interruptor mora aqui, e nao no passo do salario: e neste passo
          que a lista dele aparece, entao ligar e ver o efeito acontecem na
          mesma tela. */}
      <View style={styles.cartaoSuave}>
        <View style={styles.linhaInterruptor}>
          <View style={styles.linhaInterruptorTextos}>
            <Text style={styles.tituloMenor}>Aluno da EEAR</Text>
            <Text style={styles.subtituloMenor}>
              Liga uma lista pronta com os gastos típicos de quem estuda lá.
            </Text>
          </View>
          <Interruptor
            theme={theme}
            ativo={isEEARStudent}
            onAlternar={() => setIsEEARStudent((antes) => !antes)}
          />
        </View>
      </View>

      {isEEARStudent ? (
        <View style={styles.blocoLista}>
          <Text style={styles.rotuloSecao}>Sugestões da EEAR</Text>
          {fixedPresets.map((item) => (
            <View key={item.id} style={[styles.itemCartao, item.selected && styles.itemCartaoAtivo]}>
              {/* So esta linha marca e desmarca. Antes o cartao inteiro era o
                  botao, entao tocar no campo de valor para corrigir o numero
                  desmarcava o gasto. */}
              <PressableScale
                onPress={() => toggleFixedPreset(item.id)}
                scaleTo={0.99}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: item.selected }}
                accessibilityLabel={item.nome}
                style={styles.itemLinhaTopo}
              >
                <View style={[styles.marcador, item.selected && styles.marcadorAtivo]}>
                  {item.selected ? <Icon name="confirmar" size={13} color={theme.textInverse} /> : null}
                </View>
                <View style={styles.itemTextos}>
                  <Text style={styles.itemTitulo}>{item.nome}</Text>
                  <Text style={styles.itemSubtitulo}>
                    {item.selected ? 'Vai entrar já criado' : 'Toque para incluir'}
                  </Text>
                </View>
              </PressableScale>

              <View style={styles.itemLinhaValor}>
                <Text style={styles.rotuloMini}>Valor por mês</Text>
                {campoDeDinheiro(item.valorText, (v) => setFixedPresetValue(item.id, v), 'linha', {
                  aceso: item.selected,
                })}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {customFixedItems.length > 0 ? (
        <View style={styles.blocoLista}>
          <Text style={styles.rotuloSecao}>Seus gastos fixos</Text>
          {customFixedItems.map((item) => (
            <View key={item.id} style={[styles.itemCartao, styles.itemCartaoAtivo]}>
              <View style={styles.itemLinhaTopo}>
                <View style={[styles.marcador, styles.marcadorAtivo]}>
                  <Icon name="confirmar" size={13} color={theme.textInverse} />
                </View>
                <View style={styles.itemTextos}>
                  <Text style={styles.itemTitulo}>{item.nome}</Text>
                  <Text style={styles.itemSubtitulo}>Vai entrar já criado</Text>
                </View>
                <PressableScale
                  onPress={() => removerFixoCustom(item.id)}
                  scaleTo={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${item.nome}`}
                  style={styles.botaoRemover}
                >
                  <Icon name="excluir" size={14} color={theme.red} />
                </PressableScale>
              </View>

              <View style={styles.itemLinhaValor}>
                <Text style={styles.rotuloMini}>Valor por mês</Text>
                {campoDeDinheiro(item.valorText, (v) => atualizarFixoCustomValor(item.id, v), 'linha', {
                  aceso: true,
                })}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {!isEEARStudent && customFixedItems.length === 0
        ? secaoVazia('Nenhum gasto fixo ainda. Dá para pular este passo e criar depois, dentro do app.')
        : null}

      <View style={styles.blocoCriar}>
        {cabecalhoDeCriar('aba_fixo', 'Novo gasto fixo', 'Entra criado e se repete todo mês.')}

        <TextInput
          value={newCustomFixedName}
          onChangeText={setNewCustomFixedName}
          placeholder="Aluguel, internet, academia..."
          placeholderTextColor={theme.faint}
          style={styles.campoTexto}
          returnKeyType="done"
          onSubmitEditing={adicionarNovoFixo}
          onBlur={dismissKeyboard}
          blurOnSubmit
        />

        {/* Valor e botao na mesma linha: empilhados, o bloco ficava com tres
            caixas iguais uma embaixo da outra e cara de formulario. */}
        <View style={styles.criarLinhaFinal}>
          {campoDeDinheiro(
            newCustomFixedValue,
            (value) =>
              handleMaskedMoneyInput(value, setNewCustomFixedValue, { prefix: false, emptyAsBlank: false }),
            'metade'
          )}
          <PressableScale
            onPress={adicionarNovoFixo}
            disabled={!newCustomFixedName.trim()}
            scaleTo={0.96}
            accessibilityRole="button"
            accessibilityLabel="Adicionar gasto fixo"
            style={[styles.botaoCriar, !newCustomFixedName.trim() && styles.botaoDesabilitado]}
          >
            <Icon name="adicionar" size={15} color={theme.textInverse} />
            <Text style={styles.botaoCriarTexto}>Adicionar</Text>
          </PressableScale>
        </View>
      </View>
    </>
  )

  const passoCategorias = (
    <>
      <View style={styles.blocoLista}>
        <View style={styles.gradeChips}>
          {[...categoriasVariaveisBase, ...customVariableCategories].map((categoria) => {
            const ativo = selectedVariableCategories.includes(categoria)
            const proprio = customVariableCategories.includes(categoria)
            return (
              <View key={categoria} style={[styles.chipWrap, ativo && styles.chipWrapAtivo]}>
                <PressableScale
                  onPress={() => toggleVariableCategory(categoria)}
                  scaleTo={0.96}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: ativo }}
                  accessibilityLabel={categoria}
                  style={styles.chipToque}
                >
                  {ativo ? (
                    <Icon name="confirmar" size={12} color={theme.textInverse} />
                  ) : (
                    <View style={styles.chipPonto} />
                  )}
                  <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{categoria}</Text>
                </PressableScale>
                {proprio ? (
                  <PressableScale
                    onPress={() => removerCategoriaVariavelCustom(categoria)}
                    scaleTo={0.9}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${categoria}`}
                    style={styles.chipRemover}
                  >
                    <Icon name="excluir" size={12} color={ativo ? theme.textInverse : theme.muted} />
                  </PressableScale>
                ) : null}
              </View>
            )
          })}
        </View>
      </View>

      <View style={styles.blocoCriar}>
        {cabecalhoDeCriar('aba_variavel', 'Criar outra categoria', 'Ela já entra marcada.')}

        {/* Uma pilula so, com o botao dentro: uma categoria e uma palavra, e
            um campo de formulario inteiro para ela era exagero. */}
        <View style={styles.pilulaCampo}>
          <TextInput
            value={newCustomVariableName}
            onChangeText={setNewCustomVariableName}
            placeholder="Pets, viagem, estudos..."
            placeholderTextColor={theme.faint}
            style={styles.pilulaInput}
            returnKeyType="done"
            onSubmitEditing={adicionarCategoriaVariavelCustom}
            onBlur={dismissKeyboard}
            blurOnSubmit
          />
          <PressableScale
            onPress={adicionarCategoriaVariavelCustom}
            disabled={!newCustomVariableName.trim()}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel="Criar categoria"
            style={[styles.pilulaBotao, !newCustomVariableName.trim() && styles.botaoDesabilitado]}
          >
            <Icon name="adicionar" size={17} color={theme.textInverse} />
          </PressableScale>
        </View>
      </View>
    </>
  )

  const passoCartoes = (
    <>
      <View style={styles.cartaoSuave}>
        <View style={styles.linhaInterruptor}>
          <View style={styles.linhaInterruptorTextos}>
            <Text style={styles.tituloMenor}>Tenho cartão de crédito</Text>
            <Text style={styles.subtituloMenor}>
              Desligado, o app começa sem a aba de cartões — e você liga quando quiser.
            </Text>
          </View>
          <Interruptor
            theme={theme}
            ativo={hasCreditCards}
            onAlternar={() => setHasCreditCards((antes) => !antes)}
          />
        </View>
      </View>

      {hasCreditCards ? (
        <>
          {cards.length > 0 ? (
            <View style={styles.blocoLista}>
              <Text style={styles.rotuloSecao}>Seus cartões</Text>
              {cards.map((item) => (
                <View key={item.id} style={styles.cartaoCentro}>
                  <CartaoEditavel
                    theme={theme}
                    corId={item.id}
                    largura={larguraDoCartao}
                    nome={item.nome}
                    onNome={(valor) => atualizarCartaoCampo(item.id, 'nome', valor)}
                    aoTerminarNome={dismissKeyboard}
                    fechamento={item.fechamentoText}
                    vencimento={item.vencimentoText}
                    onFechamento={() =>
                      abrirCalendarioCartao(
                        { id: item.id, field: 'fechamentoText' },
                        item.fechamentoText,
                        mesAtual
                      )
                    }
                    onVencimento={() =>
                      abrirCalendarioCartao(
                        { id: item.id, field: 'vencimentoText' },
                        item.vencimentoText,
                        Math.min(12, mesAtual + 1)
                      )
                    }
                    onRemover={() => removerCartao(item.id)}
                  />
                </View>
              ))}
            </View>
          ) : null}

          {/* O cartao novo tambem e um cartao, e nao um formulario ao lado de
              um: o que se ve enquanto digita ja e o resultado. */}
          <View style={styles.blocoNovoCartao}>
            <Text style={styles.rotuloSecao}>
              {cards.length > 0 ? 'Adicionar outro' : 'Seu primeiro cartão'}
            </Text>

            <View style={styles.cartaoCentro}>
              <CartaoEditavel
                theme={theme}
                corId={proximoCardId}
                largura={larguraDoCartao}
                nome={newCardName}
                onNome={setNewCardName}
                placeholderNome="Toque e escreva o nome"
                aoTerminarNome={adicionarCartao}
                fechamento={newCardClosing}
                vencimento={newCardDue}
                onFechamento={() => abrirCalendarioCartao('new_closing', newCardClosing, mesAtual)}
                onVencimento={() =>
                  abrirCalendarioCartao('new_due', newCardDue, Math.min(12, mesAtual + 1))
                }
              />
            </View>

            <Text style={styles.ajudaTexto}>
              As datas são opcionais — dá para completar depois, dentro do app.
            </Text>

            <PressableScale
              onPress={adicionarCartao}
              disabled={!newCardName.trim()}
              scaleTo={0.97}
              accessibilityRole="button"
              style={[styles.botaoAdicionar, !newCardName.trim() && styles.botaoDesabilitado]}
            >
              <Icon name="adicionar" size={15} color={theme.textInverse} />
              <Text style={styles.botaoAdicionarTexto}>Adicionar cartão</Text>
            </PressableScale>
          </View>
        </>
      ) : null}
    </>
  )

  const sobra = salario - totalFixosPreview

  /**
   * As etiquetas do resumo, agrupadas.
   *
   * Antes era uma fila unica com fixos, categorias e cartoes misturados —
   * "Aluguel", "Mercado" e "Nubank" lado a lado, sem dizer o que era o que.
   */
  const gruposDoResumo = [
    { rotulo: 'Gastos fixos', nomes: fixedItemsPreview.map((item) => item.nome) },
    { rotulo: 'Categorias', nomes: categoriasVariaveisPreview },
    { rotulo: 'Cartões', nomes: hasCreditCards ? cardsPreview.map((item) => item.nome) : [] },
  ].filter((grupo) => grupo.nomes.length > 0)

  const passoResumo = (
    <>
      <View style={styles.resumoCartao}>
        <View style={styles.resumoTopo}>
          <View style={styles.resumoTile}>
            <Text style={styles.resumoTileRotulo} numberOfLines={1}>
              Salário
            </Text>
            <Text style={styles.resumoTileValor} numberOfLines={1}>
              {formatarMoeda(salario)}
            </Text>
          </View>
          <View style={styles.resumoTile}>
            <Text style={styles.resumoTileRotulo} numberOfLines={1}>
              Fixos por mês
            </Text>
            <Text style={[styles.resumoTileValor, styles.resumoTileSaida]} numberOfLines={1}>
              {formatarMoeda(totalFixosPreview)}
            </Text>
          </View>
        </View>

        <View style={styles.resumoSobra}>
          <Text style={styles.resumoSobraRotulo}>Sobra estimada</Text>
          <Text style={[styles.resumoSobraValor, sobra < 0 && styles.resumoSobraNegativa]}>
            {formatarMoeda(sobra)}
          </Text>
        </View>

        <View style={styles.resumoContagens}>
          {[
            { icone: 'aba_fixo' as IconName, valor: fixedItemsPreview.length, rotulo: 'gastos fixos' },
            { icone: 'aba_variavel' as IconName, valor: categoriasVariaveisPreview.length, rotulo: 'categorias' },
            { icone: 'cartao' as IconName, valor: hasCreditCards ? cardsPreview.length : 0, rotulo: 'cartões' },
          ].map((linha) => (
            <View key={linha.rotulo} style={styles.resumoContagem}>
              <Icon name={linha.icone} size={14} color={theme.primary} />
              <Text style={styles.resumoContagemValor}>{linha.valor}</Text>
              <Text style={styles.resumoContagemRotulo}>{linha.rotulo}</Text>
            </View>
          ))}
        </View>

        {gruposDoResumo.length ? (
          <View style={styles.resumoGrupos}>
            {gruposDoResumo.map((grupo) => (
              <View key={grupo.rotulo}>
                <Text style={styles.resumoGrupoRotulo}>{grupo.rotulo}</Text>
                <View style={styles.resumoEtiquetas}>
                  {grupo.nomes.slice(0, 10).map((nome, i) => (
                    <View key={`${nome}-${i}`} style={styles.resumoEtiqueta}>
                      <Text style={styles.resumoEtiquetaTexto} numberOfLines={1}>
                        {nome}
                      </Text>
                    </View>
                  ))}
                  {grupo.nomes.length > 10 ? (
                    <View style={styles.resumoEtiqueta}>
                      <Text style={styles.resumoEtiquetaTexto}>+{grupo.nomes.length - 10}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.resumoVazio}>
            Nada marcado além do salário — e está tudo bem. O resto se monta dentro do app.
          </Text>
        )}
      </View>

      <View style={styles.cartaoSuave}>
        <Text style={styles.subtituloMenor}>
          Tudo isso é editável depois: valores, nomes, categorias e cartões. Nada aqui trava nada.
        </Text>
      </View>
    </>
  )

  const corpoDoPasso = [passoSalario, passoFixos, passoCategorias, passoCartoes, passoResumo][passo]
  const passoAtual = PASSOS[passo]

  if (screenLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.carregandoWrap}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.carregandoTexto}>Preparando seu primeiro acesso...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Moldura simples de proposito. Aqui ja houve um Pressable de tela
          cheia para fechar o teclado, e ele engolia o gesto de rolar: quem
          arrastava tocava nele primeiro e a pagina parecia travada. Fechar o
          teclado e trabalho do ScrollView. */}
      <View style={styles.flex}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View
            style={[
              styles.topo,
              {
                paddingTop: Math.max(
                  insets.top + 6,
                  Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 10
                ),
              },
            ]}
          >
            <View style={styles.topoLinha}>
              <View style={styles.marca}>
                <View style={styles.marcaSelo}>
                  <Icon name="premium" size={10} color={theme.textInverse} />
                </View>
                <Text style={styles.marcaTexto}>Brazllet</Text>
              </View>
              <Text style={styles.contador}>
                {passo + 1}
                <Text style={styles.contadorFraco}> / {PASSOS.length}</Text>
              </Text>
            </View>

            <View style={styles.barraFundo}>
              <Animated.View style={[styles.barraFrente, estiloBarra]} />
            </View>

            {/* A trilha: o passo de agora vira uma pilula com o nome, os ja
                vistos ficam cheios e clicaveis, os que faltam ficam apagados.
                Cinco nomes lado a lado nao caberiam num celular estreito. */}
            <View style={styles.trilha}>
              {PASSOS.map((item, indice) => {
                const atual = indice === passo
                const visitado = indice < passo
                return (
                  <PressableScale
                    key={item.chave}
                    onPress={() => (visitado ? irParaPasso(indice) : undefined)}
                    disabled={!visitado}
                    scaleTo={0.9}
                    accessibilityRole="button"
                    accessibilityLabel={`Passo ${indice + 1}: ${item.curto}`}
                    accessibilityState={{ selected: atual }}
                    style={[
                      styles.trilhaItem,
                      atual && styles.trilhaItemAtual,
                      visitado && styles.trilhaItemVisitado,
                    ]}
                  >
                    {atual ? (
                      <Text style={styles.trilhaTexto} numberOfLines={1}>
                        {item.curto}
                      </Text>
                    ) : null}
                  </PressableScale>
                )
              })}
            </View>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.rolagem}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={dismissKeyboard}
            onMomentumScrollBegin={dismissKeyboard}
            overScrollMode="never"
          >
            <AppearIn key={`cab-${passoAtual.chave}`} index={0}>
              <View style={styles.passoCabecalho}>
                <View style={styles.passoIconeWrap}>
                  <Icon name={passoAtual.icone} size={17} color={theme.primary} />
                </View>
                {passo === 0 ? <Text style={styles.saudacao}>Olá, {name}</Text> : null}
                <Text style={styles.passoTitulo}>{passoAtual.titulo}</Text>
                <Text style={styles.passoSubtitulo}>{passoAtual.subtitulo}</Text>
              </View>
            </AppearIn>

            <AppearIn key={`corpo-${passoAtual.chave}`} index={1}>
              <View style={styles.passoCorpo}>{corpoDoPasso}</View>
            </AppearIn>
          </ScrollView>

          <View style={[styles.rodape, { paddingBottom: Math.max(insets.bottom + 10, 14) }]}>
            {erro ? <Text style={styles.erroTexto}>{erro}</Text> : null}

            <View style={styles.rodapeBotoes}>
              {passo > 0 ? (
                <PressableScale
                  onPress={() => irParaPasso(passo - 1)}
                  disabled={loading}
                  scaleTo={0.97}
                  accessibilityRole="button"
                  style={styles.botaoVoltar}
                >
                  <Icon name="seta_esquerda" size={15} color={theme.text} />
                  <Text style={styles.botaoVoltarTexto}>Voltar</Text>
                </PressableScale>
              ) : null}

              <PressableScale
                onPress={avancar}
                disabled={loading}
                scaleTo={0.98}
                accessibilityRole="button"
                style={[styles.botaoSeguir, loading && styles.botaoDesabilitado]}
              >
                {loading ? (
                  <ActivityIndicator color={theme.textInverse} />
                ) : (
                  <>
                    <Text style={styles.botaoSeguirTexto}>
                      {passo === ULTIMO_PASSO ? 'Entrar no app' : 'Continuar'}
                    </Text>
                    <Icon
                      name={passo === ULTIMO_PASSO ? 'confirmar' : 'seta_direita'}
                      size={15}
                      color={theme.textInverse}
                    />
                  </>
                )}
              </PressableScale>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* O mesmo calendario do resto do app: semanas alinhadas por coluna e o
          dia de hoje marcado. Antes esta tela tinha uma grade propria, com os
          meses em numeros e os dias soltos, sem semana nenhuma. */}
      <AppModal visible={calendarVisible} onClose={() => setCalendarVisible(false)} level={100}>
        <View style={styles.calendarioCartao}>
          <Text style={styles.calendarioTitulo}>Selecionar data</Text>

          <Calendario
            theme={theme}
            mes={calendarMes}
            ano={anoAtual}
            dia={calendarDia}
            onSelecionar={(dia, mes) => {
              setCalendarDia(dia)
              setCalendarMes(mes)
            }}
            onMudarMes={setCalendarMes}
          />

          <View style={styles.calendarioAcoes}>
            <PressableScale
              onPress={() => setCalendarVisible(false)}
              scaleTo={0.97}
              accessibilityRole="button"
              style={styles.calendarioBotaoSecundario}
            >
              <Text style={styles.calendarioBotaoSecundarioTexto}>Cancelar</Text>
            </PressableScale>
            <PressableScale
              onPress={confirmarCalendarioCartao}
              scaleTo={0.97}
              accessibilityRole="button"
              style={styles.calendarioBotaoPrimario}
            >
              <Text style={styles.calendarioBotaoPrimarioTexto}>Confirmar</Text>
            </PressableScale>
          </View>
        </View>
      </AppModal>
    </SafeAreaView>
  )
}

const criarEstilos = (theme: Tema) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    flex: { flex: 1 },

    carregandoWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
    carregandoTexto: { color: theme.primary, fontSize: 15, fontWeight: '800', textAlign: 'center' },

    // ---------------------------------------------------------------- topo
    topo: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      backgroundColor: theme.background,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    topoLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    marca: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    marcaSelo: {
      width: 20,
      height: 20,
      borderRadius: 999,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    marcaTexto: { fontSize: 15, fontWeight: '900', color: theme.text, letterSpacing: -0.4 },
    contador: { fontSize: 13, fontWeight: '900', color: theme.text },
    contadorFraco: { color: theme.faint, fontWeight: '700' },

    barraFundo: {
      height: 5,
      borderRadius: 999,
      backgroundColor: theme.backgroundSoft,
      overflow: 'hidden',
      marginTop: 11,
    },
    barraFrente: { height: 5, borderRadius: 999, backgroundColor: theme.primary },

    trilha: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
    trilhaItem: {
      height: 7,
      width: 7,
      borderRadius: 999,
      backgroundColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    trilhaItemVisitado: { backgroundColor: theme.primary, opacity: 0.55 },
    trilhaItemAtual: {
      width: 'auto',
      height: 22,
      paddingHorizontal: 11,
      backgroundColor: theme.accentSoft,
      borderWidth: 1,
      borderColor: theme.accent,
    },
    trilhaTexto: {
      fontSize: 10.5,
      fontWeight: '900',
      color: theme.accent,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },

    // ------------------------------------------------------------ conteudo
    rolagem: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 26 },

    passoCabecalho: { marginBottom: 20 },
    passoIconeWrap: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: theme.cardSoft,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 13,
    },
    saudacao: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.accent,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
      marginBottom: 7,
    },
    passoTitulo: { fontSize: 25, fontWeight: '900', color: theme.text, letterSpacing: -0.8, lineHeight: 30 },
    passoSubtitulo: { fontSize: 13.5, fontWeight: '600', color: theme.muted, lineHeight: 20, marginTop: 8 },
    passoCorpo: { gap: 14 },

    // ------------------------------------------------------------- blocos
    cartaoDestaque: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 18,
      shadowColor: theme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    cartaoSuave: {
      backgroundColor: theme.cardSoft,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 15,
    },
    blocoLista: { gap: 10 },
    blocoNovoCartao: {
      backgroundColor: theme.backgroundSoft,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      borderStyle: 'dashed',
      padding: 14,
      gap: 12,
    },
    blocoCriar: {
      backgroundColor: theme.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 14,
      gap: 11,
      shadowColor: theme.shadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 1,
    },
    criarCabecalho: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    criarSelo: {
      width: 36,
      height: 36,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.cardSoft,
      borderWidth: 1,
      borderColor: theme.border,
    },
    criarTextos: { flex: 1, minWidth: 0 },
    criarTitulo: { fontSize: 14, fontWeight: '900', color: theme.text, letterSpacing: -0.3 },
    criarSub: { fontSize: 11.5, fontWeight: '600', color: theme.muted, marginTop: 2 },
    criarLinhaFinal: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    botaoCriar: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      minHeight: 50,
      borderRadius: 16,
      backgroundColor: theme.primary,
    },
    botaoCriarTexto: { fontSize: 13.5, fontWeight: '900', color: theme.textInverse },

    pilulaCampo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 52,
      paddingLeft: 16,
      paddingRight: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSoft,
    },
    pilulaInput: {
      flex: 1,
      minWidth: 0,
      fontSize: 14.5,
      fontWeight: '700',
      color: theme.text,
      paddingVertical: 0,
    },
    pilulaBotao: {
      width: 42,
      height: 42,
      flexShrink: 0,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primary,
    },

    rotuloSecao: {
      fontSize: 10.5,
      fontWeight: '900',
      color: theme.muted,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    rotuloCampo: {
      fontSize: 10.5,
      fontWeight: '900',
      color: theme.muted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    rotuloMini: {
      flexShrink: 1,
      minWidth: 0,
      fontSize: 10.5,
      fontWeight: '800',
      color: theme.muted,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    ajudaTexto: { fontSize: 11.5, fontWeight: '600', color: theme.faint, lineHeight: 17, marginTop: 11 },
    vazioTexto: {
      fontSize: 12.5,
      fontWeight: '600',
      color: theme.muted,
      lineHeight: 19,
      paddingHorizontal: 4,
    },
    tituloMenor: { fontSize: 14.5, fontWeight: '900', color: theme.text, letterSpacing: -0.3 },
    subtituloMenor: { fontSize: 12, fontWeight: '600', color: theme.muted, lineHeight: 18, marginTop: 3 },

    linhaInterruptor: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    linhaInterruptorTextos: { flex: 1, minWidth: 0 },

    // ------------------------------------------------------------ dinheiro
    dinheiroWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 50,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      paddingHorizontal: 14,
    },
    dinheiroWrapGrande: { minHeight: 66, borderRadius: 18, borderWidth: 1.5 },
    dinheiroWrapLinha: { width: 150, flexShrink: 1, minWidth: 0, minHeight: 44 },
    dinheiroWrapMetade: { flex: 1, minWidth: 0 },
    dinheiroWrapAceso: { borderColor: theme.accent, backgroundColor: theme.accentSoft },
    dinheiroWrapErro: { borderColor: theme.red, borderWidth: 1.5 },
    dinheiroPrefixo: { fontSize: 14, fontWeight: '900', color: theme.primary, marginRight: 8 },
    dinheiroPrefixoGrande: { fontSize: 19, marginRight: 10 },
    dinheiroInput: {
      flex: 1,
      // Na web o campo vira um <input>, que tem largura natural de umas vinte
      // letras e nao encolhe sozinho. Sem isto a linha do valor passava da
      // borda do cartao e tocar nela jogava a pagina inteira para o lado.
      minWidth: 0,
      fontSize: 15,
      fontWeight: '800',
      color: theme.text,
      paddingVertical: 0,
    },
    dinheiroInputGrande: { fontSize: 27, fontWeight: '900', letterSpacing: -0.8 },

    campoTexto: {
      minHeight: 48,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      paddingHorizontal: 14,
      fontSize: 14.5,
      fontWeight: '700',
      color: theme.text,
    },

    // ------------------------------------------------------ item marcavel
    itemCartao: {
      backgroundColor: theme.card,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 13,
    },
    itemCartaoAtivo: { borderColor: theme.accent, backgroundColor: theme.card },
    itemLinhaTopo: { flexDirection: 'row', alignItems: 'center', gap: 11 },
    itemTextos: { flex: 1, minWidth: 0 },
    itemTitulo: { fontSize: 14.5, fontWeight: '900', color: theme.text, letterSpacing: -0.3 },
    itemSubtitulo: { fontSize: 11.5, fontWeight: '600', color: theme.muted, marginTop: 2 },
    itemLinhaValor: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 11,
    },
    marcador: {
      width: 24,
      height: 24,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: theme.border,
      backgroundColor: theme.cardSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    marcadorAtivo: { backgroundColor: theme.primary, borderColor: theme.primary },
    botaoRemover: {
      width: 32,
      height: 32,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // -------------------------------------------------------------- chips
    gradeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chipWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      overflow: 'hidden',
    },
    chipWrapAtivo: { borderColor: theme.primary, backgroundColor: theme.primary },
    chipToque: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingLeft: 12,
      paddingRight: 14,
      minHeight: 40,
    },
    chipPonto: { width: 12, height: 12, borderRadius: 999, borderWidth: 1.5, borderColor: theme.border },
    chipTexto: { fontSize: 13, fontWeight: '800', color: theme.text },
    chipTextoAtivo: { color: theme.textInverse },
    chipRemover: {
      minHeight: 40,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderLeftWidth: 1,
      borderLeftColor: 'rgba(127,127,127,0.28)',
    },

    // ------------------------------------------------------------ cartoes
    cartaoCentro: { alignItems: 'center' },

    // ------------------------------------------------------------- botoes
    botaoAdicionar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 48,
      borderRadius: 15,
      backgroundColor: theme.primary,
    },
    botaoAdicionarTexto: { fontSize: 13.5, fontWeight: '900', color: theme.textInverse },
    botaoDesabilitado: { opacity: 0.45 },

    // ------------------------------------------------------------- resumo
    resumoCartao: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      shadowColor: theme.shadow,
      shadowOpacity: 1,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    resumoTopo: { flexDirection: 'row', gap: 10 },
    resumoTile: {
      flex: 1,
      minWidth: 0,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSoft,
      paddingVertical: 11,
      paddingHorizontal: 12,
    },
    resumoTileRotulo: {
      fontSize: 10,
      fontWeight: '900',
      color: theme.muted,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    resumoTileValor: { fontSize: 17, fontWeight: '900', color: theme.green, letterSpacing: -0.5, marginTop: 5 },
    resumoTileSaida: { color: theme.red },

    resumoSobra: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 10,
      paddingVertical: 12,
      paddingHorizontal: 13,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.accent,
      backgroundColor: theme.accentSoft,
    },
    resumoSobraRotulo: {
      fontSize: 11,
      fontWeight: '900',
      color: theme.accent,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    resumoSobraValor: { fontSize: 19, fontWeight: '900', color: theme.accent, letterSpacing: -0.6 },
    resumoSobraNegativa: { color: theme.red },

    resumoContagens: { flexDirection: 'row', gap: 8, marginTop: 12 },
    resumoContagem: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      gap: 3,
      paddingVertical: 11,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSoft,
    },
    resumoContagemValor: { fontSize: 16, fontWeight: '900', color: theme.text },
    resumoContagemRotulo: {
      fontSize: 9.5,
      fontWeight: '800',
      color: theme.muted,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },

    resumoGrupos: { gap: 12, marginTop: 15 },
    resumoGrupoRotulo: {
      fontSize: 9.5,
      fontWeight: '900',
      color: theme.faint,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 7,
    },
    resumoEtiquetas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    resumoEtiqueta: {
      maxWidth: '100%',
      paddingVertical: 6,
      paddingHorizontal: 11,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSoft,
    },
    resumoEtiquetaTexto: { fontSize: 11.5, fontWeight: '800', color: theme.text },
    resumoVazio: { fontSize: 12, fontWeight: '600', color: theme.muted, lineHeight: 18, marginTop: 13 },

    // ------------------------------------------------------------- rodape
    rodape: {
      paddingHorizontal: 20,
      paddingTop: 12,
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    erroTexto: { fontSize: 12.5, fontWeight: '800', color: theme.red, marginBottom: 10 },
    rodapeBotoes: { flexDirection: 'row', gap: 10 },
    botaoVoltar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      minHeight: 52,
      paddingHorizontal: 18,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSoft,
    },
    botaoVoltarTexto: { fontSize: 14, fontWeight: '900', color: theme.text },
    botaoSeguir: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: theme.primary,
    },
    botaoSeguirTexto: { fontSize: 14.5, fontWeight: '900', color: theme.textInverse, letterSpacing: -0.2 },

    // --------------------------------------------------------- calendario
    calendarioCartao: {
      width: '100%',
      maxWidth: 380,
      alignSelf: 'center',
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 18,
    },
    calendarioTitulo: {
      fontSize: 16.5,
      fontWeight: '900',
      color: theme.text,
      letterSpacing: -0.4,
      marginBottom: 16,
    },
    calendarioAcoes: { flexDirection: 'row', gap: 10, marginTop: 16 },
    calendarioBotaoSecundario: {
      flex: 1,
      minHeight: 48,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.cardSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarioBotaoSecundarioTexto: { fontSize: 13.5, fontWeight: '900', color: theme.text },
    calendarioBotaoPrimario: {
      flex: 1,
      minHeight: 48,
      borderRadius: 15,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calendarioBotaoPrimarioTexto: { fontSize: 13.5, fontWeight: '900', color: theme.textInverse },
  })
