import { memo } from 'react'
import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import type { ShoppingWishItem, Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import PressableScale from '../common/motion/PressableScale'
import ListRow from '../common/ListRow'

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
          <ListRow
            key={item.id}
            theme={theme}
            titulo={item.nome}
            valor={formatarValorVisivel(item.precoAtual)}
            valorCor={item.comprado ? theme.muted : theme.text}
            meta={[item.loja || 'Loja não informada', item.dataVista || 'Data não informada'].join(' · ')}
            status={{
              label: item.comprado ? 'Comprado' : 'Quero',
              ativo: item.comprado,
              onPress: () => onAlternarComprado(item.id, !item.comprado),
            }}
            onEditar={() => onEditar(item)}
            onExcluir={() => onExcluir(item.id, item.nome)}
            destacado={highlightedItemId === item.id}
            overlay={renderHighlightOverlay(item.id)}
            onLayout={(y, height) => registrarLayoutItem(item.id, y, height)}
          >
            {item.observacao ? (
              <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '500', marginTop: 4, lineHeight: 17 }}>
                {item.observacao}
              </Text>
            ) : null}
          </ListRow>
        ))
      )}
    </View>
  )
}

export default memo(ComprasDesejoCard)
