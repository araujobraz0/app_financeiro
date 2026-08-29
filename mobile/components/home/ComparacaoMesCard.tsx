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

import { memo, useMemo, useState } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import Svg, { Circle, Line, Path } from 'react-native-svg'

import type { Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import {
  type PontoDoMes,
  compararMeses,
  escalaDaSerie,
  proporcao,
} from '../../src/utils/comparacaoMeses'

type Props = {
  theme: Tema
  /** Do mes mais antigo ao mais recente. O ultimo e a competencia aberta. */
  serie: PontoDoMes[]
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

const ALTURA = 132
const MARGEM_TOPO = 10
const MARGEM_BAIXO = 22
// Os pontos das pontas ficam em cima da borda do desenho: sem essa folga o
// circulo do mes aberto sai cortado ao meio.
const MARGEM_LADO = 5

function ComparacaoMesCard({ theme, serie, nomeAtual, nomeAnterior, formatarValorVisivel }: Props) {
  // A largura vem da medida real: o card muda de tamanho com a tela, e um SVG
  // de largura fixa sobraria de um lado ou cortaria do outro.
  const [largura, setLargura] = useState(0)
  const medir = (evento: LayoutChangeEvent) => setLargura(evento.nativeEvent.layout.width)

  const atual = serie[serie.length - 1]
  const anterior = serie[serie.length - 2]

  const comparacao = useMemo(
    () =>
      compararMeses(
        atual || { entrou: 0, saiu: 0, sobrou: 0, porCategoria: {} },
        anterior || { entrou: 0, saiu: 0, sobrou: 0, porCategoria: {} }
      ),
    [atual, anterior]
  )

  const escala = useMemo(() => escalaDaSerie(serie), [serie])

  if (comparacao.vazio) return null

  const linhas = [
    { chave: 'entrou' as const, rotulo: 'Entrou', cor: theme.green, dados: comparacao.entrou, subirEhBom: true },
    { chave: 'saiu' as const, rotulo: 'Saiu', cor: theme.red, dados: comparacao.saiu, subirEhBom: false },
    { chave: 'sobrou' as const, rotulo: 'Sobrou', cor: theme.accent, dados: comparacao.sobrou, subirEhBom: true },
  ]

  /** Onde cada ponto cai dentro do desenho. */
  const posicao = (indice: number, valor: number) => {
    const larguraUtil = Math.max(0, largura - MARGEM_LADO * 2)
    const passo = serie.length > 1 ? larguraUtil / (serie.length - 1) : 0
    const alturaUtil = ALTURA - MARGEM_TOPO - MARGEM_BAIXO
    return {
      x: MARGEM_LADO + indice * passo,
      y: MARGEM_TOPO + alturaUtil * (1 - (valor - escala.menor) / escala.amplitude),
    }
  }

  const caminho = (chave: 'entrou' | 'saiu' | 'sobrou') =>
    serie
      .map((ponto, indice) => {
        const { x, y } = posicao(indice, ponto[chave])
        return `${indice === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(' ')

  const yDoZero = posicao(0, 0).y

  return (
    <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.manageHeaderRow}>
        <View style={local.tituloWrap}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>
            {nomeAtual} contra {nomeAnterior.toLowerCase()}
          </Text>
          <Text style={[styles.manageSub, { color: theme.muted }]}>
            Os últimos {serie.length} meses, para ver de onde o mês veio.
          </Text>
        </View>
      </View>

      {/* Um desenho so para as tres linhas: o que interessa e o espaco entre
          elas — a distancia de "entrou" para "saiu" e a sobra. Em graficos
          separados essa distancia sumiria. */}
      <View style={local.grafico} onLayout={medir}>
        {largura > 0 ? (
          <Svg width={largura} height={ALTURA}>
            {/* A linha do zero so aparece quando alguma sobra ficou negativa;
                sem negativo ela seria o proprio fundo do desenho. */}
            {escala.menor < 0 ? (
              <Line
                x1={MARGEM_LADO}
                y1={yDoZero}
                x2={largura - MARGEM_LADO}
                y2={yDoZero}
                stroke={theme.border}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            ) : null}

            {linhas.map((linha) => (
              <Path
                key={linha.chave}
                d={caminho(linha.chave)}
                stroke={linha.cor}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}

            {/* O mes aberto ganha um ponto cheio; os outros, um vazado. */}
            {linhas.map((linha) =>
              serie.map((ponto, indice) => {
                const { x, y } = posicao(indice, ponto[linha.chave])
                const ehOUltimo = indice === serie.length - 1
                return (
                  <Circle
                    key={`${linha.chave}-${ponto.chave}`}
                    cx={x}
                    cy={y}
                    r={ehOUltimo ? 4 : 2.6}
                    fill={ehOUltimo ? linha.cor : theme.card}
                    stroke={linha.cor}
                    strokeWidth={1.8}
                  />
                )
              })
            )}
          </Svg>
        ) : null}

        <View style={local.eixo}>
          {serie.map((ponto, indice) => (
            <Text
              key={ponto.chave}
              style={[
                local.eixoTexto,
                { color: indice === serie.length - 1 ? theme.text : theme.faint },
              ]}
            >
              {ponto.rotulo}
            </Text>
          ))}
        </View>
      </View>

      {/* A legenda faz as vezes de tabela: cor, nome, valor de agora e o quanto
          mudou desde o mes passado. */}
      <View style={local.legenda}>
        {linhas.map((linha) => {
          const parado = linha.dados.variacao === 0
          const bom = parado ? false : linha.dados.variacao > 0 === linha.subirEhBom
          const corVariacao = parado ? theme.muted : bom ? theme.green : theme.red

          return (
            <View key={linha.chave} style={local.legendaLinha}>
              <View style={[local.legendaPonto, { backgroundColor: linha.cor }]} />
              <Text style={[local.legendaNome, { color: theme.muted }]}>{linha.rotulo}</Text>
              <Text style={[local.legendaValor, { color: theme.text }]} numberOfLines={1}>
                {formatarValorVisivel(linha.dados.atual)}
              </Text>
              <Text style={[local.legendaVariacao, { color: corVariacao }]} numberOfLines={1}>
                {parado
                  ? 'igual'
                  : linha.dados.percentual === null
                    ? `${linha.dados.variacao > 0 ? '+' : '-'}${formatarValorVisivel(Math.abs(linha.dados.variacao))}`
                    : comoPercentual(linha.dados.percentual)}
              </Text>
            </View>
          )
        })}
      </View>

      {comparacao.mudancas.length > 0 ? (
        <View style={local.mudancas}>
          <Text style={[local.blocoRotulo, { color: theme.muted }]}>
            O que mais mudou desde {nomeAnterior.toLowerCase()}
          </Text>

          {comparacao.mudancas.map((item) => {
            const maiorMudanca = comparacao.mudancas.reduce(
              (maior, atual2) => Math.max(maior, Math.abs(atual2.variacao)),
              0
            )
            const gastouMais = item.variacao > 0
            const cor = gastouMais ? theme.red : theme.green
            const comprimento = proporcao(item.variacao, maiorMudanca) * 50

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
                        ? { left: '50%', width: `${comprimento}%` }
                        : { right: '50%', width: `${comprimento}%` },
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

  grafico: { marginTop: 6 },
  eixo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -14 },
  eixoTexto: { fontSize: 9.5, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },

  legenda: { marginTop: 14, gap: 8 },
  legendaLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendaPonto: { width: 9, height: 9, borderRadius: 999, flexShrink: 0 },
  legendaNome: {
    width: 52,
    flexShrink: 0,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  legendaValor: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '900', letterSpacing: -0.3 },
  legendaVariacao: { width: 74, flexShrink: 0, textAlign: 'right', fontSize: 11.5, fontWeight: '800' },

  blocoRotulo: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  mudancas: { marginTop: 18 },
  mudanca: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  mudancaNome: { width: 78, flexShrink: 0, fontSize: 11.5, fontWeight: '700' },
  divergente: { flex: 1, minWidth: 0, height: 12, justifyContent: 'center' },
  divergenteMeio: { position: 'absolute', left: '50%', width: 1, top: 0, bottom: 0 },
  divergenteBarra: { position: 'absolute', height: 8, borderRadius: 3 },
  mudancaValor: { width: 78, flexShrink: 0, textAlign: 'right', fontSize: 11.5, fontWeight: '800' },
})

export default memo(ComparacaoMesCard)
