import { memo } from 'react'
import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import type { ShoppingWishItem, Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import PressableScale from '../common/motion/PressableScale'

type ComprasDesejoCardProps = {
  theme: Tema
  itens: ShoppingWishItem[]
  highlightedItemId: string | null
  formatarValorVisivel: (valor: number) => string
  registrarLayoutItem: (id: string, y: number, height?: number) => void
  renderHighlightOverlay: (id: string) => ReactNode
  onNovo: () => void
  onEditar: (item: ShoppingWishItem) => void
  onAlternarComprado: (id: string, comprado: boolean) => void
  onExcluir: (id: string, nome: string) => void
}

/**
 * Lista de itens que o usuario quer acompanhar antes de decidir comprar.
 */
function ComprasDesejoCard({
  theme,
  itens,
  highlightedItemId,
  formatarValorVisivel,
  registrarLayoutItem,
  renderHighlightOverlay,
  onNovo,
  onEditar,
  onAlternarComprado,
  onExcluir,
}: ComprasDesejoCardProps) {
  return (
    <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.manageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>Coisas para comprar</Text>
          <Text style={[styles.manageSub, { color: theme.muted }]}>
            Itens que você quer acompanhar antes de decidir comprar.
          </Text>
        </View>
        <PressableScale onPress={onNovo} style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}>
          <Text style={[styles.smallActionBtnText, { color: theme.white }]}>+ Item</Text>
        </PressableScale>
      </View>

      {itens.length === 0 ? (
        <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
          <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhum item salvo.</Text>
        </View>
      ) : (
        itens.map((item) => (
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
                <Text style={[styles.rowItemMeta, { color: theme.muted }]}>
                  Preço encontrado: {formatarValorVisivel(item.precoAtual)}
                </Text>
                <Text style={[styles.rowItemMeta, { color: theme.muted }]}>
                  {item.loja || 'Loja não informada'} · {item.dataVista || 'Data não informada'}
                </Text>
                {!!item.observacao && (
                  <Text style={[styles.rowItemMeta, { color: theme.muted }]}>{item.observacao}</Text>
                )}
              </View>
              <View style={styles.inlineActions}>
                <PressableScale
                  onPress={() => onAlternarComprado(item.id, !item.comprado)}
                  style={[
                    styles.statusBtn,
                    {
                      backgroundColor: item.comprado ? theme.green : theme.card,
                      borderWidth: 1,
                      borderColor: item.comprado ? theme.green : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.statusBtnText, { color: item.comprado ? theme.white : theme.text }]}>
                    {item.comprado ? 'Comprado' : 'Não comprado'}
                  </Text>
                </PressableScale>
                <PressableScale onPress={() => onEditar(item)} style={styles.iconBtn}>
                  <Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text>
                </PressableScale>
                <PressableScale onPress={() => onExcluir(item.id, item.nome)} style={styles.iconBtn}>
                  <Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text>
                </PressableScale>
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  )
}

export default memo(ComprasDesejoCard)
