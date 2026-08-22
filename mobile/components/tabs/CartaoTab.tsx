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
  /** Dia seguinte ao fechamento: maior prazo possivel para pagar. */
  melhorDiaCompraCartao: number | null
  /** Dias que faltam para a fatura vencer. Negativo quando ja venceu. */
  diasAteVencimentoCartao: number | null
  /** Soma das faturas do mes somando todos os cartoes. */
  totalTodosCartoesMes: number
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
  melhorDiaCompraCartao,
  diasAteVencimentoCartao,
  totalTodosCartoesMes,
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

  const prazoTexto =
    diasAteVencimentoCartao === null
      ? '—'
      : diasAteVencimentoCartao === 0
        ? 'Vence hoje'
        : diasAteVencimentoCartao > 0
          ? `${diasAteVencimentoCartao} ${diasAteVencimentoCartao === 1 ? 'dia' : 'dias'}`
          : `Venceu há ${Math.abs(diasAteVencimentoCartao)}`
  const prazoCor =
    diasAteVencimentoCartao === null
      ? theme.text
      : diasAteVencimentoCartao < 0
        ? theme.red
        : diasAteVencimentoCartao <= 5
          ? theme.accent
          : theme.text

  const dado = (rotulo: string, valor: string, cor?: string, apoio?: string) => (
    <View style={[local.dado, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
      <Text style={[local.dadoRotulo, { color: theme.muted }]} numberOfLines={2}>
        {rotulo}
      </Text>
      <Text style={[local.dadoValor, { color: cor || theme.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      {apoio ? (
        <Text style={[local.dadoApoio, { color: theme.faint }]} numberOfLines={1}>
          {apoio}
        </Text>
      ) : null}
    </View>
  )

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

          {/* O que antes so dava para saber fazendo conta na mao: prazo,
              melhor dia de compra, quanto ja esta comprometido la na frente e
              o total somando os outros cartoes. */}
          <View style={local.grade}>
            {dado('Vence em', prazoTexto, prazoCor, datasFaturaCartao.vencimentoAtual)}
            {dado(
              'Melhor dia',
              melhorDiaCompraCartao ? `Dia ${melhorDiaCompraCartao}` : '—',
              theme.text,
              melhorDiaCompraCartao ? 'Maior prazo para pagar' : 'Defina o fechamento'
            )}
            {dado(
              'Todos os cartões',
              formatarValorVisivel(totalTodosCartoesMes),
              theme.text,
              `${cards.length} ${cards.length === 1 ? 'cartão' : 'cartões'} neste mês`
            )}
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
            <Icon name="filtrar" size={15} color={theme.text} />
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
          <View style={local.gradeParcelas}>
            {parcelasOrdenadas.map((item) => {
              const pagas = Math.max(0, Math.min(item.parcelaAtual, item.totalParcelas))
              const restantes = Math.max(0, item.totalParcelas - pagas)
              const progresso = item.totalParcelas > 0 ? pagas / item.totalParcelas : 0
              const totalCompra = item.valorParcela * item.totalParcelas
              const faltaPagar = item.valorParcela * restantes
              const quitada = restantes === 0

              return (
                <View
                  key={item.id}
                  onLayout={(event) =>
                    registrarLayoutItem(item.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)
                  }
                  style={[
                    local.compra,
                    {
                      backgroundColor: theme.cardSoft,
                      borderColor: highlightedItemId === item.id ? theme.accent : theme.border,
                    },
                  ]}
                >
                  {renderHighlightOverlay(item.id)}

                  <View style={local.compraTopo}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[local.compraNome, { color: theme.text }]} numberOfLines={2}>
                        {item.descricao}
                      </Text>
                      <Text style={[local.compraMeta, { color: theme.muted }]} numberOfLines={1}>
                        {formatarDiaMes(item.dia, item.competencia)} · total {formatarValorVisivel(totalCompra)}
                      </Text>
                    </View>

                    <View style={local.compraAcoes}>
                      <PressableScale
                        onPress={() => onEditarParcela(item)}
                        hitSlop={6}
                        style={[local.acaoBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                      >
                        <Icon name="editar" size={13} color={theme.muted} />
                      </PressableScale>
                      <PressableScale
                        onPress={() => onExcluirParcela(item.id, item.descricao)}
                        hitSlop={6}
                        style={[local.acaoBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                      >
                        <Icon name="excluir" size={15} color={theme.red} />
                      </PressableScale>
                    </View>
                  </View>

                  {/* Uma marca por parcela: da para contar quantas faltam sem ler numero */}
                  <View style={local.marcadores}>
                    {Array.from({ length: Math.min(item.totalParcelas, 24) }, (_, i) => (
                      <View
                        key={i}
                        style={[
                          local.marcador,
                          { backgroundColor: i < pagas ? theme.green : theme.borderStrong },
                        ]}
                      />
                    ))}
                  </View>

                  <View style={local.compraRodape}>
                    <View style={local.parcelaBloco}>
                      <Text style={[local.parcelaValor, { color: theme.text }]} numberOfLines={1}>
                        {formatarValorVisivel(item.valorParcela)}
                      </Text>
                      <Text style={[local.parcelaLegenda, { color: theme.muted }]}>por mês</Text>
                    </View>

                    <View
                      style={[
                        local.selo,
                        {
                          backgroundColor: quitada ? theme.greenSoft : theme.accentSoft,
                          borderColor: quitada ? theme.green : theme.accent,
                        },
                      ]}
                    >
                      <Text
                        style={[local.seloTexto, { color: quitada ? theme.green : theme.accent }]}
                        numberOfLines={1}
                      >
                        {quitada
                          ? 'Quitada'
                          : `${pagas} de ${item.totalParcelas} · falta ${formatarValorVisivel(faltaPagar)}`}
                      </Text>
                    </View>
                  </View>

                  <View style={[local.progressoTrilha, { backgroundColor: theme.border }]}>
                    <View
                      style={[
                        local.progressoFill,
                        { width: `${progresso * 100}%`, backgroundColor: theme.green },
                      ]}
                    />
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </View>
    </>
  )
}

const local = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  dado: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 11,
  },
  dadoRotulo: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  dadoValor: { fontSize: 15, fontWeight: '800', letterSpacing: -0.3, marginTop: 4 },
  dadoApoio: { fontSize: 10, fontWeight: '600', marginTop: 2 },

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

  gradeParcelas: { gap: 8, marginTop: 4 },
  compra: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  compraTopo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  compraNome: { fontSize: 14, fontWeight: '700', lineHeight: 19, letterSpacing: -0.2 },
  compraMeta: { fontSize: 11, fontWeight: '500', marginTop: 3 },
  compraAcoes: { flexDirection: 'row', gap: 7, flexShrink: 0 },

  marcadores: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 10 },
  marcador: { flex: 1, minWidth: 6, height: 5, borderRadius: 999 },

  compraRodape: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  parcelaBloco: { flexShrink: 0 },
  parcelaValor: { fontSize: 17, fontWeight: '800', letterSpacing: -0.4 },
  parcelaLegenda: { fontSize: 10, fontWeight: '600', marginTop: 1 },
  selo: {
    flex: 1,
    minWidth: 0,
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seloTexto: { fontSize: 10, fontWeight: '800' },
  acaoBtn: { width: 30, height: 30, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  progressoTrilha: { height: 4, borderRadius: 999, overflow: 'hidden', marginTop: 10 },
  progressoFill: { height: '100%', borderRadius: 999 },
})

export default memo(CartaoTab)
