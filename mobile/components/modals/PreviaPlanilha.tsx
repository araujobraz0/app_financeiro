// Previa da planilha antes de exportar.
//
// A versao anterior listava os nomes das abas com uma frase generica cada —
// nao dava para conferir nada. Aqui aparecem as abas de verdade, com contagem
// de linhas e as primeiras linhas em formato de tabela, para o usuario ver o
// que vai sair antes de baixar.

import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import { formatarMoeda } from '../../src/utils/currency'
import type { ExportData } from '../../src/utils/export/types'
import PressableScale from '../common/motion/PressableScale'

type Aba = {
  nome: string
  colunas: string[]
  linhas: (string | number)[][]
  /** Indice da coluna que deve sair como dinheiro. */
  colunaMoeda?: number
}

const LINHAS_VISIVEIS = 6

function montarAbas(dados: ExportData): Aba[] {
  return [
    {
      nome: 'Resumo',
      colunas: ['Indicador', 'Valor'],
      colunaMoeda: 1,
      linhas: [
        ['Salário', dados.resumo.salario],
        ['Entradas', dados.resumo.entradas],
        ['Fixos pagos', dados.resumo.fixosPagos],
        ['Fixos não pagos', dados.resumo.fixosNaoPagos],
        ['Saídas', dados.resumo.saidas],
        ['Cartões', dados.resumo.cartoes],
        ['Saldo do mês', dados.resumo.saldoAtual],
      ],
    },
    {
      nome: 'Entradas',
      colunas: ['Descrição', 'Dia', 'Valor'],
      colunaMoeda: 2,
      linhas: dados.entradas.map((i) => [i.nome, i.dia ?? '', i.valor]),
    },
    {
      nome: 'Fixos',
      colunas: ['Descrição', 'Situação', 'Valor'],
      colunaMoeda: 2,
      linhas: dados.fixos.map((i) => [i.nome, i.pago ? 'Pago' : 'Em aberto', i.valor]),
    },
    {
      nome: 'Saídas',
      colunas: ['Descrição', 'Categoria', 'Valor'],
      colunaMoeda: 2,
      linhas: dados.saidas.map((i) => [i.nome, i.categoria || '—', i.valor]),
    },
    {
      nome: 'Categorias',
      colunas: ['Categoria', '%', 'Valor'],
      colunaMoeda: 2,
      linhas: dados.categorias.map((i) => [i.categoria, `${i.percentual.toFixed(1)}%`, i.valor]),
    },
    {
      nome: 'Cartões',
      colunas: ['Descrição', 'Parcela', 'Valor'],
      colunaMoeda: 2,
      linhas: dados.parcelas.map((i) => [
        i.descricao,
        `${i.parcelaAtual}/${i.totalParcelas}`,
        i.valorParcela,
      ]),
    },
  ]
}

export default function PreviaPlanilha({ theme, dados }: { theme: Tema; dados: ExportData }) {
  const abas = montarAbas(dados)
  const [ativa, setAtiva] = useState(0)
  const aba = abas[ativa]
  const visiveis = aba.linhas.slice(0, LINHAS_VISIVEIS)
  const restantes = aba.linhas.length - visiveis.length

  return (
    <View>
      {/* Abas da planilha */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.abas}>
        {abas.map((item, indice) => {
          const selecionada = indice === ativa
          return (
            <PressableScale
              key={item.nome}
              onPress={() => setAtiva(indice)}
              scaleTo={0.95}
              style={[
                styles.aba,
                {
                  backgroundColor: selecionada ? theme.primary : theme.cardSoft,
                  borderColor: selecionada ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[styles.abaTexto, { color: selecionada ? theme.textInverse : theme.muted }]}
              >
                {item.nome}
              </Text>
              <View
                style={[
                  styles.contador,
                  { backgroundColor: selecionada ? 'rgba(255,255,255,0.22)' : theme.background },
                ]}
              >
                <Text
                  style={[styles.contadorTexto, { color: selecionada ? theme.textInverse : theme.faint }]}
                >
                  {item.linhas.length}
                </Text>
              </View>
            </PressableScale>
          )
        })}
      </ScrollView>

      {/* Tabela */}
      <View style={[styles.tabela, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.cabecalho, { backgroundColor: theme.primary }]}>
          {aba.colunas.map((coluna, i) => (
            <Text
              key={coluna}
              style={[
                styles.cabecalhoTexto,
                { color: theme.textInverse },
                i === 0 ? styles.colunaLarga : styles.colunaEstreita,
                i === aba.colunas.length - 1 && styles.alinhaDireita,
              ]}
              numberOfLines={1}
            >
              {coluna}
            </Text>
          ))}
        </View>

        {visiveis.length === 0 ? (
          <Text style={[styles.vazio, { color: theme.faint }]}>Nada nesta aba neste mês.</Text>
        ) : (
          visiveis.map((linha, indiceLinha) => (
            <View
              key={indiceLinha}
              style={[
                styles.linha,
                {
                  backgroundColor: indiceLinha % 2 === 0 ? 'transparent' : theme.cardSoft,
                  borderTopColor: theme.border,
                },
              ]}
            >
              {linha.map((celula, i) => {
                const ehMoeda = i === aba.colunaMoeda && typeof celula === 'number'
                return (
                  <Text
                    key={i}
                    style={[
                      styles.celula,
                      { color: ehMoeda ? theme.text : theme.muted },
                      ehMoeda && styles.celulaValor,
                      i === 0 ? styles.colunaLarga : styles.colunaEstreita,
                      i === linha.length - 1 && styles.alinhaDireita,
                    ]}
                    numberOfLines={1}
                  >
                    {ehMoeda ? formatarMoeda(celula as number) : String(celula)}
                  </Text>
                )
              })}
            </View>
          ))
        )}

        {restantes > 0 ? (
          <Text style={[styles.restantes, { color: theme.faint, borderTopColor: theme.border }]}>
            + {restantes} {restantes === 1 ? 'linha' : 'linhas'} no arquivo
          </Text>
        ) : null}
      </View>

      <Text style={[styles.nota, { color: theme.faint }]}>
        Os valores vão como número, com formato de moeda — dá para somar e filtrar na planilha.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  abas: { gap: 7, paddingRight: 8, paddingBottom: 12 },
  aba: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  abaTexto: { fontSize: 12, fontWeight: '700' },
  contador: { minWidth: 20, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 999 },
  contadorTexto: { fontSize: 10, fontWeight: '800', textAlign: 'center' },

  tabela: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  cabecalho: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 11, gap: 8 },
  cabecalhoTexto: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  linha: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 11, gap: 8, borderTopWidth: 1 },
  celula: { fontSize: 11, fontWeight: '600' },
  celulaValor: { fontWeight: '800' },
  colunaLarga: { flex: 2, minWidth: 0 },
  colunaEstreita: { flex: 1, minWidth: 0 },
  alinhaDireita: { textAlign: 'right' },
  vazio: { fontSize: 12, fontWeight: '500', padding: 16, textAlign: 'center' },
  restantes: { fontSize: 11, fontWeight: '600', padding: 10, textAlign: 'center', borderTopWidth: 1 },

  nota: { fontSize: 11, fontWeight: '500', lineHeight: 16, marginTop: 12 },
})
