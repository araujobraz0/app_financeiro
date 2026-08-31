// A descricao das abas da exportacao.
//
// A previa da planilha montava a sua propria lista de abas, com as suas
// proprias colunas, escrita a mao num componente de tela. A planilha de
// verdade montava outra, no gerador. As duas ficaram diferentes — a previa
// mostrava colunas que o arquivo nao tinha — e nada avisava, porque nada
// ligava uma coisa a outra.
//
// Agora ha uma descricao so: o gerador do .xlsx e a previa leem daqui.

import { linhasDoMes, totaisDasLinhas } from './tabela'
import type { ExportData } from './types'

export type FormatoCelula = 'texto' | 'moeda' | 'data' | 'porcento' | 'numero'

export type ColunaExportada = {
  titulo: string
  /** Largura em caracteres, para a coluna do Excel. */
  largura: number
  formato?: FormatoCelula
  /**
   * A coluna que nomeia a linha na previa.
   *
   * Sem isto a previa mostrava a primeira coluna como titulo, e na aba de
   * lancamentos a primeira coluna e a competencia — sete linhas seguidas
   * dizendo "Agosto/2026" e escondendo a descricao. Quando nenhuma coluna
   * marca isto, vale a primeira mesmo.
   */
  principal?: boolean
}

export type CelulaExportada = string | number | Date | null

export type AbaExportada = {
  nome: string
  colunas: ColunaExportada[]
  linhas: CelulaExportada[][]
  /** Linha de total no pe da aba, quando faz sentido somar. */
  total?: CelulaExportada[]
  /** Frase mostrada na previa quando a aba nao tem linha nenhuma. */
  vazio: string
}

/** As abas que saem no arquivo, na ordem em que aparecem nele. */
export function abasDaExportacao(dados: ExportData): AbaExportada[] {
  const { resumo, categorias, parcelas } = dados

  const linhas = linhasDoMes(dados)
  const totais = totaisDasLinhas(linhas)
  const doTipo = (tipo: string) => linhas.filter((l) => l.tipo === tipo)

  return [
    {
      // A aba que responde qualquer pergunta sem juntar as outras na mao.
      nome: 'Lançamentos',
      colunas: [
        { titulo: 'Competência', largura: 16 },
        { titulo: 'Tipo', largura: 18 },
        { titulo: 'Descrição', largura: 38, principal: true },
        { titulo: 'Categoria', largura: 20 },
        { titulo: 'Situação', largura: 14 },
        { titulo: 'Data', largura: 13, formato: 'data' },
        { titulo: 'Valor', largura: 16, formato: 'moeda' },
      ],
      linhas: linhas.map((linha) => [
        linha.competencia,
        linha.tipo,
        linha.descricao,
        linha.categoria,
        linha.situacao,
        linha.data,
        linha.valor,
      ]),
      total: ['TOTAL', '', '', '', '', '', totais.resultado],
      vazio: 'Nenhum lançamento neste mês.',
    },
    {
      nome: 'Resumo',
      colunas: [
        { titulo: 'Indicador', largura: 26 },
        { titulo: 'Valor', largura: 18, formato: 'moeda' },
      ],
      linhas: [
        ['Salário', resumo.salario],
        ['Entradas', resumo.entradas],
        ['Fixos pagos', resumo.fixosPagos],
        ['Fixos não pagos', resumo.fixosNaoPagos],
        ['Saídas', resumo.saidas],
        ['Cartões', resumo.cartoes],
        ['Saldo do mês', resumo.saldoAtual],
      ],
      vazio: 'Sem números neste mês.',
    },
    {
      nome: 'Entradas',
      colunas: [
        { titulo: 'Descrição', largura: 38 },
        { titulo: 'Data', largura: 13, formato: 'data' },
        { titulo: 'Valor', largura: 16, formato: 'moeda' },
      ],
      linhas: doTipo('Entrada').map((l) => [l.descricao, l.data, Math.abs(l.valor)]),
      total: ['TOTAL', '', totais.entradas],
      vazio: 'Nenhuma entrada lançada neste mês.',
    },
    {
      nome: 'Fixos',
      colunas: [
        { titulo: 'Descrição', largura: 38 },
        { titulo: 'Situação', largura: 14 },
        { titulo: 'Data', largura: 13, formato: 'data' },
        { titulo: 'Valor', largura: 16, formato: 'moeda' },
      ],
      linhas: doTipo('Gasto fixo').map((l) => [l.descricao, l.situacao, l.data, Math.abs(l.valor)]),
      total: ['TOTAL', '', '', totais.fixos],
      vazio: 'Nenhum gasto fixo neste mês.',
    },
    {
      nome: 'Saídas',
      colunas: [
        { titulo: 'Descrição', largura: 38 },
        { titulo: 'Categoria', largura: 20 },
        { titulo: 'Data', largura: 13, formato: 'data' },
        { titulo: 'Valor', largura: 16, formato: 'moeda' },
      ],
      linhas: doTipo('Saída').map((l) => [l.descricao, l.categoria, l.data, Math.abs(l.valor)]),
      total: ['TOTAL', '', '', totais.saidas],
      vazio: 'Nenhuma saída lançada neste mês.',
    },
    {
      nome: 'Categorias',
      colunas: [
        { titulo: 'Categoria', largura: 24 },
        { titulo: 'Participação', largura: 16, formato: 'porcento' },
        { titulo: 'Valor', largura: 16, formato: 'moeda' },
      ],
      linhas: categorias.map((item) => [
        item.categoria,
        Number(item.percentual.toFixed(1)),
        item.valor,
      ]),
      total: ['TOTAL', 100, categorias.reduce((soma, item) => soma + item.valor, 0)],
      vazio: 'Nenhuma saída para separar em categorias.',
    },
    {
      nome: 'Cartões',
      colunas: [
        { titulo: 'Descrição', largura: 34 },
        { titulo: 'Cartão', largura: 20 },
        { titulo: 'Parcela', largura: 12 },
        { titulo: 'Valor da parcela', largura: 18, formato: 'moeda' },
      ],
      linhas: parcelas.map((item) => [
        item.descricao,
        item.cartao,
        `${item.parcelaAtual}/${item.totalParcelas}`,
        item.valorParcela,
      ]),
      total: ['TOTAL', '', '', totais.parcelas],
      vazio: 'Nenhuma parcela caindo neste mês.',
    },
  ]
}
