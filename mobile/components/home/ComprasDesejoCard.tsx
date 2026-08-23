import { memo, useMemo } from 'react'
import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { ShoppingWishItem, Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import Icon from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

type ComprasDesejoCardProps = {
  theme: Tema
  itens: ShoppingWishItem[]
  /** Quanto existe de verdade hoje, somando todos os meses. */
  saldoAcumulado: number
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
 * Antes era so um bloco de anotacoes com preco: o app sabia quanto o tenis
 * custava e quanto voce tem, mas quem tinha que fazer a conta era voce. Agora
 * cada desejo mostra o quanto do preco ja esta no bolso, e os que cabem no
 * saldo sobem para o topo com um selo — a pergunta que se faz olhando essa
 * lista e "da para comprar?", e agora ela esta respondida.
 */
function ComprasDesejoCard({
  theme,
  itens,
  saldoAcumulado,
  highlightedItemId,
  formatarValorVisivel,
  registrarItem,
  renderHighlightOverlay,
  onNovo,
  onEditar,
  onAlternarComprado,
  onExcluir,
}: ComprasDesejoCardProps) {
  const pendentes = itens.filter((item) => !item.comprado)
  const totalPendente = pendentes.reduce((acc, item) => acc + Number(item.precoAtual || 0), 0)
  const disponivel = Math.max(saldoAcumulado, 0)
  const quantosCabem = pendentes.filter((item) => Number(item.precoAtual || 0) <= disponivel).length

  /** Comprados vao para o fim; entre os pendentes, o mais perto de dar vem antes. */
  const ordenados = useMemo(
    () =>
      [...itens].sort((a, b) => {
        if (Boolean(a.comprado) !== Boolean(b.comprado)) return a.comprado ? 1 : -1
        return Number(a.precoAtual || 0) - Number(b.precoAtual || 0)
      }),
    [itens]
  )

  return (
    <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.manageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>Lista de desejos</Text>
          <Text style={[styles.manageSub, { color: theme.muted }]}>
            {itens.length === 0
              ? 'Nada na lista'
              : quantosCabem > 0
                ? `${quantosCabem} ${quantosCabem === 1 ? 'cabe' : 'cabem'} no saldo · ${formatarValorVisivel(totalPendente)} na lista`
                : `${pendentes.length} na lista · ${formatarValorVisivel(totalPendente)}`}
          </Text>
        </View>
        <PressableScale
          onPress={onNovo}
          accessibilityRole="button"
          accessibilityLabel="Novo desejo"
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
            Anote o que você quer e veja quanto falta para poder comprar
          </Text>
        </PressableScale>
      ) : (
        <View style={local.grade}>
          {ordenados.map((item) => {
            const preco = Number(item.precoAtual || 0)
            const proporcao = preco > 0 ? Math.min(disponivel / preco, 1) : 1
            const cabe = preco <= disponivel && preco > 0
            const falta = Math.max(preco - disponivel, 0)
            const cor = item.comprado ? theme.muted : cabe ? theme.green : theme.accent

            return (
              <View
                key={item.id}
                ref={registrarItem(item.id)}
                collapsable={false}
                style={[
                  local.item,
                  {
                    backgroundColor: theme.cardSoft,
                    borderColor: highlightedItemId === item.id ? theme.accent : theme.border,
                  },
                  item.comprado && local.itemComprado,
                ]}
              >
                {renderHighlightOverlay(item.id)}

                {/* Faixa de cor no topo: da para varrer a grade e ver quais ja
                    dao, sem ler nenhum numero. */}
                <View style={[local.faixa, { backgroundColor: cor }]} pointerEvents="none" />

                <PressableScale onPress={() => onEditar(item)} scaleTo={0.98} style={local.itemToque}>
                  <View style={local.topo}>
                    <Text
                      style={[
                        local.nome,
                        { color: theme.text, textDecorationLine: item.comprado ? 'line-through' : 'none' },
                      ]}
                      numberOfLines={2}
                    >
                      {item.nome}
                    </Text>
                  </View>

                  <Text style={[local.preco, { color: item.comprado ? theme.muted : theme.text }]} numberOfLines={1}>
                    {formatarValorVisivel(preco)}
                  </Text>

                  {item.loja ? (
                    <Text style={[local.loja, { color: theme.faint }]} numberOfLines={1}>
                      {item.loja}
                    </Text>
                  ) : null}

                  {item.comprado ? (
                    <View style={[local.selo, { backgroundColor: theme.greenSoft, borderColor: theme.green }]}>
                      <Icon name="confirmar" size={11} color={theme.green} />
                      <Text style={[local.seloTexto, { color: theme.green }]}>Comprado</Text>
                    </View>
                  ) : (
                    <View style={local.progresso}>
                      <View style={[local.trilha, { backgroundColor: theme.background }]}>
                        <View
                          style={[
                            local.preenchimento,
                            { width: `${Math.max(proporcao * 100, 3)}%`, backgroundColor: cor },
                          ]}
                        />
                      </View>
                      <Text style={[local.progressoTexto, { color: cor }]} numberOfLines={1}>
                        {cabe ? 'Dá para comprar' : `Faltam ${formatarValorVisivel(falta)}`}
                      </Text>
                    </View>
                  )}
                </PressableScale>

                <View style={local.rodape}>
                  <PressableScale
                    onPress={() => onAlternarComprado(item.id, !item.comprado)}
                    accessibilityRole="button"
                    accessibilityLabel={item.comprado ? `Desmarcar ${item.nome}` : `Marcar ${item.nome} como comprado`}
                    style={[
                      local.marcar,
                      {
                        backgroundColor: item.comprado ? theme.card : theme.primary,
                        borderColor: item.comprado ? theme.border : theme.primary,
                      },
                    ]}
                  >
                    <Icon
                      name={item.comprado ? 'desfazer' : 'carrinho'}
                      size={12}
                      color={item.comprado ? theme.muted : theme.textInverse}
                    />
                    <Text
                      style={[local.marcarTexto, { color: item.comprado ? theme.muted : theme.textInverse }]}
                      numberOfLines={1}
                    >
                      {item.comprado ? 'Reabrir' : 'Comprei'}
                    </Text>
                  </PressableScale>

                  <PressableScale
                    onPress={() => onExcluir(item.id, item.nome)}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={`Excluir ${item.nome}`}
                    style={[local.excluir, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Icon name="excluir" size={13} color={theme.red} />
                  </PressableScale>
                </View>
              </View>
            )
          })}
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
  vazioTexto: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 17 },

  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  item: {
    position: 'relative',
    overflow: 'hidden',
    width: '47.6%',
    borderWidth: 1,
    borderRadius: 18,
    paddingTop: 14,
    paddingBottom: 11,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },
  itemComprado: { opacity: 0.6 },
  faixa: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  itemToque: { width: '100%' },
  topo: { minHeight: 36 },
  nome: { fontSize: 13, fontWeight: '800', lineHeight: 18, letterSpacing: -0.2 },
  preco: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  loja: { fontSize: 10, fontWeight: '600', marginTop: 1 },

  progresso: { marginTop: 10 },
  trilha: { height: 5, borderRadius: 999, overflow: 'hidden' },
  preenchimento: { height: '100%', borderRadius: 999 },
  progressoTexto: { fontSize: 10, fontWeight: '800', marginTop: 5 },

  selo: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 24,
    paddingHorizontal: 9,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 12,
  },
  seloTexto: { fontSize: 10, fontWeight: '800' },

  rodape: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 11 },
  marcar: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  marcarTexto: { fontSize: 10.5, fontWeight: '800' },
  excluir: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default memo(ComprasDesejoCard)
