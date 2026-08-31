// Os lancamentos do mes numa tabela so.
//
// Cada exportacao montava a sua propria lista, e as tres discordavam: o CSV
// nao trazia o dia, o Excel nao trazia data de verdade e o PDF nao somava
// nada. Pior, o CSV gravava "R$ 1.234,56" como texto — abrir no Excel e tentar
// somar a coluna nao dava nada, que e exatamente para o que se exporta.
//
// Aqui as tres partem da mesma tabela: uma linha por lancamento, com data
// montada a partir da competencia, valor com sinal e numero de verdade.

import { meses } from '../dates'
import type { ExportData } from './types'

export type TipoLinha = 'Entrada' | 'Gasto fixo' | 'Saída' | 'Parcela de cartão'

export type LinhaExportada = {
  competencia: string
  tipo: TipoLinha
  descricao: string
  /** Categoria da saida, ou o nome do cartao na parcela. */
  categoria: string
  situacao: string
  dia: number | null
  /** A data completa, quando da para montar a partir da competencia. */
  data: Date | null
  /** Positivo entra, negativo sai. */
  valor: number
}

/** Quantos dias tem o mes, para nao inventar 31 de fevereiro. */
function ultimoDia(ano: number, mes: number) {
  return new Date(ano, mes, 0).getDate()
}

/**
 * A data do lancamento a partir da competencia mais o dia.
 *
 * Sem isto o Excel recebia so o numero do dia solto, que nao serve para
 * ordenar nem para agrupar por periodo.
 */
export function dataDoLancamento(mesNome: string, ano: number, dia?: number | null): Date | null {
  const indice = meses.indexOf(String(mesNome || ''))
  if (indice < 0 || !Number.isFinite(ano) || ano <= 0) return null

  const diaSeguro = Math.min(
    ultimoDia(ano, indice + 1),
    Math.max(1, Number(dia || 1))
  )
  return new Date(ano, indice, diaSeguro)
}

/** Uma linha por lancamento do mes, na ordem em que aparecem no app. */
export function linhasDoMes(dados: ExportData): LinhaExportada[] {
  const { resumo } = dados
  const competencia = resumo.competencia
  const data = (dia?: number | null) => dataDoLancamento(resumo.mesNome, resumo.ano, dia)

  const linhas: LinhaExportada[] = []

  dados.entradas.forEach((item) => {
    linhas.push({
      competencia,
      tipo: 'Entrada',
      descricao: item.nome,
      categoria: '',
      situacao: '',
      dia: item.dia ?? null,
      data: data(item.dia),
      valor: Math.abs(item.valor),
    })
  })

  dados.fixos.forEach((item) => {
    linhas.push({
      competencia,
      tipo: 'Gasto fixo',
      descricao: item.nome,
      categoria: '',
      situacao: item.pago ? 'Pago' : 'Em aberto',
      dia: item.dia ?? null,
      data: data(item.dia),
      valor: -Math.abs(item.valor),
    })
  })

  dados.saidas.forEach((item) => {
    linhas.push({
      competencia,
      tipo: 'Saída',
      descricao: item.nome,
      categoria: item.categoria || '',
      situacao: '',
      dia: item.dia ?? null,
      data: data(item.dia),
      valor: -Math.abs(item.valor),
    })
  })

  dados.parcelas.forEach((item) => {
    linhas.push({
      competencia,
      tipo: 'Parcela de cartão',
      descricao: item.descricao,
      categoria: item.cartao,
      situacao: `${item.parcelaAtual}/${item.totalParcelas}`,
      dia: null,
      data: null,
      valor: -Math.abs(item.valorParcela),
    })
  })

  return linhas
}

export type TotaisExportados = {
  entradas: number
  saidas: number
  fixos: number
  parcelas: number
  /** Entradas menos tudo que sai. */
  resultado: number
  lancamentos: number
}

/** As somas conferidas a partir das proprias linhas, nao de outro caminho. */
export function totaisDasLinhas(linhas: LinhaExportada[]): TotaisExportados {
  const somar = (tipo: TipoLinha) =>
    linhas.filter((l) => l.tipo === tipo).reduce((total, l) => total + Math.abs(l.valor), 0)

  const entradas = somar('Entrada')
  const saidas = somar('Saída')
  const fixos = somar('Gasto fixo')
  const parcelas = somar('Parcela de cartão')

  return {
    entradas,
    saidas,
    fixos,
    parcelas,
    resultado: entradas - saidas - fixos - parcelas,
    lancamentos: linhas.length,
  }
}
