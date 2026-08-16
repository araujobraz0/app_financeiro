import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { supabase } from '../src/lib/supabase'
import {
  digitsToMoneyPlainString as digitsToMoneyString,
  handleMaskedMoneyInput,
  moneyStringToNumber,
} from '../src/utils/currency'
import {
  formatarDiaMesInput,
  formatarInputDiaMes,
  getDiasNoMes,
  meses,
  parseDiaMesInputOptional as parseDiaMesInput,
} from '../src/utils/dates'
import type { AppData, BancoDeDados, CardItem } from './types'

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

const STORAGE_KEY = 'controle-financeiro-v16'
const gastosFixosEEARBase: FixedPreset[] = [
  { id: 'fixo-comissao', nome: 'Comissão de formatura', valorText: '0,00', selected: false },
  { id: 'fixo-lavadeira', nome: 'Lavadeira', valorText: '0,00', selected: false },
  { id: 'fixo-fotos', nome: 'Empresa de fotos', valorText: '0,00', selected: false },
  { id: 'fixo-ct', nome: 'Centro de tradições', valorText: '0,00', selected: false },
]

const categoriasVariaveisBase = ['Mercado', 'Saúde', 'Transporte', 'Lazer', 'Comida', 'Extra']

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

function criarBancoInicial(salario: number, fixos: { nome: string; valor: number }[], categoriasVariaveis: string[]) {
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
        fixo: fixos.map((item, index) => ({
          id: `fixo-${ano}-${mes}-${index}`,
          nome: item.nome,
          valor: item.valor,
          pago: false,
        })),
        saidas: [],
        categoriasSaidas: [...categoriasVariaveis],
      }
    })
  })

  return banco
}

