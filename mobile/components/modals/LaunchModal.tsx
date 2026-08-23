import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { CardItem, ModoModal, QuickAddType, Tema, TipoFormularioLancamento } from '../../app/types'
import { corDoCartao } from '../../src/utils/cardColor'
import { addMonthsToCompetencia } from '../../src/utils/competency'
import { formatarMoeda, handleMaskedMoneyInput, moneyStringToNumber } from '../../src/utils/currency'
import Campo from '../common/Campo'
import Icon from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

/**
 * Valores dos campos do formulario. O modal e dono deles: o HomeScreen
 * informa os valores iniciais e recebe o resultado de volta no onSave.
 * Isso evita que cada tecla digitada re-renderize a tela inteira.
 */
export type LaunchFormValues = {
  name: string
  selectedCategory: string
  value: string
  installmentDescription: string
  installmentValue: string
  installmentTotal: string
}

export const emptyLaunchFormValues = (category = ''): LaunchFormValues => ({
  name: '',
  selectedCategory: category,
  value: 'R$ 0,00',
  installmentDescription: '',
  installmentValue: 'R$ 0,00',
  installmentTotal: '1',
})

type LaunchModalProps = {
  visible: boolean
  onClose: () => void
  theme: Tema
  formType: TipoFormularioLancamento
  mode: ModoModal
  keyboardOpen: boolean
  title: string
  isOutputForm: boolean
  isInputForm: boolean
  cards: CardItem[]
  selectedCardId: string | null
  onSelectedCardIdChange: (value: string) => void
  categories: string[]
  initialValues: LaunchFormValues
  /** Competencia em edicao ("2026-Agosto"), para dizer onde a ultima parcela cai. */
  competenciaAtual: string
  day: string
  onDayChange: (value: string) => void
  onOpenDayCalendar: () => void
  onTypeChange: (type: QuickAddType) => void
  onSave: (values: LaunchFormValues, continuar?: boolean) => void
  /** Quantos itens ja foram lancados sem fechar o modal. */
  lancadosSeguidos?: number
}

/** "2026-Agosto" -> "Ago/2026". */
function formatarCompetenciaCurta(competencia: string) {
  const [ano, mes] = String(competencia || '').split('-')
  if (!ano || !mes) return competencia
  return `${mes.slice(0, 3)}/${ano}`
}

const TIPOS: [QuickAddType, string, Parameters<typeof Icon>[0]['name']][] = [
  ['entrada', 'Entrada', 'seta_cima'],
  ['saida', 'Saída', 'seta_baixo'],
  ['fixo', 'Fixo', 'aba_fixo'],
  ['parcela', 'Parcela', 'cartao'],
]

