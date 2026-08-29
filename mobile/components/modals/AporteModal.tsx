// Registrar um aporte.
//
// Dois toques, e nao um formulario: o valor, e a decisao de descontar ou nao
// do mes. O saldo do ativo sobe junto com o aporte porque o dinheiro acabou
// de entrar nele — sem isso o app mostraria um prejuizo do tamanho do aporte
// ate a pessoa lembrar de corrigir o saldo a mao.
//
// Descontar do mes fica ligado por padrao porque o dinheiro saiu mesmo da
// conta. Quem ja lancou a saida na mao desliga, e o aporte entra so na
// carteira.

import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { InvestimentoItem, Tema } from '../../app/types'
import { formatarMoeda, handleMaskedMoneyInput, moneyStringToNumber } from '../../src/utils/currency'
import { TIPOS_INVESTIMENTO } from '../../src/utils/investimentos'
import Campo from '../common/Campo'
import Icon from '../common/Icon'
import Interruptor from '../common/Interruptor'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'

/** Atalhos: a maioria dos aportes e um valor redondo e repetido. */
const SUGESTOES = [50, 100, 200, 500, 1000]

type Props = {
  visible: boolean
  onClose: () => void
  theme: Tema
  item: InvestimentoItem | null
  /** Nome do mes aberto, para o rotulo do desconto. */
  nomeDoMes: string
  onSalvar: (valor: number, lancarComoSaida: boolean) => void
}

export default function AporteModal({ visible, onClose, theme, item, nomeDoMes, onSalvar }: Props) {
  const [valor, setValor] = useState('R$ 0,00')
  const [lancarComoSaida, setLancarComoSaida] = useState(true)

  const numero = moneyStringToNumber(valor)
  const saldoDepois = (Number(item?.valorAtual) || 0) + numero

  const fechar = () => {
    setValor('R$ 0,00')
    setLancarComoSaida(true)
    onClose()
  }

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={fechar}
      level={70}
      titulo="Registrar aporte"
      subtitulo={
        item
          ? `${item.nome} · ${TIPOS_INVESTIMENTO[item.tipo].rotulo}`
          : 'Quanto entrou no investimento agora.'
      }
      acoes={[
        { label: 'Cancelar', onPress: fechar },
        {
          label: 'Registrar',
          onPress: () => {
            onSalvar(numero, lancarComoSaida)
            setValor('R$ 0,00')
            setLancarComoSaida(true)
          },
          primaria: true,
          desabilitada: numero <= 0,
        },
      ]}
    >
      <Campo
        theme={theme}
        rotulo="Valor"
        value={valor}
        onChangeText={(texto) => handleMaskedMoneyInput(texto, setValor)}
        keyboardType="number-pad"
        placeholder="R$ 0,00"
        returnKeyType="done"
        autoFocus
      />

      <View style={local.sugestoes}>
        {SUGESTOES.map((sugestao) => (
          <PressableScale
            key={sugestao}
            onPress={() => setValor(formatarMoeda(sugestao))}
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel={`Aportar ${formatarMoeda(sugestao)}`}
            style={[local.sugestao, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          >
            <Text style={[local.sugestaoTexto, { color: theme.text }]}>
              {sugestao >= 1000 ? `${sugestao / 1000} mil` : sugestao}
            </Text>
          </PressableScale>
        ))}
      </View>

      <View style={[local.aviso, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
        <Icon name="investir" size={15} color={theme.primary} />
        <Text style={[local.avisoTexto, { color: theme.muted }]}>
          O saldo do ativo vai para{' '}
          <Text style={{ color: theme.text, fontWeight: '900' }}>{formatarMoeda(saldoDepois)}</Text>.
        </Text>
      </View>

      <View style={[local.linhaDesconto, { borderTopColor: theme.border }]}>
        <View style={local.descontoTextos}>
          <Text style={[local.descontoTitulo, { color: theme.text }]}>
            Descontar de {nomeDoMes.toLowerCase()}
          </Text>
          <Text style={[local.descontoSub, { color: theme.muted }]}>
            Lança uma saída na categoria Investimentos. Desligue se você já lançou na mão.
          </Text>
        </View>
        <Interruptor
          theme={theme}
          ativo={lancarComoSaida}
          onAlternar={() => setLancarComoSaida((antes) => !antes)}
        />
      </View>
    </ModalSheet>
  )
}

const local = StyleSheet.create({
  sugestoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 2, marginBottom: 16 },
  sugestao: { minHeight: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sugestaoTexto: { fontSize: 12.5, fontWeight: '800' },

  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  avisoTexto: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '600', lineHeight: 17 },

  linhaDesconto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  descontoTextos: { flex: 1, minWidth: 0 },
  descontoTitulo: { fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 },
  descontoSub: { fontSize: 11, fontWeight: '600', lineHeight: 16, marginTop: 2 },
})
