import { memo } from 'react'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { FixoItem, Tema } from '../../app/types'
import { formatarDiaMes } from '../../src/utils/dates'
import { styles } from '../../src/theme/homeStyles'
import Icon from '../common/Icon'
import ListRow from '../common/ListRow'
import PressableScale from '../common/motion/PressableScale'

type FixoTabProps = {
  theme: Tema
  chaveAtual: string
  fixosOrdenados: FixoItem[]
  totalFixoPago: number
  totalFixoNaoPago: number
  highlightedItemId: string | null
  formatarValorVisivel: (valor: number) => string
  registrarLayoutItem: (id: string, y: number, height?: number) => void
  renderHighlightOverlay: (id: string) => ReactNode
  onAbrirFiltro: () => void
  onAlternarPago: (id: string) => void
  onEditar: (item: FixoItem) => void
  onExcluir: (id: string, nome: string) => void
}

/**
 * Aba "Fixos": gastos recorrentes do mes, com quanto ja foi pago no topo.
 *
 * Envolvida em React.memo: enquanto as props nao mudarem, digitar na busca
 * global ou em qualquer outro campo da tela nao re-renderiza esta lista.
 */
function FixoTab({
  theme,
  chaveAtual,
  fixosOrdenados,
  totalFixoPago,
  totalFixoNaoPago,
  highlightedItemId,
  formatarValorVisivel,
  registrarLayoutItem,
  renderHighlightOverlay,
  onAbrirFiltro,
  onAlternarPago,
  onEditar,
  onExcluir,
}: FixoTabProps) {
  const total = totalFixoPago + totalFixoNaoPago
  const progresso = total > 0 ? totalFixoPago / total : 0
  const quantosPagos = fixosOrdenados.filter((item) => item.pago).length

  return (
    <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.manageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>Gastos fixos</Text>
          <Text style={[styles.manageSub, { color: theme.muted }]}>
            {fixosOrdenados.length === 0
              ? 'Nada cadastrado neste mês'
              : `${quantosPagos} de ${fixosOrdenados.length} pagos`}
          </Text>
        </View>
        <PressableScale
          onPress={onAbrirFiltro}
          style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
        >
          <Icon name="ordenar" size={15} color={theme.text} />
        </PressableScale>
      </View>

      {/* Quanto do mes ja foi quitado */}
      {fixosOrdenados.length > 0 ? (
        <View style={[local.resumo, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
          <View style={local.resumoLinha}>
            <View style={local.resumoItem}>
              <Text style={[local.resumoRotulo, { color: theme.muted }]}>Pago</Text>
              <Text style={[local.resumoValor, { color: theme.green }]} numberOfLines={1}>
                {formatarValorVisivel(totalFixoPago)}
              </Text>
            </View>
            <View style={[local.divisor, { backgroundColor: theme.border }]} />
            <View style={local.resumoItem}>
              <Text style={[local.resumoRotulo, { color: theme.muted }]}>Falta pagar</Text>
              <Text style={[local.resumoValor, { color: theme.red }]} numberOfLines={1}>
                {formatarValorVisivel(totalFixoNaoPago)}
              </Text>
            </View>
          </View>
          <View style={[local.trilha, { backgroundColor: theme.background }]}>
            <View style={[local.preenchimento, { width: `${progresso * 100}%`, backgroundColor: theme.green }]} />
          </View>
        </View>
      ) : null}

      {fixosOrdenados.length === 0 ? (
        <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
          <Text style={[styles.emptyChartText, { color: theme.muted }]}>
            Use o botão + para adicionar um gasto fixo.
          </Text>
        </View>
      ) : (
        fixosOrdenados.map((item) => (
          <ListRow
            key={item.id}
            theme={theme}
            titulo={item.nome}
            meta={formatarDiaMes(item.dia, chaveAtual)}
            valor={formatarValorVisivel(item.valor)}
            valorCor={item.pago ? theme.muted : theme.text}
            status={{
              label: item.pago ? 'Pago' : 'Em aberto',
              ativo: item.pago,
              onPress: () => onAlternarPago(item.id),
            }}
            onEditar={() => onEditar(item)}
            onExcluir={() => onExcluir(item.id, item.nome)}
            destacado={highlightedItemId === item.id}
            overlay={renderHighlightOverlay(item.id)}
            onLayout={(y, height) => registrarLayoutItem(item.id, y, height)}
          />
        ))
      )}
    </View>
  )
}

const local = StyleSheet.create({
  resumo: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 4 },
  resumoLinha: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resumoItem: { flex: 1, minWidth: 0 },
  divisor: { width: 1, alignSelf: 'stretch' },
  resumoRotulo: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  resumoValor: { fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
  trilha: { height: 6, borderRadius: 999, overflow: 'hidden', marginTop: 12 },
  preenchimento: { height: '100%', borderRadius: 999 },
})

export default memo(FixoTab)
