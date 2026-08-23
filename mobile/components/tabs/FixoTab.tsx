import { memo } from 'react'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { FixoItem, Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import AnelProgresso from '../common/AnelProgresso'
import Icon from '../common/Icon'
import ListRow from '../common/ListRow'
import PressableScale from '../common/motion/PressableScale'

type FixoTabProps = {
  theme: Tema
  fixosOrdenados: FixoItem[]
  totalFixoPago: number
  totalFixoNaoPago: number
  highlightedItemId: string | null
  formatarValorVisivel: (valor: number) => string
  registrarItem: (id: string) => (node: View | null) => void
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
  fixosOrdenados,
  totalFixoPago,
  totalFixoNaoPago,
  highlightedItemId,
  formatarValorVisivel,
  registrarItem,
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
          <Icon name="filtrar" size={15} color={theme.text} />
        </PressableScale>
      </View>

      {/* Quanto do mes ja foi quitado */}
      {fixosOrdenados.length > 0 ? (
        <View style={[local.resumo, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
          <AnelProgresso
            progresso={progresso}
            cor={theme.green}
            corFundo={theme.border}
            valor={`${Math.round(progresso * 100)}%`}
            rotulo="quitado"
            corValor={theme.green}
            corRotulo={theme.muted}
          />

          <View style={local.legenda}>
            <View style={local.legendaItem}>
              <View style={[local.marca, { backgroundColor: theme.green }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[local.legendaRotulo, { color: theme.muted }]}>Pago</Text>
                <Text style={[local.legendaValor, { color: theme.green }]} numberOfLines={1}>
                  {formatarValorVisivel(totalFixoPago)}
                </Text>
              </View>
            </View>

            <View style={local.legendaItem}>
              <View style={[local.marca, { backgroundColor: theme.red }]} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[local.legendaRotulo, { color: theme.muted }]}>Falta pagar</Text>
                <Text style={[local.legendaValor, { color: theme.red }]} numberOfLines={1}>
                  {formatarValorVisivel(totalFixoNaoPago)}
                </Text>
              </View>
            </View>

            <View style={[local.totalLinha, { borderTopColor: theme.border }]}>
              <Text style={[local.legendaRotulo, { color: theme.muted }]}>Total do mês</Text>
              <Text style={[local.totalValor, { color: theme.text }]} numberOfLines={1}>
                {formatarValorVisivel(total)}
              </Text>
            </View>
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
            meta={item.pagoNoDia ? `Pago no dia ${item.pagoNoDia}` : undefined}
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
            refItem={registrarItem(item.id)}
          />
        ))
      )}
    </View>
  )
}

const local = StyleSheet.create({
  resumo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 4,
  },
  legenda: { flex: 1, minWidth: 0, gap: 11 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  marca: { width: 9, height: 9, borderRadius: 999 },
  legendaRotulo: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.9 },
  legendaValor: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3, marginTop: 1 },
  totalLinha: { borderTopWidth: 1, paddingTop: 10 },
  totalValor: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2, marginTop: 2 },
})

export default memo(FixoTab)
