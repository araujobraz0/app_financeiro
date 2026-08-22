import { memo } from 'react'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { ShoppingWishItem, Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import Icon from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

type ComprasDesejoCardProps = {
  theme: Tema
  itens: ShoppingWishItem[]
  highlightedItemId: string | null
  formatarValorVisivel: (valor: number) => string
  registrarItem: (id: string) => (node: View | null) => void
  renderHighlightOverlay: (id: string) => ReactNode
  onNovo: () => void
  onEditar: (item: ShoppingWishItem) => void
  onAlternarComprado: (id: string, comprado: boolean) => void
  onExcluir: (id: string, nome: string) => void
}

/**
 * Coisas para comprar.
 *
 * Uma lista de linhas largas era muito espaco para itens com pouco texto —
 * nome, preco e loja. Em grade de dois, cabe o dobro na tela e a comparacao
 * de precos entre os itens fica imediata, que e o ponto da secao.
 */
function ComprasDesejoCard({
  theme,
  itens,
  highlightedItemId,
  formatarValorVisivel,
  registrarItem,
  renderHighlightOverlay,
  onNovo,
  onEditar,
  onAlternarComprado,
  onExcluir,
}: ComprasDesejoCardProps) {
  const pendentes = itens.filter((item) => !item.comprado).length
  const totalPendente = itens
    .filter((item) => !item.comprado)
    .reduce((acc, item) => acc + Number(item.precoAtual || 0), 0)

  return (
    <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.manageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>Lista de desejos</Text>
          <Text style={[styles.manageSub, { color: theme.muted }]}>
            {itens.length === 0
              ? 'Nada na lista'
              : `${pendentes} pendente${pendentes === 1 ? '' : 's'} · ${formatarValorVisivel(totalPendente)}`}
          </Text>
        </View>
        <PressableScale
          onPress={onNovo}
          style={[styles.smallActionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
        >
          <Icon name="adicionar" size={18} color={theme.textInverse} />
        </PressableScale>
      </View>

      {itens.length === 0 ? (
        <PressableScale
          onPress={onNovo}
          style={[local.vazio, { borderColor: theme.borderStrong, backgroundColor: theme.cardSoft }]}
        >
          <Icon name="carrinho" size={22} color={theme.muted} />
          <Text style={[local.vazioTexto, { color: theme.muted }]}>
            Anote o que você quer e acompanhe o preço
          </Text>
        </PressableScale>
      ) : (
        <View style={local.grade}>
          {itens.map((item) => (
            <View
              key={item.id}
              ref={registrarItem(item.id)}
              collapsable={false}
              style={[
                local.item,
                {
                  backgroundColor: theme.cardSoft,
                  borderColor: highlightedItemId === item.id ? theme.accent : theme.border,
                  opacity: item.comprado ? 0.62 : 1,
                },
              ]}
            >
              {renderHighlightOverlay(item.id)}

              <PressableScale onPress={() => onEditar(item)} scaleTo={0.98} style={local.itemToque}>
                <Text
                  style={[
                    local.nome,
                    { color: theme.text, textDecorationLine: item.comprado ? 'line-through' : 'none' },
                  ]}
                  numberOfLines={2}
                >
                  {item.nome}
                </Text>
                <Text style={[local.preco, { color: item.comprado ? theme.muted : theme.text }]} numberOfLines={1}>
                  {formatarValorVisivel(item.precoAtual)}
                </Text>
                {item.loja ? (
                  <Text style={[local.loja, { color: theme.muted }]} numberOfLines={1}>
                    {item.loja}
                  </Text>
                ) : null}
              </PressableScale>

              <View style={local.rodape}>
                <PressableScale
                  onPress={() => onAlternarComprado(item.id, !item.comprado)}
                  style={[
                    local.marcar,
                    {
                      backgroundColor: item.comprado ? theme.greenSoft : theme.card,
                      borderColor: item.comprado ? theme.green : theme.border,
                    },
                  ]}
                >
                  <Icon
                    name="confirmar"
                    size={12}
                    color={item.comprado ? theme.green : theme.faint}
                  />
                  <Text
                    style={[local.marcarTexto, { color: item.comprado ? theme.green : theme.muted }]}
                    numberOfLines={1}
                  >
                    {item.comprado ? 'Comprado' : 'Marcar'}
                  </Text>
                </PressableScale>

                <PressableScale onPress={() => onExcluir(item.id, item.nome)} hitSlop={6} style={local.excluir}>
                  <Icon name="excluir" size={14} color={theme.red} />
                </PressableScale>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const local = StyleSheet.create({
  vazio: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 7,
  },
  vazioTexto: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: {
    position: 'relative',
    overflow: 'hidden',
    width: '47.6%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    justifyContent: 'space-between',
    minHeight: 132,
  },
  itemToque: { width: '100%' },
  nome: { fontSize: 13, fontWeight: '700', lineHeight: 18, letterSpacing: -0.2 },
  preco: { fontSize: 17, fontWeight: '800', letterSpacing: -0.4, marginTop: 7 },
  loja: { fontSize: 11, fontWeight: '500', marginTop: 2 },
  rodape: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  marcar: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 30,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  marcarTexto: { fontSize: 10, fontWeight: '800' },
  excluir: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
})

export default memo(ComprasDesejoCard)
