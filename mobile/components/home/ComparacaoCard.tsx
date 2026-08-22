import { memo } from 'react'
import { Text, View } from 'react-native'
import type { Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import PressableScale from '../common/motion/PressableScale'

export type ItemComparativo = {
  label: string
  atual: number
  comparado: number
  melhorQuandoMaior: boolean
}

type ComparacaoCardProps = {
  theme: Tema
  anoComparacao: number
  mesComparacao: string
  onAbrirSeletorAno: () => void
  onAbrirSeletorMes: () => void
  comparativos: ItemComparativo[]
  totalAcumulado: number
  formatarValorVisivel: (valor: number) => string
}

// Ficava no home.tsx; so a comparacao usa.
function calcularVariacaoPercentual(atual: number, comparado: number) {
  if (comparado === 0) {
    if (atual === 0) return 0
    return 100
  }
  return ((atual - comparado) / Math.abs(comparado)) * 100
}

/**
 * Compara os numeros do mes selecionado com os de outro mes escolhido.
 */
function ComparacaoCard({
  theme,
  anoComparacao,
  mesComparacao,
  onAbrirSeletorAno,
  onAbrirSeletorMes,
  comparativos,
  totalAcumulado,
  formatarValorVisivel,
}: ComparacaoCardProps) {
  return (
    <View style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.chartTitle, { color: theme.text }]}>Comparação</Text>

      <View style={styles.selectorGroup}>
        <PressableScale
          style={[styles.dropdownButton, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          onPress={onAbrirSeletorAno}
        >
          <Text style={[styles.dropdownLabel, { color: theme.muted }]}>Ano</Text>
          <View style={styles.dropdownValueRow}>
            <Text style={[styles.dropdownValue, { color: theme.text }]}>{anoComparacao}</Text>
            <Text style={[styles.dropdownIcon, { color: theme.muted }]}>⌄</Text>
          </View>
        </PressableScale>
        <PressableScale
          style={[styles.dropdownButton, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          onPress={onAbrirSeletorMes}
        >
          <Text style={[styles.dropdownLabel, { color: theme.muted }]}>Mês</Text>
          <View style={styles.dropdownValueRow}>
            <Text style={[styles.dropdownValue, { color: theme.text }]}>{mesComparacao}</Text>
            <Text style={[styles.dropdownIcon, { color: theme.muted }]}>⌄</Text>
          </View>
        </PressableScale>
      </View>

      <View style={[styles.comparisonGrid, { marginTop: 4 }]}>
        {comparativos.map((item) => {
          const variacao = calcularVariacaoPercentual(item.atual, item.comparado)
          const melhorou = item.melhorQuandoMaior ? item.atual >= item.comparado : item.atual <= item.comparado
          const corVariacao = variacao === 0 ? theme.muted : melhorou ? theme.green : theme.red
          const prefixo = variacao > 0 ? '+' : ''

          return (
            <View key={item.label} style={[styles.summaryCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.smallLabel, { color: theme.muted }]}>{item.label}</Text>
              <Text style={[styles.smallValue, { color: theme.text }]}>{formatarValorVisivel(item.atual)}</Text>
              <Text style={[styles.compareMetaText, { color: theme.muted }]}>
                Comparado: {formatarValorVisivel(item.comparado)}
              </Text>
              <Text style={[styles.compareMetaText, { color: corVariacao }]}>
                {prefixo}
                {variacao.toFixed(1).replace('.', ',')}%
              </Text>
            </View>
          )
        })}

        <View style={[styles.summaryCard, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
          <Text style={[styles.smallLabel, { color: theme.muted }]}>Total somado</Text>
          <Text style={[styles.smallValue, { color: totalAcumulado >= 0 ? theme.green : theme.red }]}>
            {formatarValorVisivel(totalAcumulado)}
          </Text>
          <Text style={[styles.compareMetaText, { color: theme.muted }]}>Saldo atual + mês comparado</Text>
        </View>
      </View>
    </View>
  )
}

export default memo(ComparacaoCard)
