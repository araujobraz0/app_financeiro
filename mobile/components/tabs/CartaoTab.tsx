import { memo } from 'react'
import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { CardInstallment, CardItem, Tema } from '../../app/types'
import { formatarDiaMes } from '../../src/utils/dates'
import { styles } from '../../src/theme/homeStyles'
import Icon from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'
import CartaoVisual from './CartaoVisual'

type CartaoTabProps = {
  theme: Tema
  cards: CardItem[]
  selectedCard: CardItem | null
  selectedCardId: string | null
  onSelectCard: (id: string) => void
  parcelasOrdenadas: CardInstallment[]
  totalCartaoSelecionado: number
  limiteCartaoSelecionado: number
  limiteDisponivelCartao: number
  totalFaturaAtual: number
  totalProximaFatura: number
  percentualUsoCartao: number
  datasFaturaCartao: { fechamentoAtual: string; vencimentoAtual: string }
  highlightedItemId: string | null
  formatarValorVisivel: (valor: number) => string
  registrarLayoutItem: (id: string, y: number, height?: number) => void
  renderHighlightOverlay: (id: string) => ReactNode
  onNovoCartao: () => void
  onGerenciarCartoes: () => void
  onAbrirFiltro: () => void
  onAnteciparFatura: () => void
  onEditarParcela: (item: CardInstallment) => void
  onExcluirParcela: (id: string, descricao: string) => void
}

/**
 * Aba "Cartões".
 *
 * Organizada em tres blocos, do mais concreto para o mais detalhado:
 *   1. os cartoes, desenhados como cartoes de verdade;
 *   2. a fatura do cartao selecionado, com um numero principal em destaque;
 *   3. as compras parceladas da competencia.
 */
