// Cartao de credito que se preenche nele mesmo.
//
// O cadastro de cartao era um bloco de formulario — nome, fechamento,
// vencimento — com o desenho do cartao ao lado, so enfeitando. Aqui os
// campos moram na face do cartao: o nome vai onde o nome fica gravado, as
// datas ficam embaixo, e o que se ve enquanto digita ja e o resultado.
//
// Divide o desenho com o CartaoVisual (proporcao real, chip, numero
// mascarado, cor derivada do id), so que os pedacos sao editaveis.

import { StyleSheet, Text, TextInput, View } from 'react-native'

import type { Tema } from '../../app/types'
import { corDoCartao } from '../../src/utils/cardColor'
import Icon from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

type Props = {
  theme: Tema
  /** De onde sai a cor: mesma regra do cartao visual. */
  corId: string
  largura: number

  nome: string
  onNome: (texto: string) => void
  placeholderNome?: string

  /** "DD/MM", vazio quando ainda nao escolhido. */
  fechamento: string
  vencimento: string
  onFechamento: () => void
  onVencimento: () => void

  /** Quando existe, aparece a lixeira no canto. */
  onRemover?: () => void
  aoTerminarNome?: () => void
}

export default function CartaoEditavel({
  theme,
  corId,
  largura,
  nome,
  onNome,
  placeholderNome = 'Nome do cartão',
  fechamento,
  vencimento,
  onFechamento,
  onVencimento,
  onRemover,
  aoTerminarNome,
}: Props) {
  const cor = corDoCartao(corId)

  const data = (rotulo: string, valor: string, aoTocar: () => void) => (
    <PressableScale
      onPress={aoTocar}
      scaleTo={0.96}
      accessibilityRole="button"
      accessibilityLabel={`${rotulo}: ${valor || 'escolher data'}`}
      style={styles.dataWrap}
    >
      <Text style={styles.dataRotulo} numberOfLines={1}>
        {rotulo}
      </Text>
      <View style={styles.dataLinha}>
        <Icon name="calendario" size={12} color="rgba(255,255,255,0.75)" />
        <Text style={[styles.dataValor, !valor && styles.dataValorVazio]} numberOfLines={1}>
          {valor || '--/--'}
        </Text>
      </View>
    </PressableScale>
  )

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: cor.base, width: largura, minHeight: Math.round(largura / 1.586) },
      ]}
    >
      {/* Brilho diagonal: da profundidade sem depender de biblioteca de
          gradiente. Sem `pointerEvents` ele cobriria os campos. */}
      <View style={[styles.brilho, { backgroundColor: cor.luz }]} pointerEvents="none" />

      <View style={styles.topo}>
        <View style={styles.chip} />
        {onRemover ? (
          <PressableScale
            onPress={onRemover}
            scaleTo={0.88}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Remover ${nome || 'cartão'}`}
            style={styles.lixeira}
          >
            <Icon name="excluir" size={14} color="#FFFFFF" />
          </PressableScale>
        ) : (
          <Icon name="cartao" size={20} color="rgba(255,255,255,0.75)" />
        )}
      </View>

      <Text style={styles.numero}>•••• •••• •••• ••••</Text>

      <View style={styles.rodape}>
        <Text style={styles.rotulo}>NOME DO CARTÃO</Text>
        <TextInput
          value={nome}
          onChangeText={onNome}
          placeholder={placeholderNome}
          placeholderTextColor="rgba(255,255,255,0.45)"
          style={styles.nomeInput}
          returnKeyType="done"
          onSubmitEditing={aoTerminarNome}
          blurOnSubmit
          accessibilityLabel="Nome do cartão"
          // O fundo do cartao ja e escuro: o cursor precisa ser claro.
          selectionColor="#FFFFFF"
          cursorColor="#FFFFFF"
        />

        <View style={styles.datas}>
          {data('Fecha', fechamento, onFechamento)}
          {data('Vence', vencimento, onVencimento)}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 20, padding: 15, justifyContent: 'space-between', overflow: 'hidden' },
  brilho: {
    position: 'absolute',
    top: -62,
    // Dentro da caixa de proposito. Espalhado para fora ele fica escondido
    // pelo `overflow`, mas continua contando na largura medida do cartao —
    // e ai qualquer teste de layout acusa um estouro que ninguem ve.
    right: 0,
    width: 168,
    height: 168,
    borderRadius: 999,
    opacity: 0.5,
  },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { width: 32, height: 23, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.72)' },
  lixeira: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  numero: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    letterSpacing: 1.4,
    fontWeight: '700',
    marginVertical: 8,
  },

  rodape: { gap: 6, alignSelf: 'stretch' },
  rotulo: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  nomeInput: {
    // Na web o <input> tem largura natural de umas vinte letras e nao encolhe:
    // sem prende-lo a largura do cartao, ele empurrava a face para fora.
    alignSelf: 'stretch',
    width: '100%',
    minHeight: 36,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 0,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    minWidth: 0,
  },

  datas: { flexDirection: 'row', gap: 8 },
  dataWrap: {
    flex: 1,
    minWidth: 0,
    borderRadius: 11,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  dataRotulo: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 7.5,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  dataLinha: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dataValor: { flex: 1, minWidth: 0, color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },
  dataValorVazio: { color: 'rgba(255,255,255,0.5)' },
})
