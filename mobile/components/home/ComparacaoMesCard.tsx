// Este mes contra o anterior.
//
// Ate agora cada competencia era uma ilha: o app mostrava agosto sem nunca
// dizer como agosto estava em relacao a julho. O dado sempre esteve gravado,
// so ninguem fazia a subtracao — e essa e a pergunta que a pessoa faz sozinha
// toda vez que abre o mes.
//
// Duas barras por linha, uma para cada mes, medidas contra a maior das duas:
// a diferenca ocupa a largura inteira, que e o que se quer enxergar. Embaixo,
// as categorias que mais mexeram, com a barra saindo do centro — para a
// esquerda quando gastou menos, para a direita quando gastou mais.

import { memo, useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import { type ResumoMes, compararMeses, proporcao } from '../../src/utils/comparacaoMeses'
import Icon from '../common/Icon'

type Props = {
  theme: Tema
  atual: ResumoMes
  anterior: ResumoMes
  /** "Agosto", "Julho" — so para os rotulos. */
  nomeAtual: string
  nomeAnterior: string
  formatarValorVisivel: (valor: number) => string
}

/** "+12,4%" / "-3,0%" / "" quando nao ha base para calcular. */
function comoPercentual(valor: number | null) {
  if (valor === null) return ''
  const sinal = valor > 0 ? '+' : ''
  return `${sinal}${valor.toFixed(1).replace('.', ',')}%`
}

function ComparacaoMesCard({
  theme,
  atual,
  anterior,
  nomeAtual,
  nomeAnterior,
  formatarValorVisivel,
}: Props) {
  const comparacao = useMemo(() => compararMeses(atual, anterior), [atual, anterior])

  if (comparacao.vazio) return null

  const curto = (nome: string) => nome.slice(0, 3).toLowerCase()

  /**
   * Uma linha do grafico: o rotulo, as duas barras e a diferenca.
   *
   * `subirEhBom` inverte a cor: entrar mais dinheiro e bom, sair mais nao e.
   */
  const linha = (
    rotulo: string,
    dados: { atual: number; anterior: number; variacao: number; percentual: number | null },
    subirEhBom: boolean,
    apoio?: string
  ) => {
    const maior = Math.max(Math.abs(dados.atual), Math.abs(dados.anterior))
    const parado = dados.variacao === 0
    const bom = parado ? false : dados.variacao > 0 === subirEhBom
    const cor = parado ? theme.muted : bom ? theme.green : theme.red

    return (
      <View style={local.grupo} key={rotulo}>
        <View style={local.grupoTopo}>
          <Text style={[local.grupoRotulo, { color: theme.muted }]}>
            {rotulo}
            {apoio ? <Text style={[local.grupoApoio, { color: theme.faint }]}> {apoio}</Text> : null}
          </Text>

          <View style={local.grupoVariacao}>
            {parado ? null : (
              <Icon name={dados.variacao > 0 ? 'seta_cima' : 'seta_baixo'} size={11} color={cor} />
            )}
            <Text style={[local.grupoVariacaoTexto, { color: cor }]} numberOfLines={1}>
              {parado
                ? 'igual'
                : `${dados.variacao > 0 ? '+' : '-'}${formatarValorVisivel(Math.abs(dados.variacao))}`}
            </Text>
          </View>
        </View>

        {/* O mes anterior em cinza, o atual em cor: a ordem de leitura e de
            onde se veio para onde se esta. */}
        {[
          { nome: nomeAnterior, valor: dados.anterior, atual: false },
          { nome: nomeAtual, valor: dados.atual, atual: true },
        ].map((barra) => (
          <View style={local.barraLinha} key={barra.nome}>
            <Text style={[local.barraMes, { color: theme.faint }]}>{curto(barra.nome)}</Text>
            <View style={[local.trilho, { backgroundColor: theme.backgroundSoft }]}>
              <View
                style={[
                  local.trilhoCheio,
                  {
                    width: `${proporcao(barra.valor, maior) * 100}%`,
                    backgroundColor: barra.atual
                      ? barra.valor < 0
                        ? theme.red
                        : theme.primary
                      : theme.border,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                local.barraValor,
                { color: barra.atual ? theme.text : theme.muted },
                barra.valor < 0 && { color: theme.red },
              ]}
              numberOfLines={1}
            >
              {formatarValorVisivel(barra.valor)}
            </Text>
          </View>
        ))}

        {dados.percentual === null ? null : (
          <Text style={[local.grupoNota, { color: theme.faint }]}>
            {comoPercentual(dados.percentual)} em relação a {nomeAnterior.toLowerCase()}
          </Text>
        )}
      </View>
    )
  }

  const maiorMudanca = comparacao.mudancas.reduce(
    (maior, item) => Math.max(maior, Math.abs(item.variacao)),
    0
  )

  return (
    <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.manageHeaderRow}>
        <View style={local.tituloWrap}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>
            {nomeAtual} contra {nomeAnterior.toLowerCase()}
          </Text>
          <Text style={[styles.manageSub, { color: theme.muted }]}>
            O mesmo mês do lado do anterior, para ver o que mudou.
          </Text>
        </View>
      </View>

      {linha('Entrou', comparacao.entrou, true)}
      {linha('Saiu', comparacao.saiu, false, '· variáveis, fixos e cartões')}
      {linha('Sobrou', comparacao.sobrou, true)}

      {comparacao.mudancas.length > 0 ? (
        <View style={local.mudancas}>
          <Text style={[local.grupoRotulo, { color: theme.muted }]}>O que mais mudou</Text>

          {comparacao.mudancas.map((item) => {
            const gastouMais = item.variacao > 0
            const cor = gastouMais ? theme.red : theme.green
            const largura = proporcao(item.variacao, maiorMudanca) * 50

            return (
              <View key={item.categoria} style={local.mudanca}>
                <Text style={[local.mudancaNome, { color: theme.text }]} numberOfLines={1}>
                  {item.categoria}
                </Text>

                {/* A barra sai do meio: esquerda quando economizou, direita
                    quando gastou mais. O lado ja diz o sinal antes de ler. */}
                <View style={local.divergente}>
                  <View style={[local.divergenteMeio, { backgroundColor: theme.border }]} />
                  <View
                    style={[
                      local.divergenteBarra,
                      gastouMais
                        ? { left: '50%', width: `${largura}%` }
                        : { right: '50%', width: `${largura}%` },
                      { backgroundColor: cor },
                    ]}
                  />
                </View>

                <Text style={[local.mudancaValor, { color: cor }]} numberOfLines={1}>
                  {gastouMais ? '+' : '-'}
                  {formatarValorVisivel(Math.abs(item.variacao))}
                </Text>
              </View>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

const local = StyleSheet.create({
  tituloWrap: { flex: 1, minWidth: 0 },

  grupo: { marginTop: 14 },
  grupoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 7,
  },
  grupoRotulo: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  grupoApoio: { fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  grupoVariacao: { flexDirection: 'row', alignItems: 'center', gap: 3, flexShrink: 0 },
  grupoVariacaoTexto: { fontSize: 12, fontWeight: '900' },
  grupoNota: { fontSize: 10, fontWeight: '600', marginTop: 5 },

  barraLinha: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  barraMes: { width: 22, flexShrink: 0, fontSize: 9.5, fontWeight: '800' },
  trilho: { flex: 1, minWidth: 0, height: 10, borderRadius: 999, overflow: 'hidden' },
  trilhoCheio: { height: 10, borderRadius: 999 },
  barraValor: { width: 86, flexShrink: 0, textAlign: 'right', fontSize: 11.5, fontWeight: '800' },

  mudancas: { marginTop: 18 },
  mudanca: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  mudancaNome: { width: 78, flexShrink: 0, fontSize: 11.5, fontWeight: '700' },
  divergente: { flex: 1, minWidth: 0, height: 12, justifyContent: 'center' },
  divergenteMeio: { position: 'absolute', left: '50%', width: 1, top: 0, bottom: 0 },
  divergenteBarra: { position: 'absolute', height: 8, borderRadius: 3 },
  mudancaValor: { width: 78, flexShrink: 0, textAlign: 'right', fontSize: 11.5, fontWeight: '800' },
})

export default memo(ComparacaoMesCard)
