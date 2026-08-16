import { memo } from 'react'
import type { ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import type { CardInstallment, CardItem, Tema } from '../../app/types'
import { formatarDiaMes } from '../../src/utils/dates'
import { styles } from '../../src/theme/homeStyles'

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
 * Aba "Cartão": resumo da fatura do cartao selecionado e lista de parcelas
 * da competencia.
 *
 * Envolvida em React.memo pelo mesmo motivo das outras abas.
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
  return (
    <>
      <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.manageHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.manageTitle, { color: theme.text }]}>Cartões</Text>
            <Text style={[styles.manageSub, { color: theme.muted }]}>
              Total do mês selecionado: {formatarValorVisivel(totalCartaoSelecionado)}
            </Text>
          </View>
          <View style={styles.categoryToolbar}>
            <Pressable onPress={onNovoCartao} style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}>
              <Text style={[styles.smallActionBtnIcon, { color: theme.white }]}>＋</Text>
            </Pressable>
            <Pressable
              onPress={onGerenciarCartoes}
              style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
            >
              <Text style={[styles.smallActionBtnText, { color: theme.text }]}>Gerenciar</Text>
            </Pressable>
            <Pressable
              onPress={onAbrirFiltro}
              style={[styles.smallActionBtn, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
            >
              <Text style={[styles.smallActionBtnIcon, { color: theme.text }]}>☷</Text>
            </Pressable>
          </View>
        </View>

        {selectedCard && (
          <View
            onLayout={(event) => registrarLayoutItem(selectedCard.id, event.nativeEvent.layout.y, event.nativeEvent.layout.height)}
            style={[
              styles.settingsCard,
              highlightedItemId === selectedCard.id && styles.searchHighlightCard,
              { backgroundColor: theme.cardSoft, borderColor: theme.border, marginTop: 0, marginBottom: 10 },
            ]}
          >
            {renderHighlightOverlay(selectedCard.id)}
            <Text style={[styles.settingsSectionTitle, { color: theme.text }]}>Fatura real</Text>
            <Text style={[styles.rowItemMeta, { color: theme.muted, marginBottom: 10 }]}>
              Fechamento da parcela: {datasFaturaCartao.fechamentoAtual} · Vencimento: {datasFaturaCartao.vencimentoAtual}
            </Text>
            <View style={styles.settingsInfoGrid}>
              <View style={[styles.settingsInfoPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.settingsInfoLabel, { color: theme.muted }]}>Limite</Text>
                <Text style={[styles.settingsInfoValue, { color: theme.text }]}>{formatarValorVisivel(limiteCartaoSelecionado)}</Text>
              </View>
              <View style={[styles.settingsInfoPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.settingsInfoLabel, { color: theme.muted }]}>Disponível</Text>
                <Text style={[styles.settingsInfoValue, { color: theme.text }]}>{formatarValorVisivel(limiteDisponivelCartao)}</Text>
              </View>
              <View style={[styles.settingsInfoPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.settingsInfoLabel, { color: theme.muted }]}>Fatura atual</Text>
                <Text style={[styles.settingsInfoValue, { color: theme.text }]}>{formatarValorVisivel(totalFaturaAtual)}</Text>
              </View>
              <View style={[styles.settingsInfoPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.settingsInfoLabel, { color: theme.muted }]}>Próxima</Text>
                <Text style={[styles.settingsInfoValue, { color: theme.text }]}>{formatarValorVisivel(totalProximaFatura)}</Text>
              </View>
            </View>
            <View style={[styles.compareBarTrack, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
              <View
                style={[
                  styles.compareBarFill,
                  {
                    width: `${Math.max(4, percentualUsoCartao)}%` as const,
                    backgroundColor: percentualUsoCartao >= 85 ? theme.red : theme.blue,
                  },
                ]}
              />
            </View>
            <Text style={[styles.cardLimitPercent, { color: theme.muted }]}>
              {percentualUsoCartao.toFixed(1).replace('.', ',')}% do limite usado
            </Text>
            {totalProximaFatura > 0 ? (
              <Pressable
                onPress={onAnteciparFatura}
                style={[styles.settingsActionBtn, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 12 }]}
              >
                <Text style={[styles.settingsActionBtnText, { color: theme.text }]}>Antecipar fatura do mês seguinte</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {cards.map((card) => (
            <Pressable
              key={card.id}
              onPress={() => onSelectCard(card.id)}
              style={[
                styles.filterPill,
                {
                  backgroundColor: selectedCardId === card.id ? theme.primary : theme.cardSoft,
                  borderColor: selectedCardId === card.id ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={[styles.filterPillText, { color: selectedCardId === card.id ? theme.white : theme.text }]}>
                {card.nome}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {!selectedCard ? (
          <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
            <Text style={[styles.emptyChartText, { color: theme.muted }]}>Crie ou selecione um cartão.</Text>
          </View>
        ) : parcelasOrdenadas.length === 0 ? (
          <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
            <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhuma parcela neste mês.</Text>
          </View>
        ) : (
          parcelasOrdenadas.map((item) => (
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
                  <Text style={[styles.rowItemTitle, { color: theme.text }]}>{item.descricao}</Text>
                  <Text style={[styles.rowItemMeta, { color: theme.muted }]}>
                    {item.parcelaAtual}/{item.totalParcelas} parcelas · {formatarDiaMes(item.dia, item.competencia)}
                  </Text>
                </View>
                <View style={styles.inlineActions}>
                  <Text style={[styles.rowItemValue, { color: theme.blue }]}>{formatarValorVisivel(item.valorParcela)}</Text>
                  <Pressable onPress={() => onEditarParcela(item)} style={styles.iconBtn}>
                    <Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text>
                  </Pressable>
                  <Pressable onPress={() => onExcluirParcela(item.id, item.descricao)} style={styles.iconBtn}>
                    <Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </>
  )
}

export default memo(CartaoTab)