export default function LaunchModal({
  visible,
  onClose,
  theme,
  formType,
  mode,
  title,
  cards,
  selectedCardId,
  onSelectedCardIdChange,
  categories,
  initialValues,
  competenciaAtual,
  day,
  onDayChange,
  onOpenDayCalendar,
  onTypeChange,
  onSave,
  lancadosSeguidos = 0,
}: LaunchModalProps) {
  const [name, setName] = useState(initialValues.name)
  const [selectedCategory, setSelectedCategory] = useState(initialValues.selectedCategory)
  const [value, setValue] = useState(initialValues.value)
  const [installmentDescription, setInstallmentDescription] = useState(initialValues.installmentDescription)
  const [installmentValue, setInstallmentValue] = useState(initialValues.installmentValue)
  const [installmentTotal, setInstallmentTotal] = useState(initialValues.installmentTotal)
  const [naoSei, setNaoSei] = useState(initialValues.name.trim() === 'N/S')

  const ehParcela = formType === 'parcela'

  // --- resumo da compra parcelada ---
  //
  // Antes o modal so pedia total e numero de parcelas; quanto ia cair por mes,
  // ate quando e o quanto disso comia o limite so dava para descobrir depois
  // de salvar. Agora as contas aparecem enquanto se digita.
  const cartaoEscolhido = cards.find((card) => card.id === selectedCardId) || null
  const totalDaCompra = moneyStringToNumber(installmentValue)
  const quantidadeParcelas = Math.max(1, Math.min(360, Number(installmentTotal) || 1))
  const valorDeCadaParcela = totalDaCompra > 0 ? totalDaCompra / quantidadeParcelas : 0
  const competenciaFinal = addMonthsToCompetencia(competenciaAtual, quantidadeParcelas - 1)
  const limiteDoCartao = Number(cartaoEscolhido?.limite || 0)
  const usadoNoCartao = (cartaoEscolhido?.parcelas || []).reduce(
    (acc, item) => acc + Number(item.valorParcela || 0),
    0
  )
  const estouraLimite = limiteDoCartao > 0 && usadoNoCartao + totalDaCompra > limiteDoCartao
  const mostrarResumoParcela = ehParcela && totalDaCompra > 0

  const resumo = (rotulo: string, valor: string) => (
    <View style={[styles.resumoItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.resumoRotulo, { color: theme.muted }]} numberOfLines={2}>
        {rotulo}
      </Text>
      <Text style={[styles.resumoValor, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
    </View>
  )

  const nomeFinal = naoSei ? 'N/S' : name

  const podeSalvar = ehParcela
    ? installmentDescription.trim().length > 0 && !!selectedCardId
    : nomeFinal.trim().length > 0

  const handleSave = (continuar = false) => {
    onSave(
      { name: nomeFinal, selectedCategory, value, installmentDescription, installmentValue, installmentTotal },
      continuar
    )
  }

  const campoDia = (rotulo: string) => (
    <Campo
      theme={theme}
      rotulo={rotulo}
      value={day}
      onChangeText={onDayChange}
      keyboardType="number-pad"
      inputMode="numeric"
      placeholder="1"
      sufixo={
        <PressableScale onPress={onOpenDayCalendar} hitSlop={8}>
          <Icon name="calendario" size={19} color={theme.muted} />
        </PressableScale>
      }
    />
  )

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo={title}
      subtitulo={
        lancadosSeguidos > 0
          ? `${lancadosSeguidos} ${lancadosSeguidos === 1 ? 'item lançado' : 'itens lançados'} — continue anotando`
          : undefined
      }
      acoes={
        // "Salvar e novo" so aparece ao criar: editando, um segundo item nao
        // faz sentido nenhum.
        mode === 'novo'
          ? [
              { label: 'Salvar e novo', onPress: () => handleSave(true), desabilitada: !podeSalvar },
              { label: 'Salvar', onPress: () => handleSave(false), primaria: true, desabilitada: !podeSalvar },
            ]
          : [
              { label: 'Cancelar', onPress: onClose },
              { label: 'Salvar', onPress: () => handleSave(false), primaria: true, desabilitada: !podeSalvar },
            ]
      }
    >
      {/* Tipo do lancamento — so ao criar */}
      {mode === 'novo' ? (
        <View style={styles.tipos}>
          {TIPOS.map(([tipo, label, icone]) => {
            const ativo = formType === tipo
            return (
              <PressableScale
                key={tipo}
                onPress={() => onTypeChange(tipo)}
                style={[
                  styles.tipo,
                  {
                    backgroundColor: ativo ? theme.accentSoft : theme.cardSoft,
                    borderColor: ativo ? theme.accent : theme.border,
                  },
                ]}
              >
                <Icon name={icone} size={17} color={ativo ? theme.accent : theme.muted} />
                <Text style={[styles.tipoTexto, { color: ativo ? theme.accent : theme.muted }]}>
                  {label}
                </Text>
              </PressableScale>
            )
          })}
        </View>
      ) : null}

      {ehParcela ? (
        <>
          <Text style={[styles.rotuloFaixa, { color: theme.muted }]}>Em qual cartão</Text>
          {cards.length === 0 ? (
            <View style={[styles.aviso, { backgroundColor: theme.redSoft, borderColor: theme.red }]}>
              <Icon name="cartao" size={16} color={theme.red} />
              <Text style={[styles.avisoTexto, { color: theme.red }]}>
                Cadastre um cartão antes de lançar uma compra parcelada.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.faixa}>
              {cards.map((card) => {
                const ativo = selectedCardId === card.id
                const cor = corDoCartao(card.id)
                return (
                  <PressableScale
                    key={card.id}
                    onPress={() => onSelectedCardIdChange(card.id)}
                    scaleTo={0.95}
                    style={[
                      styles.miniCartao,
                      {
                        backgroundColor: cor.base,
                        borderColor: ativo ? theme.accent : 'transparent',
                        opacity: ativo ? 1 : 0.55,
                      },
                    ]}
                  >
                    <View style={styles.miniChip} />
                    <Text style={styles.miniNome} numberOfLines={2}>{card.nome}</Text>
                    {ativo ? (
                      <View style={[styles.miniSelo, { backgroundColor: theme.accent }]}>
                        <Icon name="confirmar" size={11} color={theme.textInverse} />
                      </View>
                    ) : null}
                  </PressableScale>
                )
              })}
            </ScrollView>
          )}

          <Campo
            theme={theme}
            rotulo="Descrição"
            value={installmentDescription}
            onChangeText={setInstallmentDescription}
            placeholder="Ex.: tênis, curso..."
          />

          <Campo
            theme={theme}
            rotulo="Valor total da compra"
            value={installmentValue}
            onChangeText={(bruto) => handleMaskedMoneyInput(bruto, setInstallmentValue)}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="R$ 0,00"
            dica="O valor de cada parcela é calculado automaticamente."
          />

          <Campo
            theme={theme}
            rotulo="Total de parcelas"
            value={installmentTotal}
            onChangeText={setInstallmentTotal}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="1"
            maxLength={3}
          />

          {campoDia('Dia da compra')}

          {mostrarResumoParcela ? (
            <>
              <View style={styles.resumoGrade}>
                {resumo('Cada parcela', formatarMoeda(valorDeCadaParcela))}
                {resumo('Última parcela', formatarCompetenciaCurta(competenciaFinal))}
                {resumo('Total da compra', formatarMoeda(totalDaCompra))}
              </View>

              {estouraLimite ? (
                <View style={[styles.aviso, { backgroundColor: theme.redSoft, borderColor: theme.red }]}>
                  <Icon name="cartao" size={16} color={theme.red} />
                  <Text style={[styles.avisoTexto, { color: theme.red }]}>
                    Somando o que já está lançado, esta compra passa o limite de{' '}
                    {formatarMoeda(limiteDoCartao)} do {cartaoEscolhido?.nome}.
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        <>
          <Campo
            theme={theme}
            rotulo="Nome"
            value={naoSei ? 'N/S' : name}
            onChangeText={setName}
            placeholder="Digite o nome"
            editable={!naoSei}
            autoFocus={mode === 'novo'}
          />

          {/* Para lancar rapido quando o nome nao vem agora: o gasto entra na
              conta do mes com "N/S" e pode ser renomeado depois. Nao vale para
              gasto fixo, que se repete todo mes — um "N/S" recorrente nao
              ajuda ninguem. */}
          {formType !== 'fixo' ? (
            <PressableScale
              onPress={() => setNaoSei((v) => !v)}
              scaleTo={0.98}
              style={styles.naoSeiLinha}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: naoSei }}
            >
              <View
                style={[
                  styles.caixa,
                  {
                    backgroundColor: naoSei ? theme.primary : theme.cardSoft,
                    borderColor: naoSei ? theme.primary : theme.borderStrong,
                  },
                ]}
              >
                {naoSei ? <Icon name="confirmar" size={13} color={theme.textInverse} /> : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.naoSeiTitulo, { color: theme.text }]}>Não sei o nome</Text>
                <Text style={[styles.naoSeiDica, { color: theme.muted }]}>
                  Salva como N/S e você renomeia depois
                </Text>
              </View>
            </PressableScale>
          ) : null}

          {formType === 'saida' ? (
            <>
              <Text style={[styles.rotuloFaixa, { color: theme.muted }]}>Categoria</Text>
              {/* Mesma grade da aba Variaveis: numa faixa horizontal as
                  ultimas categorias ficam escondidas fora da tela. */}
              <View style={styles.gradeCategorias}>
                {categories.map((categoria) => {
                  const ativo = selectedCategory === categoria
                  return (
                    <PressableScale
                      key={categoria}
                      onPress={() => setSelectedCategory(categoria)}
                      scaleTo={0.95}
                      style={[
                        styles.chipCategoria,
                        {
                          backgroundColor: ativo ? theme.primary : theme.cardSoft,
                          borderColor: ativo ? theme.primary : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.chipCategoriaTexto, { color: ativo ? theme.textInverse : theme.muted }]}
                        numberOfLines={1}
                      >
                        {categoria}
                      </Text>
                    </PressableScale>
                  )
                })}
              </View>
            </>
          ) : null}

          <Campo
            theme={theme}
            rotulo="Valor"
            value={value}
            onChangeText={(bruto) => handleMaskedMoneyInput(bruto, setValue)}
            keyboardType="number-pad"
            inputMode="numeric"
            placeholder="R$ 0,00"
          />

          {/* Gasto fixo se repete todo mes: um dia especifico so confundiria,
              entao o campo aparece apenas em entrada e saida do mes. */}
          {formType === 'fixo' ? null : campoDia('Dia')}
        </>
      )}
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  tipo: {
    width: '47.5%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
  },
  tipoTexto: { fontSize: 13, fontWeight: '800' },

  rotuloFaixa: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  faixa: { gap: 8, paddingRight: 8, marginBottom: 16 },
  pilula: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pilulaTexto: { fontSize: 12, fontWeight: '700' },
  resumoGrade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  resumoItem: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 13,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  resumoRotulo: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  resumoValor: { fontSize: 13.5, fontWeight: '800', letterSpacing: -0.3, marginTop: 3 },

  gradeCategorias: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 16 },
  chipCategoria: {
    minHeight: 34,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCategoriaTexto: { fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },

  naoSeiLinha: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: -6, marginBottom: 16 },
  caixa: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  naoSeiTitulo: { fontSize: 13, fontWeight: '700' },
  naoSeiDica: { fontSize: 11, fontWeight: '500', marginTop: 1 },

  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  avisoTexto: { flex: 1, fontSize: 12, fontWeight: '600', lineHeight: 17 },

  miniCartao: {
    width: 122,
    height: 74,
    borderRadius: 14,
    borderWidth: 2,
    padding: 10,
    justifyContent: 'space-between',
  },
  miniChip: {
    width: 20,
    height: 15,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  miniNome: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', lineHeight: 14 },
  miniSelo: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
