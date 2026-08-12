
import { ReactNode, useEffect, useRef } from 'react'
import {
  Animated,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native'

type Tema = {
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
}

type QuickAddType = 'entrada' | 'saida' | 'fixo' | 'parcela'
type DeleteTarget = 'fixo' | 'entrada' | 'saida' | 'pix' | 'nota' | 'cartao' | 'parcela' | 'categoria'
type SettingsThemeMode = 'manual' | 'system'
type ModoCategoria = 'nova' | 'editar'
type NoteModalMode = 'pix' | 'nota'
type SortMode = 'recentes' | 'maior_valor' | 'menor_valor' | 'alfabetica'
type SortTarget = 'fixo' | 'entradas' | 'saidas' | 'notas' | 'cartao'
type TipoFormularioLancamento = 'entrada' | 'saida' | 'fixo' | 'parcela'

type CardItem = {
  id: string
  nome: string
  parcelas: CardInstallment[]
}

type PixItem = {
  id: string
  nome: string
  chave: string
  observacao: string
}

type NoteItem = {
  id: string
  titulo: string
  conteudo: string
}

type CardInstallment = {
  id: string
  descricao: string
  valorParcela: number
  totalParcelas: number
  parcelaAtual: number
  competencia: string
  groupId?: string
}

type ConfirmacaoExclusao = {
  type: DeleteTarget
  id: string
  label: string
} | null

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
        <View pointerEvents='box-none' style={styles.modalCenterWrap}>
          <Animated.View style={[styles.modalKeyboardWrap, { transform: [{ translateY }] }]}>
            {children}
          </Animated.View>
        </View>
      </View>
    </Modal>
  )
}

export type HomeModalsProps = {
  theme: Tema
  listaAnos: number[]
  meses: string[]
  anoSelecionado: number
  setAnoSelecionado: (value: number) => void
  mesSelecionado: string
  setMesSelecionado: (value: string) => void
  anoModalAberto: boolean
  setAnoModalAberto: (value: boolean) => void
  mesModalAberto: boolean
  setMesModalAberto: (value: boolean) => void
  modalAcaoRapidaAberto: boolean
  setModalAcaoRapidaAberto: (value: boolean) => void
  acaoRapidaPadrao: QuickAddType
  abrirFormularioPorAcao: (tipo: QuickAddType) => void
  modalLancamentoAberto: boolean
  fecharModalLancamento: () => void
  modoModalLancamento: 'novo' | 'editar'
  tipoFormularioLancamento: TipoFormularioLancamento
  isParcelaFormulario: boolean
  isSaidaFormulario: boolean
  keyboardAberto: boolean
  tituloModalLancamento: string
  setTipoFormularioLancamento: (value: QuickAddType) => void
  setTipoVariavelTab: (value: 'entrada' | 'saida') => void
  setAbaInferior: (value: 'home' | 'fixo' | 'variavel' | 'cartao') => void
  cards: CardItem[]
  selectedCardId: string | null
  setSelectedCardId: (value: string) => void
  novaParcelaDescricao: string
  setNovaParcelaDescricao: (value: string) => void
  novaParcelaValor: string
  setNovaParcelaValor: (value: string) => void
  handleMaskedMoneyInput: (rawValue: string, setter: (value: string) => void) => void
  novaParcelaTotal: string
  setNovaParcelaTotal: (value: string) => void
  novoNome: string
  setNovoNome: (value: string) => void
  categoriasSaidas: string[]
  novaCategoria: string
  setNovaCategoria: (value: string) => void
  novoValor: string
  setNovoValor: (value: string) => void
  salvarLancamento: () => void
  modalCategoriasAberto: boolean
  setModalCategoriasAberto: (value: boolean) => void
  categoriasSaidasList: string[]
  abrirModalEditarCategoria: (categoria: string) => void
  abrirConfirmacaoExclusao: (type: DeleteTarget, id: string, label: string) => void
  modalCategoriaNomeAberto: boolean
  fecharModalCategoriaNome: () => void
  modoCategoria: ModoCategoria
  categoriaDigitada: string
  setCategoriaDigitada: (value: string) => void
  salvarCategoria: () => void
  modalAnotacaoAberto: boolean
  fecharModalAnotacao: () => void
  noteModalType: NoteModalMode
  pixNome: string
  setPixNome: (value: string) => void
  pixChave: string
  setPixChave: (value: string) => void
  pixObservacao: string
  setPixObservacao: (value: string) => void
  notaTitulo: string
  setNotaTitulo: (value: string) => void
  notaConteudo: string
  setNotaConteudo: (value: string) => void
  setNotaViewportHeight: (value: number) => void
  setNotaContentHeight: (value: number) => void
  setNotaScrollY: (value: number) => void
  notaThumbHeight: number
  notaThumbTop: number
  salvarAnotacao: () => void
  modalCartaoAberto: boolean
  fecharModalCartao: () => void
  parcelaEditandoId: string | null
  salvarCartaoOuParcela: () => void
  modalAnoComparacaoAberto: boolean
  setModalAnoComparacaoAberto: (value: boolean) => void
  anoComparacao: number
  setAnoComparacao: (value: number) => void
  modalMesComparacaoAberto: boolean
  setModalMesComparacaoAberto: (value: boolean) => void
  mesComparacao: string
  setMesComparacao: (value: string) => void
  modalFiltroAberto: boolean
  setModalFiltroAberto: (value: boolean) => void
  opcoesFiltro: { value: SortMode; label: string }[]
  filtroSelecionado: SortMode
  aplicarFiltro: (modo: SortMode) => void
  modalGerenciarCartoesAberto: boolean
  setModalGerenciarCartoesAberto: (value: boolean) => void
  iniciarEdicaoCartao: (card: CardItem) => void
  modalNovoCartaoAberto: boolean
  fecharModalNovoCartao: () => void
  cartaoEditandoId: string | null
  gerenciarCartaoNome: string
  setGerenciarCartaoNome: (value: string) => void
  salvarCartaoGerenciado: () => void
  confirmacaoExclusao: ConfirmacaoExclusao
  setConfirmacaoExclusao: (value: ConfirmacaoExclusao) => void
  confirmarExclusao: () => void
  modalConfiguracoesAberto: boolean
  setModalConfiguracoesAberto: (value: boolean) => void
  themeMode: SettingsThemeMode
  setThemeMode: (value: SettingsThemeMode | ((prev: SettingsThemeMode) => SettingsThemeMode)) => void
}

