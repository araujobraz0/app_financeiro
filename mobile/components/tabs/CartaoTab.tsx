import { memo } from 'react'
import type { ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { CardInstallment, CardItem, Tema } from '../../app/types'
import { corDoCartao } from '../../src/utils/cardColor'
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
  /** Dia em que a fatura deste mes foi paga. Null enquanto estiver em aberto. */
  faturaPagaNoDia: number | null
  onAlternarFaturaPaga: () => void
  /** Cobrancas que se repetem todo mes neste cartao. */
  assinaturas: { id: string; nome: string; valor: number }[]
  totalAssinaturas: number
  onNovaAssinatura: () => void
  onEditarAssinatura: (item: { id: string; nome: string; valor: number }) => void
  onExcluirAssinatura: (id: string, nome: string) => void
  highlightedItemId: string | null
  formatarValorVisivel: (valor: number) => string
  registrarItem: (id: string) => (node: View | null) => void
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
  faturaPagaNoDia,
  onAlternarFaturaPaga,
  assinaturas,
  totalAssinaturas,
  onNovaAssinatura,
  onEditarAssinatura,
  onExcluirAssinatura,
  highlightedItemId,
  formatarValorVisivel,
  registrarItem,
  renderHighlightOverlay,
  onNovoCartao,
  onGerenciarCartoes,
  onAbrirFiltro,
  onAnteciparFatura,
  onEditarParcela,
  onExcluirParcela,
}: CartaoTabProps) {
  const faturaPaga = typeof faturaPagaNoDia === 'number'
  const usoAlto = percentualUsoCartao >= 85
  const corUso = usoAlto ? theme.red : percentualUsoCartao >= 60 ? theme.accent : theme.green

  const prazoTexto = faturaPaga
    ? 'Quitada'
    : diasAteVencimentoCartao === null
      ? '—'
      : diasAteVencimentoCartao === 0
        ? 'Vence hoje'
        : diasAteVencimentoCartao > 0
          ? `${diasAteVencimentoCartao} ${diasAteVencimentoCartao === 1 ? 'dia' : 'dias'}`
          : `Venceu há ${Math.abs(diasAteVencimentoCartao)}`
  const prazoCor = faturaPaga
    ? theme.green
    : diasAteVencimentoCartao === null
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
          ref={registrarItem(selectedCard.id)}
          collapsable={false}
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
          <View style={local.faturaLinha}>
            <Text style={[local.faturaValor, { color: faturaPaga ? theme.muted : theme.text }]}>
              {formatarValorVisivel(totalFaturaAtual)}
            </Text>
            {faturaPaga ? (
              <View style={[local.seloPaga, { backgroundColor: theme.greenSoft, borderColor: theme.green }]}>
                <Icon name="confirmar" size={12} color={theme.green} />
                <Text style={[local.seloPagaTexto, { color: theme.green }]}>Paga</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.rowItemMeta, { color: theme.muted, marginTop: 2 }]}>
            {faturaPaga
              ? `Paga no dia ${faturaPagaNoDia} · vencia em ${datasFaturaCartao.vencimentoAtual}`
              : `Fecha em ${datasFaturaCartao.fechamentoAtual} · vence em ${datasFaturaCartao.vencimentoAtual}`}
            {totalAssinaturas > 0 ? ` · inclui ${formatarValorVisivel(totalAssinaturas)} de assinaturas` : ''}
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

          {/* Pagar a fatura e uma acao do mes, nao do cartao: cada competencia
              guarda o proprio dia de pagamento. */}
          {totalFaturaAtual > 0 || faturaPaga ? (
            <PressableScale
              onPress={onAlternarFaturaPaga}
              scaleTo={0.97}
              accessibilityRole="button"
              accessibilityLabel={faturaPaga ? 'Reabrir a fatura' : 'Marcar a fatura como paga'}
              style={[
                local.pagar,
                faturaPaga
                  ? { backgroundColor: theme.cardSoft, borderColor: theme.border }
                  : { backgroundColor: theme.primary, borderColor: theme.primary },
              ]}
            >
              <Icon
                name={faturaPaga ? 'desfazer' : 'confirmar'}
                size={16}
                color={faturaPaga ? theme.muted : theme.textInverse}
              />
              <Text
                style={[local.pagarTexto, { color: faturaPaga ? theme.muted : theme.textInverse }]}
              >
                {faturaPaga ? 'Reabrir fatura' : 'Marcar fatura como paga'}
              </Text>
            </PressableScale>
          ) : null}

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

      {/* ---------- 3. Assinaturas ----------
          Sao cobrancas do mesmo cartao, so que sem fim a vista: nao cabem em
          "compras parceladas", que tem contagem, nem em gastos fixos, que nao
          entram na fatura. Por isso um bloco proprio. */}
      {selectedCard ? (
        <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.manageHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.manageTitle, { color: theme.text }]}>Assinaturas</Text>
              <Text style={[styles.manageSub, { color: theme.muted }]}>
                {assinaturas.length === 0
                  ? 'Spotify, Netflix e outras cobranças mensais'
                  : `${assinaturas.length} ${assinaturas.length === 1 ? 'assinatura' : 'assinaturas'} · ${formatarValorVisivel(totalAssinaturas)} por mês`}
              </Text>
            </View>
            <PressableScale
              onPress={onNovaAssinatura}
              accessibilityRole="button"
              accessibilityLabel="Nova assinatura"
              style={[styles.smallActionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
            >
              <Icon name="adicionar" size={18} color={theme.textInverse} />
            </PressableScale>
          </View>

          {assinaturas.length === 0 ? (
            <PressableScale
              onPress={onNovaAssinatura}
              style={[local.vazioAssinatura, { borderColor: theme.borderStrong, backgroundColor: theme.cardSoft }]}
            >
              <Icon name="aba_fixo" size={22} color={theme.muted} />
              <Text style={[local.vazioSub, { color: theme.muted }]}>
                Cadastre uma vez e ela entra na fatura todo mês.
              </Text>
            </PressableScale>
          ) : (
            /* Ladrilhos em vez de lista: assinatura se reconhece pela marca,
               nao pelo texto. Cada uma vira um bloco com a inicial num quadro
               colorido — como os icones de app que voce ja associa a elas. */
            <View style={local.gradeAssinaturas}>
              {assinaturas.map((item) => {
                const cor = corDoCartao(item.id)

                return (
                  <PressableScale
                    key={item.id}
                    onPress={() => onEditarAssinatura(item)}
                    scaleTo={0.96}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${item.nome}`}
                    style={[local.assinatura, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
                  >
                    <View style={[local.assinaturaMarca, { backgroundColor: cor.base }]}>
                      <Text style={local.assinaturaInicial}>
                        {item.nome.trim().charAt(0).toUpperCase() || '?'}
                      </Text>
                      <View style={[local.assinaturaBrilho, { backgroundColor: cor.luz }]} pointerEvents="none" />
                    </View>

                    <Text style={[local.assinaturaNome, { color: theme.text }]} numberOfLines={1}>
                      {item.nome}
                    </Text>
                    <Text style={[local.assinaturaValor, { color: theme.text }]} numberOfLines={1}>
                      {formatarValorVisivel(item.valor)}
                    </Text>
                    <Text style={[local.assinaturaPeriodo, { color: theme.muted }]}>por mês</Text>

                    <PressableScale
                      onPress={() => onExcluirAssinatura(item.id, item.nome)}
                      scaleTo={0.88}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Excluir ${item.nome}`}
                      style={[local.assinaturaExcluir, { backgroundColor: theme.card, borderColor: theme.border }]}
                    >
                      <Icon name="excluir" size={12} color={theme.red} />
                    </PressableScale>
                  </PressableScale>
                )
              })}

              <PressableScale
                onPress={onNovaAssinatura}
                scaleTo={0.96}
                accessibilityRole="button"
                accessibilityLabel="Nova assinatura"
                style={[local.assinaturaNova, { borderColor: theme.borderStrong }]}
              >
                <Icon name="adicionar" size={20} color={theme.muted} />
                <Text style={[local.assinaturaNovaTexto, { color: theme.muted }]}>Adicionar</Text>
              </PressableScale>
            </View>
          )}
        </View>
      ) : null}

      {/* ---------- 4. Compras parceladas ---------- */}
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
                  ref={registrarItem(item.id)}
                  collapsable={false}
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
  gradeAssinaturas: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  assinatura: {
    width: '48%',
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  assinaturaMarca: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  assinaturaInicial: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', zIndex: 1 },
  assinaturaBrilho: {
    position: 'absolute',
    top: -14,
    right: -12,
    width: 34,
    height: 34,
    borderRadius: 999,
    opacity: 0.55,
  },
  assinaturaNome: { fontSize: 12.5, fontWeight: '800', letterSpacing: -0.2 },
  assinaturaValor: { fontSize: 15, fontWeight: '800', letterSpacing: -0.4, marginTop: 3 },
  assinaturaPeriodo: { fontSize: 9.5, fontWeight: '600', marginTop: 1 },
  assinaturaExcluir: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assinaturaNova: {
    width: '48%',
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 12,
    minHeight: 118,
  },
  assinaturaNovaTexto: { fontSize: 11.5, fontWeight: '800' },
  vazioAssinatura: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 96,
    paddingHorizontal: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  faturaLinha: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  seloPaga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 26,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  seloPagaTexto: { fontSize: 11, fontWeight: '800' },
  pagar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  pagarTexto: { fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 },
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