function CartaoTab({
  theme,
  cards,
  selectedCard,
  selectedCardId,
  onSelectCard,
  parcelasOrdenadas,
  totalCartaoSelecionado,
  limiteCartaoSelecionado,
  limiteDisponivelCartao,
  totalFaturaAtual,
  totalProximaFatura,
  percentualUsoCartao,
  datasFaturaCartao,
  highlightedItemId,
  formatarValorVisivel,
  registrarLayoutItem,
  renderHighlightOverlay,
  onNovoCartao,
  onGerenciarCartoes,
  onAbrirFiltro,
  onAnteciparFatura,
  onEditarParcela,
  onExcluirParcela,
}: CartaoTabProps) {
  const usoAlto = percentualUsoCartao >= 85
  const corUso = usoAlto ? theme.red : percentualUsoCartao >= 60 ? theme.accent : theme.green

  return (
    <>
      {/* ---------- 1. Os cartoes ---------- */}
      <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.manageHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.manageTitle, { color: theme.text }]}>Meus cartões</Text>
            <Text style={[styles.manageSub, { color: theme.muted }]}>
              {cards.length === 0
                ? 'Nenhum cartão cadastrado'
                : `${cards.length} ${cards.length === 1 ? 'cartão' : 'cartões'} · ${formatarValorVisivel(totalCartaoSelecionado)} no mês`}
            </Text>
          </View>
          <View style={styles.categoryToolbar}>
            <PressableScale onPress={onNovoCartao} style={[styles.smallActionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
              <Icon name="adicionar" size={18} color={theme.textInverse} />
            </PressableScale>
            <PressableScale onPress={onGerenciarCartoes} style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.smallActionBtnText, { color: theme.text }]}>Gerenciar</Text>
            </PressableScale>
          </View>
        </View>

        {cards.length === 0 ? (
          <PressableScale
            onPress={onNovoCartao}
            style={[local.vazio, { borderColor: theme.borderStrong, backgroundColor: theme.cardSoft }]}
          >
            <Icon name="cartao" size={30} color={theme.muted} />
            <Text style={[local.vazioTitulo, { color: theme.text }]}>Cadastre seu primeiro cartão</Text>
            <Text style={[local.vazioSub, { color: theme.muted }]}>
              Acompanhe limite, fatura e parcelas em um lugar só.
            </Text>
          </PressableScale>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={local.carrossel}
            snapToInterval={262}
            decelerationRate="fast"
          >
            {cards.map((card) => (
              <CartaoVisual
                key={card.id}
                card={card}
                theme={theme}
                ativo={selectedCardId === card.id}
                limiteTexto={card.limite ? formatarValorVisivel(card.limite) : 'Sem limite'}
                onPress={() => onSelectCard(card.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* ---------- 2. A fatura do cartao selecionado ---------- */}
      {selectedCard && (
        <View
          onLayout={(event) => registrarLayoutItem(selectedCard.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)}
          style={[
            styles.manageCard,
            highlightedItemId === selectedCard.id && styles.searchHighlightCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {renderHighlightOverlay(selectedCard.id)}

          <Text style={[styles.smallLabel, { color: theme.muted, textAlign: 'left' }]}>
            Fatura de {selectedCard.nome}
          </Text>
          <Text style={[local.faturaValor, { color: theme.text }]}>
            {formatarValorVisivel(totalFaturaAtual)}
          </Text>
          <Text style={[styles.rowItemMeta, { color: theme.muted, marginTop: 2 }]}>
            Fecha em {datasFaturaCartao.fechamentoAtual} · vence em {datasFaturaCartao.vencimentoAtual}
          </Text>

          {/* Uso do limite */}
          <View style={local.limiteBloco}>
            <View style={local.limiteTopo}>
              <Text style={[local.limiteRotulo, { color: theme.muted }]}>Limite usado</Text>
              <Text style={[local.limitePercent, { color: corUso }]}>
                {percentualUsoCartao.toFixed(0)}%
              </Text>
            </View>
            <View style={[local.trilha, { backgroundColor: theme.backgroundSoft, borderColor: theme.border }]}>
              <View
                style={[
                  local.preenchimento,
                  { width: `${Math.min(100, Math.max(3, percentualUsoCartao))}%`, backgroundColor: corUso },
                ]}
              />
            </View>
            <View style={local.limiteTopo}>
              <Text style={[local.limiteMeta, { color: theme.muted }]}>
                Disponível {formatarValorVisivel(limiteDisponivelCartao)}
              </Text>
              <Text style={[local.limiteMeta, { color: theme.muted }]}>
                Limite {formatarValorVisivel(limiteCartaoSelecionado)}
              </Text>
            </View>
          </View>

          {totalProximaFatura > 0 ? (
            <View style={[local.proxima, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[local.limiteRotulo, { color: theme.muted }]}>Próxima fatura</Text>
                <Text style={[local.proximaValor, { color: theme.text }]}>
                  {formatarValorVisivel(totalProximaFatura)}
                </Text>
              </View>
              <PressableScale
                onPress={onAnteciparFatura}
                style={[local.anteciparBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={[local.anteciparTexto, { color: theme.textInverse }]}>Antecipar</Text>
              </PressableScale>
            </View>
          ) : null}
        </View>
      )}

      {/* ---------- 3. Compras parceladas ---------- */}
      <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.manageHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.manageTitle, { color: theme.text }]}>Compras parceladas</Text>
            <Text style={[styles.manageSub, { color: theme.muted }]}>
              {parcelasOrdenadas.length === 0
                ? 'Nada neste mês'
                : `${parcelasOrdenadas.length} ${parcelasOrdenadas.length === 1 ? 'compra' : 'compras'} neste mês`}
            </Text>
          </View>
          <PressableScale onPress={onAbrirFiltro} style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
            <Icon name="ordenar" size={15} color={theme.text} />
          </PressableScale>
        </View>

        {!selectedCard ? (
          <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
            <Text style={[styles.emptyChartText, { color: theme.muted }]}>
              Selecione um cartão acima para ver as compras.
            </Text>
          </View>
        ) : parcelasOrdenadas.length === 0 ? (
          <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
            <Text style={[styles.emptyChartText, { color: theme.muted }]}>
              Nenhuma compra parcelada neste mês.
            </Text>
          </View>
        ) : (
          parcelasOrdenadas.map((item) => {
            const progresso = item.totalParcelas > 0 ? item.parcelaAtual / item.totalParcelas : 0
            return (
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
                <Text style={[styles.rowItemTitle, { color: theme.text }]} numberOfLines={2}>
                  {item.descricao}
                </Text>

                <View style={local.linhaValor}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[local.parcelaValor, { color: theme.text }]} numberOfLines={1}>
                      {formatarValorVisivel(item.valorParcela)}
                    </Text>
                    <Text style={[styles.rowItemMeta, { color: theme.muted }]} numberOfLines={1}>
                      Parcela {item.parcelaAtual} de {item.totalParcelas} · {formatarDiaMes(item.dia, item.competencia)}
                    </Text>
                  </View>
                  <View style={local.acoes}>
                    <PressableScale onPress={() => onEditarParcela(item)} style={[local.acaoBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Icon name="editar" size={14} color={theme.muted} />
                    </PressableScale>
                    <PressableScale onPress={() => onExcluirParcela(item.id, item.descricao)} style={[local.acaoBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
                      <Icon name="excluir" size={16} color={theme.red} />
                    </PressableScale>
                  </View>
                </View>

                {/* Quanto da compra ja foi pago */}
                <View style={[local.progressoTrilha, { backgroundColor: theme.background }]}>
                  <View style={[local.progressoFill, { width: `${progresso * 100}%`, backgroundColor: theme.green }]} />
                </View>
              </View>
            )
          })
        )}
      </View>
    </>
  )
}

const local = StyleSheet.create({
  carrossel: { gap: 12, paddingRight: 4, paddingVertical: 2 },
  vazio: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 26,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 6,
  },
  vazioTitulo: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  vazioSub: { fontSize: 12, fontWeight: '500', textAlign: 'center', lineHeight: 17 },

  faturaValor: { fontSize: 30, fontWeight: '800', letterSpacing: -1, marginTop: 4 },

  limiteBloco: { marginTop: 16, gap: 7 },
  limiteTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  limiteRotulo: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  limitePercent: { fontSize: 13, fontWeight: '800' },
  limiteMeta: { fontSize: 11, fontWeight: '600' },
  trilha: { height: 9, borderRadius: 999, borderWidth: 1, overflow: 'hidden' },
  preenchimento: { height: '100%', borderRadius: 999 },

  proxima: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  proximaValor: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 },
  anteciparBtn: { minHeight: 40, paddingHorizontal: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  anteciparTexto: { fontSize: 13, fontWeight: '800' },

  linhaValor: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  parcelaValor: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  acoes: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  acaoBtn: { width: 32, height: 32, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  progressoTrilha: { height: 4, borderRadius: 999, overflow: 'hidden', marginTop: 10 },
  progressoFill: { height: '100%', borderRadius: 999 },
})

export default memo(CartaoTab)
