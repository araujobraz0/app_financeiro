// Geração das linhas do CSV.
// Função pura: recebe os dados do mês, devolve o texto do arquivo.

import { formatarMoeda } from '../currency'
import type { ExportData } from './types'

/**
 * Monta o conteúdo completo do CSV a partir dos dados do mês.
 *
 * @param dados   Dados da competência selecionada
 * @param separator Separador de colunas (';' funciona melhor no Excel pt-BR)
 */
export function buildExportRows(dados: ExportData, separator = ';'): string {
  const { resumo, entradas, fixos, saidas, categorias, parcelas } = dados

  const lines: string[] = []

  const row = (values: Array<string | number>) =>
    values
      .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
      .join(separator)

  lines.push(row(['BRAZLLET | RELATÓRIO FINANCEIRO']))
  lines.push(row(['COMPETÊNCIA', resumo.competencia]))
  lines.push(row(['ESTILO', 'Brazllet Premium']))
  lines.push('')

  lines.push(row(['RESUMO']))
  lines.push(row(['Campo', 'Valor']))
  ;[
    ['Salário', formatarMoeda(resumo.salario)],
    ['Entradas', formatarMoeda(resumo.entradas)],
    ['Fixos pagos', formatarMoeda(resumo.fixosPagos)],
    ['Fixos não pagos', formatarMoeda(resumo.fixosNaoPagos)],
    ['Saídas', formatarMoeda(resumo.saidas)],
    ['Cartões', formatarMoeda(resumo.cartoes)],
    ['Saldo atual', formatarMoeda(resumo.saldoAtual)],
  ].forEach((item) => lines.push(row(item)))
  lines.push('')

  lines.push(row(['ENTRADAS']))
  lines.push(row(['Nome', 'Valor']))
  if (entradas.length) {
    entradas.forEach((item) => lines.push(row([item.nome, formatarMoeda(item.valor)])))
  } else {
    lines.push(row(['Sem entradas', '-']))
  }
  lines.push('')

  lines.push(row(['FIXOS']))
  lines.push(row(['Nome', 'Valor', 'Status']))
  if (fixos.length) {
    fixos.forEach((item) =>
      lines.push(row([item.nome, formatarMoeda(item.valor), item.pago ? 'Pago' : 'Não pago']))
    )
  } else {
    lines.push(row(['Sem fixos', '-', '-']))
  }
  lines.push('')

  lines.push(row(['SAÍDAS']))
  lines.push(row(['Nome', 'Categoria', 'Valor']))
  if (saidas.length) {
    saidas.forEach((item) =>
      lines.push(row([item.nome, item.categoria, formatarMoeda(item.valor)]))
    )
  } else {
    lines.push(row(['Sem saídas', '-', '-']))
  }
  lines.push('')

  lines.push(row(['RANKING DE CATEGORIAS']))
  lines.push(row(['Categoria', 'Valor', 'Percentual']))
  if (categorias.length) {
    categorias.forEach((item) =>
      lines.push(
        row([
          item.categoria,
          formatarMoeda(item.valor),
          `${item.percentual.toFixed(1).replace('.', ',')}%`,
        ])
      )
    )
  } else {
    lines.push(row(['Sem categorias', '-', '-']))
  }
  lines.push('')

  lines.push(row(['CARTÕES']))
  lines.push(row(['Cartão', 'Descrição', 'Parcela', 'Valor']))
  if (parcelas.length) {
    parcelas.forEach((item) =>
      lines.push(
        row([
          item.cartao,
          item.descricao,
          `${item.parcelaAtual}/${item.totalParcelas}`,
          formatarMoeda(item.valorParcela),
        ])
      )
    )
  } else {
    lines.push(row(['Sem parcelas no mês', '-', '-', '-']))
  }

  // CORREÇÃO: antes era join('') — sem separador, o CSV inteiro saía
  // numa única linha e o Excel não conseguia interpretar as colunas.
  return lines.join('\n')
}