export function HomeModals(props: HomeModalsProps) {
  const {
    theme,
    listaAnos,
    meses,
    anoSelecionado,
    setAnoSelecionado,
    mesSelecionado,
    setMesSelecionado,
    anoModalAberto,
    setAnoModalAberto,
    mesModalAberto,
    setMesModalAberto,
    modalAcaoRapidaAberto,
    setModalAcaoRapidaAberto,
    acaoRapidaPadrao,
    abrirFormularioPorAcao,
    modalLancamentoAberto,
    fecharModalLancamento,
    modoModalLancamento,
    tipoFormularioLancamento,
    isParcelaFormulario,
    isSaidaFormulario,
    keyboardAberto,
    tituloModalLancamento,
    setTipoFormularioLancamento,
    setTipoVariavelTab,
    setAbaInferior,
    cards,
    selectedCardId,
    setSelectedCardId,
    novaParcelaDescricao,
    setNovaParcelaDescricao,
    novaParcelaValor,
    setNovaParcelaValor,
    handleMaskedMoneyInput,
    novaParcelaTotal,
    setNovaParcelaTotal,
    novoNome,
    setNovoNome,
    categoriasSaidas,
    categoriasSaidasList,
    novaCategoria,
    setNovaCategoria,
    novoValor,
    setNovoValor,
    salvarLancamento,
    modalCategoriasAberto,
    setModalCategoriasAberto,
    abrirModalEditarCategoria,
    abrirConfirmacaoExclusao,
    modalCategoriaNomeAberto,
    fecharModalCategoriaNome,
    modoCategoria,
    categoriaDigitada,
    setCategoriaDigitada,
    salvarCategoria,
    modalAnotacaoAberto,
    fecharModalAnotacao,
    noteModalType,
    pixNome,
    setPixNome,
    pixChave,
    setPixChave,
    pixObservacao,
    setPixObservacao,
    notaTitulo,
    setNotaTitulo,
    notaConteudo,
    setNotaConteudo,
    setNotaViewportHeight,
    setNotaContentHeight,
    setNotaScrollY,
    notaThumbHeight,
    notaThumbTop,
    salvarAnotacao,
    modalCartaoAberto,
    fecharModalCartao,
    parcelaEditandoId,
    salvarCartaoOuParcela,
    modalAnoComparacaoAberto,
    setModalAnoComparacaoAberto,
    anoComparacao,
    setAnoComparacao,
    modalMesComparacaoAberto,
    setModalMesComparacaoAberto,
    mesComparacao,
    setMesComparacao,
    modalFiltroAberto,
    setModalFiltroAberto,
    opcoesFiltro,
    filtroSelecionado,
    aplicarFiltro,
    modalGerenciarCartoesAberto,
    setModalGerenciarCartoesAberto,
    iniciarEdicaoCartao,
    modalNovoCartaoAberto,
    fecharModalNovoCartao,
    cartaoEditandoId,
    gerenciarCartaoNome,
    setGerenciarCartaoNome,
    salvarCartaoGerenciado,
    confirmacaoExclusao,
    setConfirmacaoExclusao,
    confirmarExclusao,
    modalConfiguracoesAberto,
    setModalConfiguracoesAberto,
    themeMode,
    setThemeMode,
  } = props

  const isPixModal = String(noteModalType) === 'pix'
  const tituloModalAnotacao = isPixModal ? 'Salvar Pix' : 'Salvar anotação'

  return (
    <>
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
      modoModalLancamento === 'editar'
        ? tipoFormularioLancamento === 'saida'
          ? styles.modalCardEditSaida
          : tipoFormularioLancamento === 'fixo'
          ? styles.modalCardEditFixo
          : styles.modalCardEditEntrada
        : isParcelaFormulario
        ? keyboardAberto
          ? styles.modalCardLancamentoParcelaKeyboard
          : styles.modalCardLancamentoParcela
        : isSaidaFormulario
        ? keyboardAberto
          ? styles.modalCardLancamentoSaidaKeyboard
          : styles.modalCardLancamentoSaida
        : styles.modalCardLancamentoEntrada,
      { backgroundColor: theme.card, borderColor: theme.border },
    ]}
  >
    <ScrollView
      style={styles.modalScroll}
      contentContainerStyle={styles.modalScrollContent}
      showsVerticalScrollIndicator={keyboardAberto && (isParcelaFormulario || isSaidaFormulario)}
      keyboardShouldPersistTaps='handled'
      scrollEnabled={keyboardAberto && (isParcelaFormulario || isSaidaFormulario)}
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

        {isParcelaFormulario ? (
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
              <TextInput
                value={novaParcelaDescricao}
                onChangeText={setNovaParcelaDescricao}
                placeholder='Ex.: tênis, curso...'
                placeholderTextColor={theme.muted}
                style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
              />
            </View>

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.muted }]}>Valor total da compra</Text>
              <TextInput
                value={novaParcelaValor}
                onChangeText={(value) => handleMaskedMoneyInput(value, setNovaParcelaValor)}
                placeholder='R$ 0,00'
                placeholderTextColor={theme.muted}
                keyboardType='number-pad'
                style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
              />
            </View>

            <View style={[styles.modalField, styles.totalParcelasField, styles.totalParcelasFieldWide]}>
              <Text style={[styles.modalLabel, styles.dualFieldLabel, { color: theme.muted }]}>Total de parcelas</Text>
              <TextInput
                value={novaParcelaTotal}
                onChangeText={setNovaParcelaTotal}
                keyboardType='number-pad'
                placeholder='Exemplo: 1'
                placeholderTextColor={theme.muted}
                style={[styles.modalInput, styles.totalParcelasInput, styles.totalParcelasInputWide, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.muted }]}>Nome</Text>
              <TextInput
                value={novoNome}
                onChangeText={setNovoNome}
                placeholder='Digite o nome'
                placeholderTextColor={theme.muted}
                style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
              />
            </View>

            {tipoFormularioLancamento === 'saida' && (
              <View style={styles.modalField}>
                <Text style={[styles.modalLabel, { color: theme.muted }]}>Categoria</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                  {categoriasSaidas.map((categoria) => (
                    <Pressable
                      key={categoria}
                      onPress={() => setNovaCategoria(categoria)}
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: novaCategoria === categoria ? theme.primary : theme.cardSoft,
                          borderColor: novaCategoria === categoria ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text style={[styles.filterPillText, { color: novaCategoria === categoria ? theme.white : theme.text }]}>
                        {categoria}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.modalField}>
              <Text style={[styles.modalLabel, { color: theme.muted }]}>Valor</Text>
              <TextInput
                value={novoValor}
                onChangeText={(value) => handleMaskedMoneyInput(value, setNovoValor)}
                placeholder='R$ 0,00'
                placeholderTextColor={theme.muted}
                keyboardType='number-pad'
                style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]}
              />
            </View>
          </>
        )}

        <View style={styles.modalActions}>
          <Pressable onPress={fecharModalLancamento} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
            <Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text>
          </Pressable>
          <Pressable onPress={salvarLancamento} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}> 
            <Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
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
        <View style={[styles.modalCard, styles.modalCardExtraTall, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>{noteModalType === 'pix' ? 'Salvar Pix' : 'Salvar anotação'}</Text>
            {noteModalType === 'pix' ? (
              <>
                <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Nome</Text><TextInput value={pixNome} onChangeText={setPixNome} placeholder='Ex.: Mãe, João, fornecedor...' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
                <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Chave Pix</Text><TextInput value={pixChave} onChangeText={setPixChave} placeholder='CPF, e-mail, telefone...' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
                <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Observação</Text><TextInput value={pixObservacao} onChangeText={setPixObservacao} placeholder='Apelido, banco, detalhe...' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
              </>
            ) : (
              <>
                <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Título</Text><TextInput value={notaTitulo} onChangeText={setNotaTitulo} placeholder='Digite o título' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
                <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Conteúdo</Text><View style={styles.noteInputWrap}><TextInput value={notaConteudo} onChangeText={setNotaConteudo} multiline scrollEnabled textAlignVertical='top' placeholder='Escreva sua anotação' placeholderTextColor={theme.muted} onLayout={(event) => setNotaViewportHeight(event.nativeEvent.layout.height)} onContentSizeChange={(event) => setNotaContentHeight(event.nativeEvent.contentSize.height)} onScroll={(event) => setNotaScrollY(event.nativeEvent.contentOffset.y)} style={[styles.modalInput, styles.modalInputMultiline, styles.noteInputWithIndicator, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /><View style={[styles.noteScrollIndicatorTrack, { backgroundColor: theme.border }]}><View style={[styles.noteScrollIndicatorThumb, { backgroundColor: theme.muted, height: notaThumbHeight, transform: [{ translateY: notaThumbTop }] }]} /></View></View></View>
              </>
            )}
            <View style={styles.modalActions}>
              <Pressable onPress={fecharModalAnotacao} style={[styles.modalActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}><Text style={[styles.modalActionText, { color: theme.text }]}>Cancelar</Text></Pressable>
              <Pressable onPress={salvarAnotacao} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.modalActionText, { color: theme.white }]}>Salvar</Text></Pressable>
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
                <View style={styles.modalField}><Text style={[styles.modalLabel, { color: theme.muted }]}>Valor total da compra</Text><TextInput value={novaParcelaValor} onChangeText={(value) => handleMaskedMoneyInput(value, setNovaParcelaValor)} keyboardType='number-pad' placeholder='R$ 0,00' placeholderTextColor={theme.muted} style={[styles.modalInput, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
                <View style={[styles.modalField, styles.totalParcelasField, styles.totalParcelasFieldWide]}><Text style={[styles.modalLabel, styles.dualFieldLabel, { color: theme.muted }]}>Total de parcelas</Text><TextInput value={novaParcelaTotal} onChangeText={setNovaParcelaTotal} keyboardType='number-pad' placeholder='Exemplo: 1' placeholderTextColor={theme.muted} style={[styles.modalInput, styles.totalParcelasInput, styles.totalParcelasInputWide, { backgroundColor: theme.card, borderColor: theme.borderStrong, color: theme.text }]} /></View>
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
        <View style={[styles.modalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Configurações</Text>
            <View style={[styles.settingsRow, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowItemTitle, { color: theme.text }]}>Seguir tema do celular</Text>
                <Text style={[styles.rowItemMeta, { color: theme.muted }]}>Quando ativo, o app alterna sozinho entre claro e escuro.</Text>
              </View>
              <Pressable onPress={() => setThemeMode((prev) => prev === 'system' ? 'manual' : 'system')} style={[styles.switchTrack, { backgroundColor: themeMode === 'system' ? theme.green : theme.borderStrong }]}>
                <View style={[styles.switchThumb, themeMode === 'system' ? styles.switchThumbActive : null]} />
              </Pressable>
            </View>
            <View style={styles.modalActions}><Pressable onPress={() => setModalConfiguracoesAberto(false)} style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}><Text style={[styles.modalActionText, { color: theme.white }]}>Fechar</Text></Pressable></View>
          </View>
      </AppModal>


    </>
  )
}

export default HomeModals

const styles = StyleSheet.create({
  sectionSpacer: { height: 12 },
  sectionSpacerLarge: { height: 18 },
  safeArea: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  loadingText: { fontSize: 16, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 14, paddingTop: 10 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 46, height: 46, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  avatarText: { fontSize: 16, fontWeight: '900' },
  themeButton: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  themeButtonText: { fontSize: 17, fontWeight: '900', lineHeight: 17 },
  logoutButton: { minHeight: 40, paddingHorizontal: 14, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  logoutButtonText: { fontSize: 13, fontWeight: '800' },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center' },
  subtitle: { fontSize: 12, lineHeight: 16, textAlign: 'center', marginTop: 3, marginBottom: 12 },
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
  fullRowCard: { borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12, borderWidth: 1, marginTop: 8, width: '100%' },
  fullRowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  fullRowTitleWrap: { flex: 1, minWidth: 0 },
  rowItemTitle: { fontSize: 14, fontWeight: '800', lineHeight: 18 },
  rowItemMeta: { fontSize: 11, fontWeight: '700', marginTop: 3 },
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
  bottomBar: { position: 'absolute', left: 12, right: 12, bottom: 10, minHeight: 64, borderRadius: 30, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4, shadowOpacity: 0.12, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  bottomHalf: { flex: 1, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', gap: 4, paddingBottom: 0 },
  bottomDivider: { width: 1, height: 20, borderRadius: 999, opacity: 0.9 },
  bottomItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 0 },
  bottomItemText: { fontSize: 12, fontWeight: '900', lineHeight: 16, textTransform: 'uppercase', letterSpacing: 0.6 },
  plusButton: { width: 56, height: 56, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: -8, alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  plusButtonText: { fontSize: 23, fontWeight: '900', lineHeight: 24, marginTop: -1 },
  syncBadge: { position: 'absolute', right: 18, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  syncBadgeText: { fontSize: 12, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.52)', paddingHorizontal: 18, paddingVertical: 14 },
  modalCenterWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  modalBackdropTouch: { ...StyleSheet.absoluteFillObject },
  modalKeyboardWrap: { width: '100%', alignItems: 'center', justifyContent: 'center' },
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
  modalCardYear: { paddingBottom: 34 },
  modalCardScrollHint: { paddingBottom: 30 },
  modalCardConfirmDelete: { width: '76%', maxWidth: 332, minHeight: 100, paddingBottom: 10 },
  modalCardLancamentoEntrada: { paddingBottom: 26, minHeight: 396 },
  modalCardEditEntrada: { paddingBottom: 20, minHeight: 295 },
  modalCardEditFixo: { paddingBottom: 20, minHeight: 295 },
  modalCardEditSaida: { paddingBottom: 20, minHeight: 360 },
  modalCardLancamentoSaida: { paddingBottom: 20, minHeight: 465 },
  modalCardLancamentoSaidaKeyboard: { paddingBottom: 18, minHeight: 336, maxHeight: '68%' },
  modalCardManageCards: { paddingBottom: 24, minHeight: 360 },
  modalCardNewCard: { paddingBottom: 18, minHeight: 204 },
  modalCardNewCategory: { paddingBottom: 20, minHeight: 204 },
  modalCardLancamentoParcela: { paddingBottom: 32, minHeight: 544 },
  modalCardLancamentoParcelaKeyboard: { paddingBottom: 18, minHeight: 336, maxHeight: '68%' },
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
},

switchTrack: {
  width: 54,
  height: 32,
  borderRadius: 999,
  padding: 3,
  justifyContent: 'center',
},

switchThumb: {
  width: 26,
  height: 26,
  borderRadius: 999,
  backgroundColor: '#ffffff',
},

switchThumbActive: {
  alignSelf: 'flex-end',
},
})

