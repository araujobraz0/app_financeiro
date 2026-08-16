// Montagem da planilha Excel (.xlsx).
// Função pura: recebe os dados do mês, devolve o workbook do SheetJS.

import * as XLSX from 'xlsx'
import type { ExportData } from './types'

/**
 * Monta o workbook com uma aba por seção:
 * Resumo, Entradas, Fixos, Saídas, Categorias e Cartões.
 */
export function buildExportWorkbook(dados: ExportData): XLSX.WorkBook {
  const { resumo, entradas, fixos, saidas, categorias, parcelas } = dados

  const wb = XLSX.utils.book_new()

  const resumoSheet = XLSX.utils.aoa_to_sheet([
    ['BRAZLLET'],
    ['Relatório financeiro premium'],
    ['Competência', resumo.competencia],
    ['Estilo', 'Brazllet'],
    [],
    ['Resumo do mês'],
    ['Campo', 'Valor'],
    ['Salário', resumo.salario],
    ['Entradas', resumo.entradas],
    ['Fixos pagos', resumo.fixosPagos],
    ['Fixos não pagos', resumo.fixosNaoPagos],
    ['Saídas', resumo.saidas],
    ['Cartões', resumo.cartoes],
    ['Saldo atual', resumo.saldoAtual],
  ])
  resumoSheet['!cols'] = [{ wch: 26 }, { wch: 20 }]
  resumoSheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
  ]
  XLSX.utils.book_append_sheet(wb, resumoSheet, 'Resumo')

  const entradasSheet = XLSX.utils.json_to_sheet(
    entradas.length
      ? entradas.map((item) => ({ Nome: item.nome, Valor: item.valor }))
      : [{ Nome: 'Sem entradas', Valor: '' }]
  )
  entradasSheet['!cols'] = [{ wch: 34 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, entradasSheet, 'Entradas')

  const fixosSheet = XLSX.utils.json_to_sheet(
    fixos.length
      ? fixos.map((item) => ({
          Nome: item.nome,
          Valor: item.valor,
          Status: item.pago ? 'Pago' : 'Não pago',
        }))
      : [{ Nome: 'Sem fixos', Valor: '', Status: '' }]
  )
  fixosSheet['!cols'] = [{ wch: 34 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, fixosSheet, 'Fixos')

  const saidasSheet = XLSX.utils.json_to_sheet(
    saidas.length
      ? saidas.map((item) => ({
          Nome: item.nome,
          Categoria: item.categoria,
          Valor: item.valor,
        }))
      : [{ Nome: 'Sem saídas', Categoria: '', Valor: '' }]
  )
  saidasSheet['!cols'] = [{ wch: 34 }, { wch: 18 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, saidasSheet, 'Saídas')

  const categoriasSheet = XLSX.utils.json_to_sheet(
    categorias.length
      ? categorias.map((item) => ({
          Categoria: item.categoria,
          Valor: item.valor,
          Percentual: `${item.percentual.toFixed(1).replace('.', ',')}%`,
        }))
      : [{ Categoria: 'Sem categorias', Valor: '', Percentual: '' }]
  )
  categoriasSheet['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, categoriasSheet, 'Categorias')

  const cartoesSheet = XLSX.utils.json_to_sheet(
    parcelas.length
      ? parcelas.map((item) => ({
          Cartão: item.cartao,
          Descrição: item.descricao,
          Parcela: `${item.parcelaAtual}/${item.totalParcelas}`,
          Valor: item.valorParcela,
        }))
      : [{ Cartão: 'Sem parcelas no mês', Descrição: '', Parcela: '', Valor: '' }]
  )
  cartoesSheet['!cols'] = [{ wch: 20 }, { wch: 34 }, { wch: 14 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, cartoesSheet, 'Cartões')

  return wb
}
