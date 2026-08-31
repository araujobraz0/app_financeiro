// O CSV exportado.
//
// A versao anterior escrevia um relatorio: titulo, competencia, e depois seis
// tabelinhas separadas por linhas em branco, cada uma com um cabecalho
// diferente. Bonito de ler no bloco de notas e inutil como arquivo de dados —
// nenhuma planilha consegue abrir aquilo como uma tabela so, e os valores
// saiam como texto ja formatado ("R$ 1.234,56"), entao somar a coluna no
// Excel devolvia zero. Exportar CSV serve justamente para somar e filtrar.
//
// Agora e uma tabela unica: uma linha de titulos e uma linha por lancamento,
// com o valor como numero de verdade. Abre direto em Excel, Planilhas Google
// e LibreOffice — e o proprio Brazllet consegue reimportar o arquivo.

import { linhasDoMes, type LinhaExportada } from './tabela'
import type { ExportData } from './types'

const COLUNAS = [
  'Competência',
  'Tipo',
  'Descrição',
  'Categoria',
  'Situação',
  'Dia',
  'Data',
  'Valor',
]

/** "31/08/2026" — o formato que o Excel em portugues reconhece como data. */
function dataEmTexto(data: Date | null) {
  if (!data) return ''
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${data.getFullYear()}`
}

/**
 * "-1234,56".
 *
 * Sem simbolo de moeda e sem separador de milhar, com virgula decimal: e
 * assim que o Excel em portugues le a celula como numero. Com "R$" ou com
 * ponto de milhar ele guarda como texto.
 */
function valorEmTexto(valor: number) {
  if (!Number.isFinite(valor)) return '0,00'
  return valor.toFixed(2).replace('.', ',')
}

function celula(valor: string | number, separador: string) {
  const texto = String(valor ?? '')
  // So escapa quando precisa: aspas em toda celula deixam o arquivo pesado e
  // atrapalham quem le com ferramenta simples.
  const precisa = texto.includes(separador) || texto.includes('"') || /[\r\n]/.test(texto)
  return precisa ? `"${texto.replace(/"/g, '""')}"` : texto
}

function linhaEmTexto(valores: (string | number)[], separador: string) {
  return valores.map((valor) => celula(valor, separador)).join(separador)
}

/** Uma linha do CSV a partir de um lancamento. */
function celulasDaLinha(linha: LinhaExportada) {
  return [
    linha.competencia,
    linha.tipo,
    linha.descricao,
    linha.categoria,
    linha.situacao,
    linha.dia ?? '',
    dataEmTexto(linha.data),
    valorEmTexto(linha.valor),
  ]
}

/**
 * Monta o conteudo do CSV.
 *
 * @param dados     Dados da competencia selecionada
 * @param separator Separador de colunas (';' e o que o Excel pt-BR espera)
 */
export function buildExportRows(dados: ExportData, separator = ';'): string {
  const linhas = linhasDoMes(dados)

  // Sem lancamento nenhum o arquivo sai so com os titulos, e nao vazio: assim
  // ainda da para abrir, ver as colunas e saber que o mes estava zerado.
  return [
    linhaEmTexto(COLUNAS, separator),
    ...linhas.map((linha) => linhaEmTexto(celulasDaLinha(linha), separator)),
  ].join('\r\n')
}

/** As primeiras linhas do arquivo, para a previa mostrar o que vai sair. */
export function amostraDoCsv(dados: ExportData, quantas = 12, separator = ';') {
  const linhas = linhasDoMes(dados)
  const mostradas = linhas.slice(0, quantas)

  return {
    colunas: COLUNAS,
    linhas: mostradas.map(celulasDaLinha),
    total: linhas.length,
    restantes: Math.max(0, linhas.length - mostradas.length),
    texto: [
      linhaEmTexto(COLUNAS, separator),
      ...mostradas.map((linha) => linhaEmTexto(celulasDaLinha(linha), separator)),
    ].join('\n'),
  }
}
