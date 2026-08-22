// Montagem da planilha Excel (.xlsx).
// Funcao pura: recebe os dados do mes, devolve o workbook do SheetJS.

import * as XLSX from 'xlsx'
import type { ExportData } from './types'

/** Formato de moeda do Excel, para as celulas saírem como numero e nao texto. */
const MOEDA = 'R$ #,##0.00'

type Coluna = { titulo: string; largura: number; moeda?: boolean }

/**
 * Cria uma aba a partir de cabecalho + linhas.
 *
 * Os valores vao como numero, com formato de moeda aplicado na celula — antes
 * saiam como texto ja formatado, o que impedia somar ou filtrar na planilha,
 * que e justamente para o que se exporta um Excel.
 */
function montarAba(colunas: Coluna[], linhas: (string | number)[][]) {
  const aba = XLSX.utils.aoa_to_sheet([colunas.map((c) => c.titulo), ...linhas])

  aba['!cols'] = colunas.map((c) => ({ wch: c.largura }))
  // Sem congelar o cabecalho: e recurso do SheetJS Pro e aqui seria um
  // no-op silencioso. O autofiltro abaixo a versao community escreve.
  aba['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: linhas.length, c: Math.max(0, colunas.length - 1) },
    }),
  }

  colunas.forEach((coluna, indiceColuna) => {
    if (!coluna.moeda) return
    for (let linha = 1; linha <= linhas.length; linha += 1) {
      const endereco = XLSX.utils.encode_cell({ r: linha, c: indiceColuna })
      const celula = aba[endereco]
      if (celula && typeof celula.v === 'number') {
        celula.t = 'n'
        celula.z = MOEDA
      }
    }
  })

  return aba
}

/**
 * Monta o workbook com uma aba por secao:
 * Resumo, Entradas, Fixos, Saidas, Categorias e Cartoes.
 */
export function buildExportWorkbook(dados: ExportData): XLSX.WorkBook {
  const { resumo, entradas, fixos, saidas, categorias, parcelas } = dados

  const wb = XLSX.utils.book_new()
  wb.Props = {
    Title: `Brazllet — ${resumo.competencia}`,
    Subject: 'Relatório financeiro',
    Author: 'Brazllet',
  }

  // ---------- Resumo ----------
  const resumoAba = montarAba(
    [
      { titulo: 'Indicador', largura: 26 },
      { titulo: 'Valor', largura: 18, moeda: true },
    ],
    [
      ['Salário', resumo.salario],
      ['Entradas', resumo.entradas],
      ['Fixos pagos', resumo.fixosPagos],
      ['Fixos não pagos', resumo.fixosNaoPagos],
      ['Saídas', resumo.saidas],
      ['Cartões', resumo.cartoes],
      ['Saldo do mês', resumo.saldoAtual],
    ]
  )
  XLSX.utils.book_append_sheet(wb, resumoAba, 'Resumo')

  // ---------- Entradas ----------
  XLSX.utils.book_append_sheet(
    wb,
    montarAba(
      [
        { titulo: 'Descrição', largura: 38 },
        { titulo: 'Dia', largura: 8 },
        { titulo: 'Valor', largura: 16, moeda: true },
      ],
      entradas.map((item) => [item.nome, item.dia ?? '', item.valor])
    ),
    'Entradas'
  )

  // ---------- Fixos ----------
  XLSX.utils.book_append_sheet(
    wb,
    montarAba(
      [
        { titulo: 'Descrição', largura: 38 },
        { titulo: 'Situação', largura: 14 },
        { titulo: 'Dia', largura: 8 },
        { titulo: 'Valor', largura: 16, moeda: true },
      ],
      fixos.map((item) => [item.nome, item.pago ? 'Pago' : 'Em aberto', item.dia ?? '', item.valor])
    ),
    'Fixos'
  )

  // ---------- Saidas ----------
  XLSX.utils.book_append_sheet(
    wb,
    montarAba(
      [
        { titulo: 'Descrição', largura: 38 },
        { titulo: 'Categoria', largura: 20 },
        { titulo: 'Dia', largura: 8 },
        { titulo: 'Valor', largura: 16, moeda: true },
      ],
      saidas.map((item) => [item.nome, item.categoria || '', item.dia ?? '', item.valor])
    ),
    'Saídas'
  )

  // ---------- Categorias ----------
  XLSX.utils.book_append_sheet(
    wb,
    montarAba(
      [
        { titulo: 'Categoria', largura: 24 },
        { titulo: 'Participação (%)', largura: 18 },
        { titulo: 'Valor', largura: 16, moeda: true },
      ],
      categorias.map((item) => [item.categoria, Number(item.percentual.toFixed(1)), item.valor])
    ),
    'Categorias'
  )

  // ---------- Parcelas ----------
  XLSX.utils.book_append_sheet(
    wb,
    montarAba(
      [
        { titulo: 'Descrição', largura: 34 },
        { titulo: 'Cartão', largura: 20 },
        { titulo: 'Parcela', largura: 12 },
        { titulo: 'Total de parcelas', largura: 18 },
        { titulo: 'Valor da parcela', largura: 18, moeda: true },
      ],
      parcelas.map((item) => [
        item.descricao,
        item.cartao,
        item.parcelaAtual,
        item.totalParcelas,
        item.valorParcela,
      ])
    ),
    'Cartões'
  )

  return wb
}
