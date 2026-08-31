// Montagem da planilha Excel (.xlsx).
// Funcao pura: recebe os dados do mes, devolve o workbook do SheetJS.
//
// Tres coisas faltavam para a planilha ser util de verdade:
//
//   1. Nao havia uma aba com tudo junto. Cada secao na sua aba impede a
//      pergunta mais comum — "quanto saiu no mes inteiro" — sem juntar as
//      abas na mao.
//   2. O dia saia como numero solto (12), sem mes nem ano, entao nao dava
//      para ordenar por periodo nem montar uma tabela dinamica por data.
//   3. Nenhuma aba somava nada, e a soma e o motivo de exportar planilha.
//
// O conteudo das abas vive em abas.ts, que a previa tambem le. Aqui fica so a
// traducao daquilo para o formato do SheetJS.

import * as XLSX from 'xlsx'

import { abasDaExportacao, type AbaExportada, type CelulaExportada } from './abas'
import type { ExportData } from './types'

/** Formatos de celula do Excel, para sair numero e data, nao texto. */
const FORMATOS: Record<string, string> = {
  moeda: 'R$ #,##0.00',
  data: 'dd/mm/yyyy',
  porcento: '0.0"%"',
}

/**
 * A data como o Excel guarda: dias desde 30/12/1899.
 *
 * Passar o objeto Date direto depende de opcao de escrita e escorrega no
 * fuso — a conta em UTC sobre os componentes locais nao tem esse risco.
 */
function serialDoExcel(data: Date) {
  const emUtc = Date.UTC(data.getFullYear(), data.getMonth(), data.getDate())
  return Math.round((emUtc - Date.UTC(1899, 11, 30)) / 86400000)
}

function paraCelula(valor: CelulaExportada) {
  if (valor instanceof Date) return serialDoExcel(valor)
  return valor ?? ''
}

/**
 * Converte uma aba descrita em abas.ts na aba do SheetJS.
 *
 * Os valores vao como numero, com formato aplicado na celula — antes saiam
 * como texto ja formatado, o que impedia somar ou filtrar na planilha.
 */
function montarAba(aba: AbaExportada) {
  const corpo = aba.linhas.map((linha) => linha.map(paraCelula))
  const rodape = aba.total && aba.linhas.length ? [aba.total.map(paraCelula)] : []

  const folha = XLSX.utils.aoa_to_sheet([aba.colunas.map((c) => c.titulo), ...corpo, ...rodape])

  folha['!cols'] = aba.colunas.map((c) => ({ wch: c.largura }))
  // Sem congelar o cabecalho: e recurso do SheetJS Pro e aqui seria um
  // no-op silencioso. O autofiltro abaixo a versao community escreve, e
  // cobre so os dados — nunca a linha de total.
  folha['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: corpo.length, c: Math.max(0, aba.colunas.length - 1) },
    }),
  }

  aba.colunas.forEach((coluna, indiceColuna) => {
    const formato = coluna.formato && FORMATOS[coluna.formato]
    if (!formato) return

    for (let linha = 1; linha <= corpo.length + rodape.length; linha += 1) {
      const endereco = XLSX.utils.encode_cell({ r: linha, c: indiceColuna })
      const celula = folha[endereco]
      if (celula && typeof celula.v === 'number') {
        celula.t = 'n'
        celula.z = formato
      }
    }
  })

  return folha
}

/** Monta o workbook com uma aba por bloco descrito em abas.ts. */
export function buildExportWorkbook(dados: ExportData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new()
  wb.Props = {
    Title: `Brazllet — ${dados.resumo.competencia}`,
    Subject: 'Relatório financeiro',
    Author: 'Brazllet',
  }

  abasDaExportacao(dados).forEach((aba) => {
    XLSX.utils.book_append_sheet(wb, montarAba(aba), aba.nome)
  })

  return wb
}
