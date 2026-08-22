// Geracao do relatorio em PDF.
//
// A versao anterior montava um HTML e pedia ao html2pdf que o fotografasse
// com html2canvas. Esse caminho e fragil: o html2canvas nao entende varias
// propriedades de CSS moderno, ignora @page e captura de um container fora da
// tela — quando algo nao encaixa ele nao falha, apenas devolve uma pagina em
// branco. Era isso que acontecia.
//
// Aqui o PDF e desenhado direto com jsPDF. O texto sai vetorial (nitido em
// qualquer zoom e selecionavel), nao ha captura de tela para dar errado, e o
// layout fica sob controle total.

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { formatarMoeda } from '../currency'
import type { ExportData } from './types'

// Paleta do relatorio, alinhada a identidade do app.
const VERDE: [number, number, number] = [27, 122, 69]
const DOURADO: [number, number, number] = [200, 155, 44]
const TINTA: [number, number, number] = [18, 37, 26]
const CINZA: [number, number, number] = [95, 114, 103]
const CLARO: [number, number, number] = [245, 244, 238]
const VERMELHO: [number, number, number] = [210, 69, 63]

const MARGEM = 14

export function gerarDocumentoPdf(dados: ExportData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const largura = doc.internal.pageSize.getWidth()
  const util = largura - MARGEM * 2

  // ---------- Cabecalho ----------
  doc.setFillColor(...VERDE)
  doc.rect(0, 0, largura, 38, 'F')

  doc.setFillColor(...DOURADO)
  doc.rect(0, 38, largura, 1.6, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.text('Brazllet', MARGEM, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Relatório financeiro', MARGEM, 28)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(dados.resumo.competencia, largura - MARGEM, 20, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
    largura - MARGEM,
    28,
    { align: 'right' }
  )

  // ---------- Saldo em destaque ----------
  let y = 52
  const positivo = dados.resumo.saldoAtual >= 0

  doc.setFillColor(...CLARO)
  doc.roundedRect(MARGEM, y, util, 26, 3, 3, 'F')

  doc.setTextColor(...CINZA)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('SALDO DO MÊS', MARGEM + 8, y + 9)

  doc.setTextColor(...(positivo ? VERDE : VERMELHO))
  doc.setFontSize(20)
  doc.text(formatarMoeda(dados.resumo.saldoAtual), MARGEM + 8, y + 20)

  y += 34

  // ---------- Cartoes de numero ----------
  const blocos: [string, number, [number, number, number]][] = [
    ['Salário', dados.resumo.salario, TINTA],
    ['Entradas', dados.resumo.entradas, VERDE],
    ['Saídas', dados.resumo.saidas, VERMELHO],
    ['Cartões', dados.resumo.cartoes, TINTA],
  ]

  const larguraBloco = (util - 9) / 4
  blocos.forEach(([rotulo, valor, cor], i) => {
    const x = MARGEM + i * (larguraBloco + 3)
    doc.setDrawColor(226, 224, 214)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, larguraBloco, 20, 2.5, 2.5, 'S')

    doc.setTextColor(...CINZA)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(rotulo.toUpperCase(), x + 4, y + 7)

    doc.setTextColor(...cor)
    doc.setFontSize(10)
    doc.text(formatarMoeda(valor), x + 4, y + 15)
  })

  y += 30

  /**
   * Titulo de secao com um filete dourado a esquerda.
   *
   * Se nao houver altura para o titulo mais ao menos a primeira linha da
   * tabela, comeca em pagina nova — senao o titulo fica orfao no pe da
   * pagina, encostado no rodape.
   */
  const ALTURA_MINIMA_SECAO = 34

  const secao = (titulo: string, posY: number) => {
    const alturaPagina = doc.internal.pageSize.getHeight()
    let alvo = posY

    if (alvo + ALTURA_MINIMA_SECAO > alturaPagina - 20) {
      doc.addPage()
      alvo = 24
    }

    doc.setFillColor(...DOURADO)
    doc.rect(MARGEM, alvo - 4, 1.8, 6, 'F')
    doc.setTextColor(...TINTA)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(titulo, MARGEM + 5, alvo)
    return alvo + 5
  }

  const tabela = (titulo: string, cabecalho: string[], linhas: (string | number)[][]) => {
    if (linhas.length === 0) return

    y = secao(titulo, y)

    autoTable(doc, {
      startY: y,
      head: [cabecalho],
      body: linhas,
      margin: { left: MARGEM, right: MARGEM },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3,
        textColor: TINTA,
        lineColor: [230, 228, 218],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: VERDE,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      alternateRowStyles: { fillColor: [250, 249, 245] },
      columnStyles: {
        [cabecalho.length - 1]: { halign: 'right', fontStyle: 'bold' },
      },
    })

    y = (doc as any).lastAutoTable.finalY + 12
  }

  // ---------- Secoes ----------
  tabela(
    'Entradas',
    ['Descrição', 'Dia', 'Valor'],
    dados.entradas.map((item) => [item.nome, item.dia ? String(item.dia) : '—', formatarMoeda(item.valor)])
  )

  tabela(
    'Gastos fixos',
    ['Descrição', 'Situação', 'Valor'],
    dados.fixos.map((item) => [item.nome, item.pago ? 'Pago' : 'Em aberto', formatarMoeda(item.valor)])
  )

  tabela(
    'Saídas',
    ['Descrição', 'Categoria', 'Valor'],
    dados.saidas.map((item) => [item.nome, item.categoria || '—', formatarMoeda(item.valor)])
  )

  tabela(
    'Por categoria',
    ['Categoria', 'Participação', 'Valor'],
    dados.categorias.map((item) => [
      item.categoria,
      `${item.percentual.toFixed(1).replace('.', ',')}%`,
      formatarMoeda(item.valor),
    ])
  )

  tabela(
    'Compras parceladas',
    ['Descrição', 'Cartão', 'Parcela', 'Valor'],
    dados.parcelas.map((item) => [
      item.descricao,
      item.cartao,
      `${item.parcelaAtual}/${item.totalParcelas}`,
      formatarMoeda(item.valorParcela),
    ])
  )

  // ---------- Rodape em todas as paginas ----------
  const total = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina)
    const altura = doc.internal.pageSize.getHeight()

    doc.setDrawColor(230, 228, 218)
    doc.setLineWidth(0.3)
    doc.line(MARGEM, altura - 14, largura - MARGEM, altura - 14)

    doc.setTextColor(...CINZA)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('Brazllet · Sua wallet sob controle', MARGEM, altura - 9)
    doc.text(`${pagina} de ${total}`, largura - MARGEM, altura - 9, { align: 'right' })
  }

  return doc
}

/** URL de blob do relatorio, para preview e download. */
export function gerarPdfUri(dados: ExportData): string {
  return URL.createObjectURL(gerarDocumentoPdf(dados).output('blob'))
}