export default function PrimeiroAcessoScreen() {
  const insets = useSafeAreaInsets()
  const [loading, setLoading] = useState(false)
  const [screenLoading, setScreenLoading] = useState(true)
  const [name, setName] = useState('')
  const [erro, setErro] = useState('')
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
  const [calendarVisible, setCalendarVisible] = useState(false)
  const [calendarTarget, setCalendarTarget] = useState<'new_closing' | 'new_due' | { id: string; field: 'fechamentoText' | 'vencimentoText' }>('new_closing')
  const anoAtual = new Date().getFullYear()
  const mesAtual = new Date().getMonth() + 1
  const diaAtual = new Date().getDate()
  const [calendarDia, setCalendarDia] = useState(diaAtual)
  const [calendarMes, setCalendarMes] = useState(mesAtual)

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
      } catch {
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
      {
        id: createId('fixo-custom'),
        nome,
        valorText: newCustomFixedValue || '0,00',
      },
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
        item.id === id
          ? {
              ...item,
              valorText: digitsToMoneyString(rawValue.replace(/\D/g, '')),
            }
          : item
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
        id: createId('card'),
        nome,
        fechamentoText: formatarInputDiaMes(newCardClosing),
        vencimentoText: formatarInputDiaMes(newCardDue),
      },
    ])

    setNewCardName('')
    setNewCardClosing('')
    setNewCardDue('')
    dismissKeyboard()
  }

  const removerCartao = (id: string) => {
    setCards((prev) => prev.filter((item) => item.id !== id))
  }

  const atualizarCartaoCampo = (id: string, campo: 'nome' | 'fechamentoText' | 'vencimentoText', valor: string) => {
    setCards((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [campo]: campo === 'nome' ? valor : formatarInputDiaMes(valor),
            }
          : item
      )
    )
  }

  const abrirCalendarioCartao = (target: 'new_closing' | 'new_due' | { id: string; field: 'fechamentoText' | 'vencimentoText' }, rawValue: string, fallbackMonth?: number) => {
    dismissKeyboard()
    const parsed = parseDiaMesInput(rawValue || '', fallbackMonth || mesAtual, anoAtual)
    setCalendarDia(parsed.dia || diaAtual)
    setCalendarMes(parsed.mes || fallbackMonth || mesAtual)
    setCalendarTarget(target)
    setCalendarVisible(true)
  }

  const confirmarCalendarioCartao = () => {
    const dataFormatada = formatarDiaMesInput(calendarDia, calendarMes, anoAtual)

    if (calendarTarget === 'new_closing') {
      setNewCardClosing(dataFormatada)
    } else if (calendarTarget === 'new_due') {
      setNewCardDue(dataFormatada)
    } else {
      atualizarCartaoCampo(calendarTarget.id, calendarTarget.field, dataFormatada)
    }

    setCalendarVisible(false)
  }

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

      const salario = moneyStringToNumber(salarioText)

      if (!salario || salario <= 0) {
        setErro('Preencha um salário válido para continuar.')
        setLoading(false)
        return
      }

      const payload: AppData = {
        bancoDeDados: criarBancoInicial(salario, fixedItemsPreview, categoriasVariaveisPreview),
        global: {
          firstAccessCompleted: true,
          salaryMode: 'fixo',
          defaultFixedSalary: salario,
          onboardingFixedExpenses: fixedItemsPreview.map((item) => item.nome),
          pixContacts: [],
          notes: [],
          cards: hasCreditCards ? cardsPreview : [],
          profileAvatar: '💼',
          profileName: name,
          goals: [],
          shoppingWishes: [],
          investmentPercentage: 10,
          investmentBaseMode: 'salary',
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
    } catch {
      setErro('Não foi possível concluir o primeiro acesso.')
    } finally {
      setLoading(false)
    }
  }

  if (screenLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size='large' color='#c7a24b' />
          <Text style={styles.loadingText}>Carregando seu setup inicial...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Pressable style={styles.flex} onPress={dismissKeyboard}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: Math.max(insets.top + 2, Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 4 : 8),
                paddingBottom: Math.max(insets.bottom + 34, 42),
              },
            ]}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps='handled'
            keyboardDismissMode='on-drag'
            scrollEventThrottle={16}
            onScrollBeginDrag={dismissKeyboard}
            onMomentumScrollBegin={dismissKeyboard}
            contentInsetAdjustmentBehavior='always'
            overScrollMode='never'
          >
            <View style={styles.headerWrap}>
              <Text style={styles.badge}>Primeiro acesso</Text>
              <Text style={styles.brand}>Brazllet</Text>
              <Text style={styles.headerTitle}>Monte sua base financeira inicial, {name}</Text>
              <Text style={styles.headerSubtitle}>
                Configure seu salário, seus gastos e seus cartões. Depois você poderá editar tudo normalmente no app.
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Salário mensal</Text>
                <Text style={styles.sectionSubtitle}>Esse campo é obrigatório e será usado como base inicial do app.</Text>
                <Text style={styles.label}>Salário</Text>
                <View style={styles.moneyInputWrap}>
                  <Text style={styles.moneyPrefix}>R$</Text>
                  <TextInput
                    value={salarioText}
                    onChangeText={(value) => handleMaskedMoneyInput(value, setSalarioText, { prefix: false, emptyAsBlank: false })}
                    keyboardType='number-pad'
                    placeholder='0,00'
                    placeholderTextColor='#93a094'
                    style={styles.moneyInput}
                    returnKeyType='done'
                    onSubmitEditing={dismissKeyboard}
                    onBlur={dismissKeyboard}
                    blurOnSubmit
                  />
                </View>
              </View>

              <View style={[styles.sectionBlock, styles.sectionBlockSoft]}>
                <View style={styles.switchHeaderRow}>
                  <View style={styles.switchTextWrap}>
                    <Text style={styles.sectionTitleCompact}>Aluno da EEAR</Text>
                    <Text style={styles.sectionSubtitleCompact}>
                      Ative para receber sugestões prontas de gastos comuns desse contexto.
                    </Text>
                  </View>
                  <Switch
                    value={isEEARStudent}
                    onValueChange={setIsEEARStudent}
                    thumbColor={isEEARStudent ? '#ffffff' : '#f4efe4'}
                    trackColor={{ false: '#c9cfca', true: '#1f5a34' }}
                  />
                </View>
              </View>

              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderTextWrap}>
                    <Text style={styles.sectionTitle}>Gastos fixos</Text>
                    <Text style={styles.sectionSubtitle}>
                      Selecione apenas o que você quer que já entre criado. Você pode alterar os valores depois.
                    </Text>
                  </View>
                  <View style={styles.sectionPill}>
                    <Text style={styles.sectionPillText}>{fixedItemsPreview.length} selecionado(s)</Text>
                  </View>
                </View>

                {isEEARStudent && (
                  <View style={styles.fixedPremiumStack}>
                    {fixedPresets.map((item) => (
                      <Pressable
                        key={item.id}
                        style={[styles.fixedPremiumCard, item.selected && styles.fixedPremiumCardActive]}
                        onPress={() => toggleFixedPreset(item.id)}
                      >
                        <View style={styles.fixedPremiumGlow} />
                        <View style={styles.fixedTopRow}>
                          <View style={[styles.checkbox, item.selected && styles.checkboxActive]}>
                            <Text style={[styles.checkboxText, item.selected && styles.checkboxTextActive]}>{item.selected ? '✓' : ''}</Text>
                          </View>
                          <View style={styles.fixedTitleWrap}>
                            <Text style={styles.fixedPremiumTitle}>{item.nome}</Text>
                            <Text style={styles.fixedPremiumSubtitle}>Gasto fixo sugerido para quem marcou EEAR.</Text>
                          </View>
                        </View>

                        <View style={styles.fixedValueRow}>
                          <Text style={styles.optionValueLabel}>Valor inicial</Text>
                          <View style={[styles.moneyInputWrap, styles.moneyInputWrapSmall, item.selected && styles.moneyInputWrapActive]}>
                            <Text style={styles.moneyPrefix}>R$</Text>
                            <TextInput
                              value={item.valorText}
                              onChangeText={(value) => setFixedPresetValue(item.id, value)}
                              keyboardType='number-pad'
                              placeholder='0,00'
                              placeholderTextColor='#93a094'
                              style={styles.moneyInput}
                              returnKeyType='done'
                              onSubmitEditing={dismissKeyboard}
                              onBlur={dismissKeyboard}
                              blurOnSubmit
                            />
                          </View>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                <View style={styles.addBlockPremium}>
                  <View style={styles.addBlockHeader}>
                    <Text style={styles.addBlockTitle}>Adicionar novo gasto fixo</Text>
                    <Text style={styles.addBlockSub}>Crie quantos quiser já no primeiro acesso.</Text>
                  </View>

                  <TextInput
                    value={newCustomFixedName}
                    onChangeText={setNewCustomFixedName}
                    placeholder='Nome do gasto fixo'
                    placeholderTextColor='#93a094'
                    style={styles.inputCompact}
                    returnKeyType='done'
                    onSubmitEditing={dismissKeyboard}
                    onBlur={dismissKeyboard}
                    blurOnSubmit
                  />

                  <View style={[styles.moneyInputWrap, styles.inputSpacingTopSmall]}>
                    <Text style={styles.moneyPrefix}>R$</Text>
                    <TextInput
                      value={newCustomFixedValue}
                      onChangeText={(value) => handleMaskedMoneyInput(value, setNewCustomFixedValue, { prefix: false, emptyAsBlank: false })}
                      keyboardType='number-pad'
                      placeholder='0,00'
                      placeholderTextColor='#93a094'
                      style={styles.moneyInput}
                      returnKeyType='done'
                      onSubmitEditing={dismissKeyboard}
                      onBlur={dismissKeyboard}
                      blurOnSubmit
                    />
                  </View>

                  <Pressable style={styles.addButtonPremium} onPress={adicionarNovoFixo}>
                    <Text style={styles.addButtonText}>+ Adicionar gasto fixo</Text>
                  </Pressable>
                </View>

                {customFixedItems.length > 0 && (
                  <View style={styles.optionStackCompact}>
                    {customFixedItems.map((item) => (
                      <View key={item.id} style={styles.customFixedCard}>
                        <View style={styles.customCardHeader}>
                          <Text style={styles.optionTitle}>{item.nome}</Text>
                          <Pressable onPress={() => removerFixoCustom(item.id)}>
                            <Text style={styles.removeText}>Remover</Text>
                          </Pressable>
                        </View>
                        <View style={styles.moneyInputWrap}>
                          <Text style={styles.moneyPrefix}>R$</Text>
                          <TextInput
                            value={item.valorText}
                            onChangeText={(value) => atualizarFixoCustomValor(item.id, value)}
                            keyboardType='number-pad'
                            placeholder='0,00'
                            placeholderTextColor='#93a094'
                            style={styles.moneyInput}
                            returnKeyType='done'
                            onSubmitEditing={dismissKeyboard}
                            onBlur={dismissKeyboard}
                            blurOnSubmit
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.sectionBlock}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionHeaderTextWrap}>
                    <Text style={styles.sectionTitle}>Gastos variáveis</Text>
                    <Text style={styles.sectionSubtitle}>Marque as categorias que você quer deixar prontas desde o primeiro uso.</Text>
                  </View>
                  <View style={styles.sectionPillAlt}>
                    <Text style={styles.sectionPillAltText}>{categoriasVariaveisPreview.length} categoria(s)</Text>
                  </View>
                </View>

                <View style={styles.chipGrid}>
                  {categoriasVariaveisBase.map((categoria) => {
                    const ativo = selectedVariableCategories.includes(categoria)
                    return (
                      <Pressable
                        key={categoria}
                        onPress={() => toggleVariableCategory(categoria)}
                        style={[styles.chip, ativo && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, ativo && styles.chipTextActive]}>{categoria}</Text>
                      </Pressable>
                    )
                  })}
                  {customVariableCategories.map((categoria) => {
                    const ativo = selectedVariableCategories.includes(categoria)
                    return (
                      <View key={categoria} style={[styles.customChipWrap, ativo && styles.customChipWrapActive]}>
                        <Pressable onPress={() => toggleVariableCategory(categoria)} style={styles.customChipPressable}>
                          <Text style={[styles.chipText, ativo && styles.chipTextActive]}>{categoria}</Text>
                        </Pressable>
                        <Pressable onPress={() => removerCategoriaVariavelCustom(categoria)} style={styles.customChipRemoveBtn}>
                          <Text style={[styles.customChipRemoveText, ativo && styles.chipTextActive]}>×</Text>
                        </Pressable>
                      </View>
                    )
                  })}
                </View>

                <View style={styles.addInlineRow}>
                  <TextInput
                    value={newCustomVariableName}
                    onChangeText={setNewCustomVariableName}
                    placeholder='Adicionar outra categoria'
                    placeholderTextColor='#93a094'
                    style={[styles.inputCompact, styles.inlineInput]}
                    returnKeyType='done'
                    onSubmitEditing={adicionarCategoriaVariavelCustom}
                    onBlur={dismissKeyboard}
                    blurOnSubmit
                  />
                  <Pressable style={styles.inlineAddButton} onPress={adicionarCategoriaVariavelCustom}>
                    <Text style={styles.inlineAddButtonText}>+</Text>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.sectionBlock, styles.sectionBlockSoft]}>
                <View style={styles.switchHeaderRow}>
                  <View style={styles.switchTextWrap}>
                    <Text style={styles.sectionTitleCompact}>Cartões de crédito</Text>
                    <Text style={styles.sectionSubtitleCompact}>
                      Ative se você já quiser entrar no app com seus cartões cadastrados.
                    </Text>
                  </View>
                  <Switch
                    value={hasCreditCards}
                    onValueChange={setHasCreditCards}
                    thumbColor={hasCreditCards ? '#ffffff' : '#f4efe4'}
                    trackColor={{ false: '#c9cfca', true: '#1f5a34' }}
                  />
                </View>
              </View>

              {hasCreditCards && (
                <View style={styles.sectionBlock}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionHeaderTextWrap}>
                      <Text style={styles.sectionTitle}>Adicionar cartões</Text>
                      <Text style={styles.sectionSubtitle}>
                        Você pode preencher fechamento e vencimento agora ou deixar em branco para completar depois.
                      </Text>
                    </View>
                    <View style={styles.sectionPillAlt}>
                      <Text style={styles.sectionPillAltText}>{cardsPreview.length} cartão(ões)</Text>
                    </View>
                  </View>

                  <View style={styles.addBlockPremium}>
                    <View style={styles.addBlockHeader}>
                      <Text style={styles.addBlockTitle}>Novo cartão</Text>
                      <Text style={styles.addBlockSub}>Cadastre quantos quiser no seu setup inicial.</Text>
                    </View>

                    <TextInput
                      value={newCardName}
                      onChangeText={setNewCardName}
                      placeholder='Nome do cartão'
                      placeholderTextColor='#93a094'
                      style={styles.inputCompact}
                      returnKeyType='done'
                      onSubmitEditing={dismissKeyboard}
                      onBlur={dismissKeyboard}
                      blurOnSubmit
                    />

                    <View style={styles.dayGrid}>
                      <View style={styles.dayFieldWrap}>
                        <Text style={styles.label}>Fechamento da fatura</Text>
                        <View style={styles.dayInputWrap}>
                          <TextInput
                            value={newCardClosing}
                            onChangeText={(value) => setNewCardClosing(formatarInputDiaMes(value))}
                            keyboardType='number-pad'
                            placeholder='DD/MM'
                            placeholderTextColor='#93a094'
                            style={styles.dayInput}
                            returnKeyType='done'
                            onSubmitEditing={dismissKeyboard}
                            onBlur={dismissKeyboard}
                            blurOnSubmit
                          />
                          <Pressable onPress={() => abrirCalendarioCartao('new_closing', newCardClosing, mesAtual)} style={styles.calendarBtn}>
                            <Text style={styles.calendarBtnText}>📅</Text>
                          </Pressable>
                        </View>
                      </View>

                      <View style={styles.dayFieldWrap}>
                        <Text style={styles.label}>Vencimento</Text>
                        <View style={styles.dayInputWrap}>
                          <TextInput
                            value={newCardDue}
                            onChangeText={(value) => setNewCardDue(formatarInputDiaMes(value))}
                            keyboardType='number-pad'
                            placeholder='DD/MM'
                            placeholderTextColor='#93a094'
                            style={styles.dayInput}
                            returnKeyType='done'
                            onSubmitEditing={dismissKeyboard}
                            onBlur={dismissKeyboard}
                            blurOnSubmit
                          />
                          <Pressable onPress={() => abrirCalendarioCartao('new_due', newCardDue, Math.min(12, mesAtual + 1))} style={styles.calendarBtn}>
                            <Text style={styles.calendarBtnText}>📅</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.helperText}>Deixe os campos de dia vazios se preferir preencher depois.</Text>

                    <Pressable style={styles.addButtonPremium} onPress={adicionarCartao}>
                      <Text style={styles.addButtonText}>+ Adicionar cartão</Text>
                    </Pressable>
                  </View>

                  {cards.length > 0 && (
                    <View style={styles.optionStackCompact}>
                      {cards.map((item) => (
                        <View key={item.id} style={styles.cardItemBox}>
                          <View style={styles.customCardHeader}>
                            <Text style={styles.optionTitle}>{item.nome || 'Cartão sem nome'}</Text>
                            <Pressable onPress={() => removerCartao(item.id)}>
                              <Text style={styles.removeText}>Remover</Text>
                            </Pressable>
                          </View>

                          <TextInput
                            value={item.nome}
                            onChangeText={(value) => atualizarCartaoCampo(item.id, 'nome', value)}
                            placeholder='Nome do cartão'
                            placeholderTextColor='#93a094'
                            style={[styles.inputCompact, styles.cardItemInput]}
                            returnKeyType='done'
                            onSubmitEditing={dismissKeyboard}
                            onBlur={dismissKeyboard}
                            blurOnSubmit
                          />

                          <View style={styles.dayGrid}>
                            <View style={styles.dayFieldWrap}>
                              <Text style={styles.label}>Fechamento</Text>
                              <View style={styles.dayInputWrap}>
                                <TextInput
                                  value={item.fechamentoText}
                                  onChangeText={(value) => atualizarCartaoCampo(item.id, 'fechamentoText', value)}
                                  keyboardType='number-pad'
                                  placeholder='DD/MM'
                                  placeholderTextColor='#93a094'
                                  style={styles.dayInput}
                                  returnKeyType='done'
                                  onSubmitEditing={dismissKeyboard}
                                  onBlur={dismissKeyboard}
                                  blurOnSubmit
                                />
                              </View>
                            </View>

                            <View style={styles.dayFieldWrap}>
                              <Text style={styles.label}>Vencimento</Text>
                              <View style={styles.dayInputWrap}>
                                <TextInput
                                  value={item.vencimentoText}
                                  onChangeText={(value) => atualizarCartaoCampo(item.id, 'vencimentoText', value)}
                                  keyboardType='number-pad'
                                  placeholder='DD/MM'
                                  placeholderTextColor='#93a094'
                                  style={styles.dayInput}
                                  returnKeyType='done'
                                  onSubmitEditing={dismissKeyboard}
                                  onBlur={dismissKeyboard}
                                  blurOnSubmit
                                />
                              </View>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={[styles.summaryCard, styles.sectionBlockSoft]}>
                <Text style={styles.summaryTitle}>Resumo inicial</Text>
                <Text style={styles.summaryLine}>• Salário base: R$ {salarioText}</Text>
                <Text style={styles.summaryLine}>
                  • Total estimado de fixos: R$ {totalFixosPreview.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text style={styles.summaryLine}>
                  • Gastos fixos criados: {fixedItemsPreview.length ? fixedItemsPreview.map((item) => item.nome).join(', ') : 'Nenhum por enquanto'}
                </Text>
                <Text style={styles.summaryLine}>
                  • Categorias variáveis criadas: {categoriasVariaveisPreview.length ? categoriasVariaveisPreview.join(', ') : 'Nenhuma por enquanto'}
                </Text>
                <Text style={styles.summaryLine}>
                  • Cartões cadastrados: {hasCreditCards ? (cardsPreview.length ? cardsPreview.map((item) => item.nome).join(', ') : 'Nenhum ainda') : 'Não'}
                </Text>
              </View>

              {!!erro && <Text style={styles.errorText}>{erro}</Text>}

              <Pressable style={[styles.submitButton, loading && styles.submitButtonDisabled]} onPress={handleContinue} disabled={loading}>
                {loading ? <ActivityIndicator color='#ffffff' /> : <Text style={styles.submitButtonText}>Concluir primeiro acesso</Text>}
              </Pressable>
            </View>


            <Modal
              visible={calendarVisible}
              transparent
              animationType='fade'
              onRequestClose={() => setCalendarVisible(false)}
            >
              <Pressable style={styles.calendarOverlay} onPress={() => setCalendarVisible(false)}>
                <Pressable style={styles.calendarModalCard} onPress={() => {}}>
                  <Text style={styles.calendarModalTitle}>Selecionar data</Text>
                  <View style={styles.calendarSection}>
                    <Text style={styles.label}>Mês</Text>
                    <View style={styles.calendarMonthsGrid}>
                      {meses.map((mesNome, index) => {
                        const mesNumero = index + 1
                        const ativo = calendarMes === mesNumero
                        return (
                          <Pressable
                            key={mesNome}
                            onPress={() => {
                              setCalendarMes(mesNumero)
                              setCalendarDia((prev) => Math.min(prev, getDiasNoMes(anoAtual, mesNumero)))
                            }}
                            style={[styles.calendarMonthBtn, ativo && styles.calendarMonthBtnActive]}
                          >
                            <Text style={[styles.calendarMonthText, ativo && styles.calendarMonthTextActive]}>{String(mesNumero).padStart(2, '0')}</Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>

                  <View style={styles.calendarSection}>
                    <Text style={styles.label}>Dia</Text>
                    <View style={styles.calendarDaysGrid}>
                      {Array.from({ length: getDiasNoMes(anoAtual, calendarMes) }, (_, i) => i + 1).map((dia) => {
                        const ativo = calendarDia === dia
                        return (
                          <Pressable key={dia} onPress={() => setCalendarDia(dia)} style={[styles.calendarDayBtn, ativo && styles.calendarDayBtnActive]}>
                            <Text style={[styles.calendarDayText, ativo && styles.calendarDayTextActive]}>{String(dia).padStart(2, '0')}</Text>
                          </Pressable>
                        )
                      })}
                    </View>
                  </View>

                  <Text style={styles.calendarSelectedText}>Selecionado: {formatarDiaMesInput(calendarDia, calendarMes, anoAtual)}</Text>

                  <View style={styles.calendarActions}>
                    <Pressable style={styles.calendarSecondaryButton} onPress={() => setCalendarVisible(false)}>
                      <Text style={styles.calendarSecondaryButtonText}>Cancelar</Text>
                    </Pressable>
                    <Pressable style={styles.calendarPrimaryButton} onPress={confirmarCalendarioCartao}>
                      <Text style={styles.calendarPrimaryButtonText}>Confirmar</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>

            <View style={[styles.safeBottomBar, { height: Math.max(insets.bottom + 10, 20) }]} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Pressable>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f5f0',
  },
  flex: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: '#1b3f2a',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  safeBottomBar: {
    marginTop: 14,
  },
  headerWrap: {
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 14,
  },
  badge: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    color: '#b89238',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  brand: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
    color: '#1f5a34',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: '#17361f',
    textAlign: 'center',
  },
  headerSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#6f7c67',
    textAlign: 'center',
    maxWidth: 560,
  },
  card: {
    backgroundColor: '#fffdf8',
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd3be',
    shadowColor: '#312911',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  sectionBlock: {
    marginBottom: 16,
  },
  sectionBlockSoft: {
    backgroundColor: '#f7f3e8',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e3d6bb',
  },
  switchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchTextWrap: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 2,
  },
  sectionHeaderTextWrap: {
    flex: 1,
  },
  sectionPill: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#f4ead0',
    borderWidth: 1,
    borderColor: '#e1c98a',
  },
  sectionPillText: {
    color: '#8a6a1a',
    fontSize: 11,
    fontWeight: '900',
  },
  sectionPillAlt: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#e8f3eb',
    borderWidth: 1,
    borderColor: '#cae1d0',
  },
  sectionPillAltText: {
    color: '#1f5a34',
    fontSize: 11,
    fontWeight: '900',
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    color: '#17361f',
    marginBottom: 5,
  },
  sectionTitleCompact: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
    color: '#17361f',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#6f7c67',
    marginBottom: 10,
  },
  sectionSubtitleCompact: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6f7c67',
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#5f6e64',
    marginBottom: 7,
  },
  helperText: {
    marginTop: 8,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#6f7c67',
  },
  inputCompact: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d7d4c9',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '700',
    color: '#17361f',
  },
  moneyInputWrap: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d7d4c9',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  moneyInputWrapSmall: {
    minHeight: 46,
  },
  moneyInputWrapActive: {
    borderColor: '#c7a24b',
    backgroundColor: '#fffaf0',
  },
  moneyPrefix: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1f5a34',
    marginRight: 8,
  },
  moneyInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#17361f',
    paddingVertical: 0,
  },
  inputSpacingTopSmall: {
    marginTop: 10,
  },
  fixedPremiumStack: {
    gap: 10,
    marginBottom: 12,
  },
  fixedPremiumCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e1d7c3',
    borderRadius: 22,
    padding: 12,
    backgroundColor: '#fffdf8',
    shadowColor: '#312911',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  fixedPremiumGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: '#f8edd0',
    opacity: 0.7,
  },
  fixedPremiumCardActive: {
    borderColor: '#c7a24b',
    backgroundColor: '#fffcf4',
  },
  fixedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fixedTitleWrap: {
    flex: 1,
  },
  fixedPremiumTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#17361f',
  },
  fixedPremiumSubtitle: {
    marginTop: 3,
    fontSize: 11.5,
    lineHeight: 16,
    color: '#6f7c67',
  },
  fixedValueRow: {
    marginTop: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#c9b686',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#1f5a34',
    borderColor: '#1f5a34',
  },
  checkboxText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
  },
  checkboxTextActive: {
    color: '#ffffff',
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#17361f',
  },
  optionStackCompact: {
    gap: 10,
    marginTop: 10,
  },
  optionValueLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#5f6e64',
    marginBottom: 7,
  },
  addBlockPremium: {
    marginTop: 4,
    padding: 12,
    borderRadius: 22,
    backgroundColor: '#f7f3e8',
    borderWidth: 1,
    borderColor: '#e3d6bb',
  },
  addBlockHeader: {
    marginBottom: 10,
  },
  addBlockTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#17361f',
    marginBottom: 3,
  },
  addBlockSub: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6f7c67',
  },
  addButtonPremium: {
    marginTop: 10,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: '#b89238',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  customFixedCard: {
    borderWidth: 1,
    borderColor: '#ddd3be',
    borderRadius: 20,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  customCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  removeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#c24f4f',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd3be',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: '#1f5a34',
    borderColor: '#1f5a34',
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#17361f',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  customChipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd3be',
    borderRadius: 999,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  customChipWrapActive: {
    backgroundColor: '#1f5a34',
    borderColor: '#1f5a34',
  },
  customChipPressable: {
    paddingLeft: 12,
    paddingVertical: 9,
  },
  customChipRemoveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  customChipRemoveText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#17361f',
  },
  addInlineRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  inlineInput: {
    flex: 1,
  },
  inlineAddButton: {
    width: 48,
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: '#b89238',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAddButtonText: {
    fontSize: 22,
    lineHeight: 22,
    fontWeight: '900',
    color: '#ffffff',
  },
  dayGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  dayFieldWrap: {
    flex: 1,
  },
  dayInputWrap: {
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d7d4c9',
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    paddingLeft: 14,
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#17361f',
    paddingVertical: 0,
  },
  calendarBtn: {
    width: 42,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d7d4c9',
    backgroundColor: '#f7f3e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarBtnText: {
    fontSize: 18,
  },
  cardItemBox: {
    borderWidth: 1,
    borderColor: '#ddd3be',
    borderRadius: 20,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  cardItemInput: {
    marginBottom: 2,
  },
  summaryCard: {
    marginTop: 2,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#17361f',
    marginBottom: 8,
  },
  summaryLine: {
    fontSize: 12.5,
    lineHeight: 19,
    color: '#526258',
    marginBottom: 4,
  },
  errorText: {
    marginBottom: 12,
    fontSize: 13.5,
    fontWeight: '800',
    color: '#c24f4f',
    textAlign: 'center',
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 20,
    backgroundColor: '#1f5a34',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1f5a34',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 20, 14, 0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  calendarModalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 26,
    backgroundColor: '#fffdf8',
    borderWidth: 1,
    borderColor: '#ddd3be',
    padding: 16,
  },
  calendarModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#17361f',
    textAlign: 'center',
  },
  calendarModalSubtitle: {
    marginTop: 6,
    marginBottom: 12,
    fontSize: 12.5,
    lineHeight: 18,
    color: '#6f7c67',
    textAlign: 'center',
  },
  calendarSection: {
    marginBottom: 12,
  },
  calendarMonthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  calendarMonthBtn: {
    width: '22%',
    minWidth: 58,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd3be',
    backgroundColor: '#f7f3e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthBtnActive: {
    backgroundColor: '#1f5a34',
    borderColor: '#1f5a34',
  },
  calendarMonthText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#17361f',
  },
  calendarMonthTextActive: {
    color: '#ffffff',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  calendarDayBtn: {
    width: '14%',
    minWidth: 40,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd3be',
    backgroundColor: '#f7f3e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayBtnActive: {
    backgroundColor: '#1f5a34',
    borderColor: '#1f5a34',
  },
  calendarDayText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#17361f',
  },
  calendarDayTextActive: {
    color: '#ffffff',
  },
  calendarSelectedText: {
    marginTop: 2,
    marginBottom: 12,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#5f6e64',
    textAlign: 'center',
  },
  calendarActions: {
    flexDirection: 'row',
    gap: 10,
  },
  calendarSecondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d7d4c9',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#17361f',
  },
  calendarPrimaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 16,
    backgroundColor: '#1f5a34',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#ffffff',
  },
  modalInputMultilineSmall: {
    minHeight: 74,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
})
