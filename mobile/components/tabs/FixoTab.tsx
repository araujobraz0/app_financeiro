import { memo } from 'react'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { FixoItem, Tema } from '../../app/types'
import { formatarDiaMes } from '../../src/utils/dates'
import { styles } from '../../src/theme/homeStyles'

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
 * Aba "Fixo": lista dos gastos recorrentes do mes com status de pagamento.
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
  return (
    <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.manageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>Gastos fixos</Text>
          <Text style={[styles.manageSub, { color: theme.muted }]}>
            Pago: {formatarValorVisivel(totalFixoPago)} · Não pago: {formatarValorVisivel(totalFixoNaoPago)}
          </Text>
        </View>
        <Pressable
          onPress={onAbrirFiltro}
          style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
        >
          <Text style={[styles.smallActionBtnIcon, { color: theme.text }]}>☷</Text>
        </Pressable>
      </View>

      {fixosOrdenados.map((item) => (
        <View
          key={item.id}
          onLayout={(event) => registrarLayoutItem(item.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)}
          style={[
            styles.fullRowCard,
            highlightedItemId === item.id && styles.searchHighlightCard,
            { borderColor: theme.border, backgroundColor: theme.cardSoft },
          ]}
        >
          {renderHighlightOverlay(item.id)}
          <View style={styles.fullRowTop}>
            <View style={styles.fullRowTitleWrap}>
              <Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.nome}</Text>
              <Text style={[styles.rowItemMeta, { color: theme.muted }]}>{formatarDiaMes(item.dia, chaveAtual)}</Text>
            </View>
            <View style={styles.inlineActions}>
              <Text style={[styles.rowItemValue, { color: theme.text }]}>{formatarValorVisivel(item.valor)}</Text>
              <Pressable
                style={[styles.statusBtn, { backgroundColor: item.pago ? theme.green : theme.red }]}
                onPress={() => onAlternarPago(item.id)}
              >
                <Text style={styles.statusBtnText}>{item.pago ? 'Pago' : 'Não pago'}</Text>
              </Pressable>
              <Pressable onPress={() => onEditar(item)} style={styles.iconBtn}>
                <Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text>
              </Pressable>
              <Pressable onPress={() => onExcluir(item.id, item.nome)} style={styles.iconBtn}>
                <Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

export default memo(FixoTab)
