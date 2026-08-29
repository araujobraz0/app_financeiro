// A carteira de investimentos, na home.
//
// O app ja tinha uma porcentagem de investimento nas configuracoes, mas ela
// nao levava a lugar nenhum: dizia "guarde 10%" e parava por ai. Quem
// investia de fato continuava com o patrimonio numa planilha, ou no extrato
// de cada corretora, sem nunca ver o total.
//
// Este card responde as tres perguntas que os apps de carteira respondem:
// quanto eu tenho, quanto isso rendeu, e como esta dividido. E acrescenta a
// que o app pode responder e eles nao: quanto do aporte deste mes ja saiu, em
// cima da meta que a propria pessoa escolheu.
//
// Nao existe cotacao aqui. O saldo e o que a pessoa le no extrato e digita —
// por isso o card mostra ha quanto tempo aquele numero foi atualizado, em vez
// de fingir que e de agora.

import { memo, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { InvestimentoItem, Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import {
  TIPOS_INVESTIMENTO,
  alocacaoPorTipo,
  idadeDoSaldo,
  rendimentoDe,
  rendimentoPercentualDe,
  resumirCarteira,
  totalAportado,
} from '../../src/utils/investimentos'
import Icon from '../common/Icon'
import CaixaDestacavel from '../common/motion/CaixaDestacavel'
import PressableScale from '../common/motion/PressableScale'

type Props = {
  theme: Tema
  itens: InvestimentoItem[]
  /** Quanto ja foi aportado na competencia aberta. */
  aportadoNoMes: number
  /** O alvo do mes, vindo da porcentagem das configuracoes. */
  metaDoMes: number
  /** Nome do mes aberto, so para o rotulo. */
  nomeDoMes: string
  highlightedItemId: string | null
  formatarValorVisivel: (valor: number) => string
  registrarItem: (id: string) => (node: View | null) => void
  onNovo: () => void
  onEditar: (item: InvestimentoItem) => void
  onAportar: (item: InvestimentoItem) => void
  onEditarMeta: () => void
}

/** "+4,2%" / "-1,8%" / "—" quando ainda nao da para calcular. */
function comoPercentual(valor: number | null) {
  if (valor === null) return '—'
  const sinal = valor > 0 ? '+' : ''
  return `${sinal}${valor.toFixed(1).replace('.', ',')}%`
}

function InvestimentosCard({
  theme,
  itens,
  aportadoNoMes,
  metaDoMes,
  nomeDoMes,
  highlightedItemId,
  formatarValorVisivel,
  registrarItem,
  onNovo,
  onEditar,
  onAportar,
  onEditarMeta,
}: Props) {
  const resumo = useMemo(() => resumirCarteira(itens), [itens])
  const fatias = useMemo(() => alocacaoPorTipo(itens), [itens])

  // Do maior para o menor: a carteira se le de cima para baixo por tamanho.
  const ordenados = useMemo(
    () => [...itens].sort((a, b) => (Number(b.valorAtual) || 0) - (Number(a.valorAtual) || 0)),
    [itens]
  )

  const empatado = resumo.rendimento === 0
  const noLucro = resumo.rendimento > 0
  const corDoResultado = empatado ? theme.muted : noLucro ? theme.green : theme.red

  const progressoDoAporte = metaDoMes > 0 ? Math.min(aportadoNoMes / metaDoMes, 1) : 0
  const bateuAMeta = metaDoMes > 0 && aportadoNoMes >= metaDoMes

  /** A data mais antiga entre os saldos: e ela que diz se o total esta velho. */
  const saldoMaisVelho = useMemo(() => {
    const datas = itens.map((item) => item.atualizadoEm).filter(Boolean).sort()
    return datas[0] || ''
  }, [itens])

  return (
    <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.manageHeaderRow}>
        <View style={local.tituloWrap}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>Investimentos</Text>
          <Text style={[styles.manageSub, { color: theme.muted }]}>
            {itens.length === 0
              ? 'Nada na carteira'
              : `${itens.length} ${itens.length === 1 ? 'ativo' : 'ativos'}${
                  saldoMaisVelho ? ` · saldo de ${idadeDoSaldo(saldoMaisVelho)}` : ''
                }`}
          </Text>
        </View>
        <PressableScale
          onPress={onNovo}
          accessibilityRole="button"
          accessibilityLabel="Novo investimento"
          style={[styles.smallActionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
        >
          <Icon name="adicionar" size={18} color={theme.textInverse} />
        </PressableScale>
      </View>

      {itens.length === 0 ? (
        <PressableScale
          onPress={onNovo}
          accessibilityRole="button"
          style={[local.vazio, { borderColor: theme.borderStrong, backgroundColor: theme.cardSoft }]}
        >
          <Icon name="investir" size={22} color={theme.muted} />
          <Text style={[local.vazioTexto, { color: theme.muted }]}>
            Cadastre o que você já tem aplicado e veja o patrimônio, o rendimento e a divisão da
            carteira num lugar só
          </Text>
        </PressableScale>
      ) : (
        <>
          {/* O numero grande. Patrimonio primeiro, rendimento logo abaixo:
              e nessa ordem que a pergunta se faz. */}
          <View style={[local.destaque, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
            <Text style={[local.destaqueRotulo, { color: theme.muted }]}>Patrimônio</Text>
            <Text style={[local.destaqueValor, { color: theme.text }]} numberOfLines={1}>
              {formatarValorVisivel(resumo.patrimonio)}
            </Text>

            <View style={local.destaqueLinha}>
              <View
                style={[
                  local.selo,
                  {
                    backgroundColor: empatado
                      ? theme.backgroundSoft
                      : noLucro
                        ? theme.greenSoft
                        : theme.redSoft,
                  },
                ]}
              >
                {empatado ? null : (
                  <Icon name={noLucro ? 'seta_cima' : 'seta_baixo'} size={11} color={corDoResultado} />
                )}
                <Text style={[local.seloTexto, { color: corDoResultado }]}>
                  {comoPercentual(resumo.rendimentoPercentual)}
                </Text>
              </View>
              <Text style={[local.destaqueApoio, { color: theme.muted }]} numberOfLines={1}>
                {formatarValorVisivel(resumo.rendimento)} sobre {formatarValorVisivel(resumo.aportado)}{' '}
                aplicados
              </Text>
            </View>
          </View>

          {/* O aporte do mes. A porcentagem das configuracoes finalmente vira
              um alvo visivel, em vez de um numero guardado. */}
          {metaDoMes > 0 ? (
            <View style={local.bloco}>
              <View style={local.blocoTopo}>
                <Text style={[local.blocoRotulo, { color: theme.muted }]}>
                  Aporte de {nomeDoMes.toLowerCase()}
                </Text>
                <PressableScale
                  onPress={onEditarMeta}
                  scaleTo={0.96}
                  accessibilityRole="button"
                  accessibilityLabel="Mudar a meta de aporte"
                  style={local.metaToque}
                >
                  <Text style={[local.blocoValor, { color: bateuAMeta ? theme.green : theme.text }]}>
                    {formatarValorVisivel(aportadoNoMes)}
                    <Text style={[local.blocoMeta, { color: theme.faint }]}>
                      {' '}
                      de {formatarValorVisivel(metaDoMes)}
                    </Text>
                  </Text>
                  <Icon name="editar" size={11} color={theme.faint} />
                </PressableScale>
              </View>

              <View style={[local.trilho, { backgroundColor: theme.backgroundSoft }]}>
                <View
                  style={[
                    local.trilhoCheio,
                    {
                      width: `${Math.round(progressoDoAporte * 100)}%`,
                      backgroundColor: bateuAMeta ? theme.green : theme.accent,
                    },
                  ]}
                />
              </View>

              <Text style={[local.blocoNota, { color: theme.faint }]}>
                {bateuAMeta
                  ? 'Meta do mês batida.'
                  : `Faltam ${formatarValorVisivel(metaDoMes - aportadoNoMes)} para a meta.`}
              </Text>
            </View>
          ) : (
            <PressableScale
              onPress={onEditarMeta}
              scaleTo={0.98}
              accessibilityRole="button"
              style={[local.semMeta, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}
            >
              <Icon name="alvo" size={15} color={theme.muted} />
              <Text style={[local.semMetaTexto, { color: theme.muted }]}>
                Defina uma meta de aporte por mês
              </Text>
            </PressableScale>
          )}

          {/* A divisao da carteira. Uma barra so, porque a pergunta e "estou
              concentrado demais em alguma coisa?" — e uma barra responde. */}
          {fatias.length > 0 ? (
            <View style={local.bloco}>
              <Text style={[local.blocoRotulo, { color: theme.muted }]}>Alocação</Text>

              <View style={[local.barra, { backgroundColor: theme.backgroundSoft }]}>
                {fatias.map((fatia) => (
                  <View
                    key={fatia.tipo}
                    style={{ width: `${fatia.fatia}%`, backgroundColor: fatia.cor }}
                  />
                ))}
              </View>

              <View style={local.legenda}>
                {fatias.map((fatia) => (
                  <View key={fatia.tipo} style={local.legendaItem}>
                    <View style={[local.legendaPonto, { backgroundColor: fatia.cor }]} />
                    <Text style={[local.legendaTexto, { color: theme.muted }]} numberOfLines={1}>
                      {fatia.rotulo} {Math.round(fatia.fatia)}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={local.lista}>
            {ordenados.map((item) => {
              const aplicado = totalAportado(item)
              const ganho = rendimentoDe(item)
              const percentual = rendimentoPercentualDe(item)
              const estilo = TIPOS_INVESTIMENTO[item.tipo]
              const peso =
                resumo.patrimonio > 0 ? ((Number(item.valorAtual) || 0) / resumo.patrimonio) * 100 : 0
              const corGanho = ganho === 0 ? theme.muted : ganho > 0 ? theme.green : theme.red

              return (
                <CaixaDestacavel
                  key={item.id}
                  ref={registrarItem(item.id)}
                  theme={theme}
                  destacado={highlightedItemId === item.id}
                  corBorda={theme.border}
                  collapsable={false}
                  style={[local.item, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
                >
                  {/* A faixa da classe: da para varrer a lista e ver a divisao
                      da carteira sem ler a legenda. */}
                  <View style={[local.itemFaixa, { backgroundColor: estilo.cor }]} pointerEvents="none" />

                  <PressableScale
                    onPress={() => onEditar(item)}
                    scaleTo={0.98}
                    accessibilityRole="button"
                    accessibilityLabel={`${item.nome}, ${estilo.rotulo}`}
                    style={local.itemToque}
                  >
                    <View style={local.itemTopo}>
                      <View style={local.itemTextos}>
                        <Text style={[local.itemNome, { color: theme.text }]} numberOfLines={1}>
                          {item.nome}
                        </Text>
                        <Text style={[local.itemMeta, { color: theme.muted }]} numberOfLines={1}>
                          {item.instituicao ? `${item.instituicao} · ` : ''}
                          {estilo.rotulo}
                        </Text>
                      </View>

                      <View style={local.itemNumeros}>
                        <Text style={[local.itemValor, { color: theme.text }]} numberOfLines={1}>
                          {formatarValorVisivel(item.valorAtual)}
                        </Text>
                        <Text style={[local.itemGanho, { color: corGanho }]} numberOfLines={1}>
                          {aplicado > 0 ? comoPercentual(percentual) : 'sem aporte'}
                        </Text>
                      </View>
                    </View>

                    <View style={local.itemRodape}>
                      <View style={[local.itemTrilho, { backgroundColor: theme.background }]}>
                        <View
                          style={[local.itemTrilhoCheio, { width: `${peso}%`, backgroundColor: estilo.cor }]}
                        />
                      </View>
                      <Text style={[local.itemPeso, { color: theme.faint }]}>
                        {Math.round(peso)}% da carteira
                      </Text>
                    </View>
                  </PressableScale>

                  <PressableScale
                    onPress={() => onAportar(item)}
                    scaleTo={0.9}
                    accessibilityRole="button"
                    accessibilityLabel={`Aportar em ${item.nome}`}
                    style={[local.itemAportar, { backgroundColor: theme.card, borderColor: theme.border }]}
                  >
                    <Icon name="adicionar" size={15} color={theme.primary} />
                    <Text style={[local.itemAportarTexto, { color: theme.primary }]}>Aportar</Text>
                  </PressableScale>
                </CaixaDestacavel>
              )
            })}
          </View>
        </>
      )}
    </View>
  )
}

const local = StyleSheet.create({
  tituloWrap: { flex: 1, minWidth: 0 },

  vazio: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 22,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  vazioTexto: { fontSize: 12.5, fontWeight: '600', textAlign: 'center', lineHeight: 18 },

  destaque: { borderRadius: 18, borderWidth: 1, paddingVertical: 14, paddingHorizontal: 14 },
  destaqueRotulo: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  destaqueValor: { fontSize: 26, fontWeight: '900', letterSpacing: -0.9, marginTop: 4 },
  destaqueLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  seloTexto: { fontSize: 11.5, fontWeight: '900' },
  destaqueApoio: { flex: 1, minWidth: 0, fontSize: 11, fontWeight: '600' },

  bloco: { marginTop: 14 },
  blocoTopo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 7,
  },
  blocoRotulo: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  blocoValor: { fontSize: 13.5, fontWeight: '900', letterSpacing: -0.3 },
  blocoMeta: { fontSize: 11.5, fontWeight: '700' },
  blocoNota: { fontSize: 10.5, fontWeight: '600', marginTop: 6 },
  metaToque: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  semMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  semMetaTexto: { fontSize: 12, fontWeight: '700' },

  trilho: { height: 8, borderRadius: 999, overflow: 'hidden' },
  trilhoCheio: { height: 8, borderRadius: 999 },

  barra: { flexDirection: 'row', height: 10, borderRadius: 999, overflow: 'hidden', marginTop: 2 },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 9 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendaPonto: { width: 8, height: 8, borderRadius: 999 },
  legendaTexto: { fontSize: 10.5, fontWeight: '700' },

  lista: { gap: 8, marginTop: 14 },
  item: { position: 'relative', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  itemFaixa: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  itemToque: { paddingVertical: 11, paddingLeft: 14, paddingRight: 12 },
  itemTopo: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemTextos: { flex: 1, minWidth: 0 },
  itemNome: { fontSize: 13.5, fontWeight: '800', letterSpacing: -0.2 },
  itemMeta: { fontSize: 10.5, fontWeight: '600', marginTop: 2 },
  itemNumeros: { alignItems: 'flex-end', flexShrink: 0 },
  itemValor: { fontSize: 13.5, fontWeight: '900', letterSpacing: -0.3 },
  itemGanho: { fontSize: 10.5, fontWeight: '800', marginTop: 2 },

  itemRodape: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  itemTrilho: { flex: 1, minWidth: 0, height: 5, borderRadius: 999, overflow: 'hidden' },
  itemTrilhoCheio: { height: 5, borderRadius: 999 },
  itemPeso: { fontSize: 9.5, fontWeight: '700', flexShrink: 0 },

  itemAportar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 12,
    marginBottom: 11,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemAportarTexto: { fontSize: 12, fontWeight: '800' },
})

export default memo(InvestimentosCard)
