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
//
// Nesta rodada o relatorio deixou de ser so uma pilha de tabelas: ganhou as
// barras de categoria que existem na tela, uma linha de total no pe de cada
// tabela, a data de cada lancamento, e — o que faltava mais — passou a dizer
// "nada lancado" em vez de sumir com a secao vazia, que fazia o mes zerado
// virar um PDF de uma pagina so, sem explicacao nenhuma.

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { formatarMoeda } from '../currency'
import { linhasDoMes, totaisDasLinhas, type LinhaExportada } from './tabela'
import type { ExportData } from './types'

// Paleta do relatorio, alinhada a identidade do app.
const VERDE: [number, number, number] = [27, 122, 69]
const VERDE_CLARO: [number, number, number] = [47, 167, 101]
const DOURADO: [number, number, number] = [200, 155, 44]
const TINTA: [number, number, number] = [18, 37, 26]
const CINZA: [number, number, number] = [95, 114, 103]
const CLARO: [number, number, number] = [245, 244, 238]
const LINHA: [number, number, number] = [230, 228, 218]
const VERMELHO: [number, number, number] = [210, 69, 63]

const MARGEM = 14
const RODAPE = 20

/** "12/08" — a data curta que cabe na coluna da tabela. */
function diaEmTexto(linha: LinhaExportada) {
  if (!linha.data) return linha.dia ? String(linha.dia).padStart(2, '0') : '—'
  const dia = String(linha.data.getDate()).padStart(2, '0')
  const mes = String(linha.data.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}`
}

export function gerarDocumentoPdf(dados: ExportData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const largura = doc.internal.pageSize.getWidth()
  const alturaPagina = doc.internal.pageSize.getHeight()
  const util = largura - MARGEM * 2

  const linhas = linhasDoMes(dados)
  const totais = totaisDasLinhas(linhas)
  const doTipo = (tipo: LinhaExportada['tipo']) => linhas.filter((l) => l.tipo === tipo)

  // ---------- Cabecalho ----------
  doc.setFillColor(...VERDE)
  doc.rect(0, 0, largura, 38, 'F')

  // Uma faixa mais clara a direita da o mesmo ar de degrade da capa do app,
  // sem depender de recurso de gradiente que o jsPDF nao tem.
  doc.setFillColor(...VERDE_CLARO)
  doc.rect(largura * 0.62, 0, largura * 0.38, 38, 'F')

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

  doc.setTextColor(...CINZA)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(
    `${totais.lancamentos} ${totais.lancamentos === 1 ? 'lançamento' : 'lançamentos'} no mês`,
    largura - MARGEM - 8,
    y + 20,
    { align: 'right' }
  )

  y += 34

  // ---------- Cartoes de numero ----------
  // Dois por tres, e nao quatro numa linha: assim cabem os fixos pagos e os
  // em aberto, que antes ficavam de fora do topo do relatorio.
  const blocos: [string, number, [number, number, number]][] = [
    ['Salário', dados.resumo.salario, TINTA],
    ['Entradas', dados.resumo.entradas, VERDE],
    ['Saídas', dados.resumo.saidas, VERMELHO],
    ['Fixos pagos', dados.resumo.fixosPagos, TINTA],
    ['Fixos em aberto', dados.resumo.fixosNaoPagos, DOURADO],
    ['Cartões', dados.resumo.cartoes, TINTA],
  ]

  const larguraBloco = (util - 6) / 3
  blocos.forEach(([rotulo, valor, cor], i) => {
    const coluna = i % 3
    const fileira = Math.floor(i / 3)
    const x = MARGEM + coluna * (larguraBloco + 3)
    const topo = y + fileira * 23

    doc.setDrawColor(...LINHA)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, topo, larguraBloco, 20, 2.5, 2.5, 'S')

    doc.setTextColor(...CINZA)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text(rotulo.toUpperCase(), x + 4, topo + 7)

    doc.setTextColor(...cor)
    doc.setFontSize(10)
    doc.text(formatarMoeda(valor), x + 4, topo + 15)
  })

  y += 23 * Math.ceil(blocos.length / 3) + 8

  /**
   * Titulo de secao com um filete dourado a esquerda.
   *
   * Se nao houver altura para o titulo mais ao menos a primeira linha da
   * tabela, comeca em pagina nova — senao o titulo fica orfao no pe da
   * pagina, encostado no rodape.
   */
  const ALTURA_MINIMA_SECAO = 34

  const secao = (titulo: string, posY: number, alturaNecessaria = ALTURA_MINIMA_SECAO) => {
    let alvo = posY

    if (alvo + alturaNecessaria > alturaPagina - RODAPE) {
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

  const semNada = (mensagem: string) => {
    doc.setFillColor(...CLARO)
    doc.roundedRect(MARGEM, y, util, 14, 2.5, 2.5, 'F')
    doc.setTextColor(...CINZA)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(mensagem, MARGEM + 6, y + 9)
    y += 22
  }

  const tabela = (
    titulo: string,
    cabecalho: string[],
    corpo: (string | number)[][],
    total: number | null,
    vazio: string
  ) => {
    y = secao(titulo, y)

    if (corpo.length === 0) {
      semNada(vazio)
      return
    }

    const rodape =
      total === null
        ? undefined
        : [['TOTAL', ...Array(cabecalho.length - 2).fill(''), formatarMoeda(total)]]

    autoTable(doc, {
      startY: y,
      head: [cabecalho],
      body: corpo,
      foot: rodape,
      margin: { left: MARGEM, right: MARGEM, bottom: RODAPE },
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: 3,
        textColor: TINTA,
        lineColor: LINHA,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: VERDE,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      footStyles: {
        fillColor: CLARO,
        textColor: TINTA,
        fontStyle: 'bold',
        fontSize: 9,
      },
      alternateRowStyles: { fillColor: [250, 249, 245] },
      columnStyles: {
        [cabecalho.length - 1]: { halign: 'right', fontStyle: 'bold' },
      },
    })

    y = (doc as any).lastAutoTable.finalY + 12
  }

  // ---------- Onde o dinheiro foi ----------
  // As mesmas barras da tela: e o pedaco do relatorio que se le de relance,
  // sem precisar somar coluna nenhuma.
  const categorias = dados.categorias.filter((item) => item.valor > 0).slice(0, 8)

  if (categorias.length) {
    const alturaBarras = categorias.length * 11 + 6
    y = secao('Onde o dinheiro foi', y, alturaBarras + 12)

    const maior = Math.max(...categorias.map((item) => item.valor)) || 1
    const larguraTrilho = util * 0.46
    const inicioTrilho = MARGEM + util * 0.3

    categorias.forEach((item, i) => {
      const topo = y + i * 11

      doc.setTextColor(...TINTA)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.text(item.categoria.slice(0, 22), MARGEM, topo + 4)

      doc.setFillColor(...LINHA)
      doc.roundedRect(inicioTrilho, topo, larguraTrilho, 5, 1.2, 1.2, 'F')

      const preenchido = Math.max(1.6, (item.valor / maior) * larguraTrilho)
      doc.setFillColor(...VERDE)
      doc.roundedRect(inicioTrilho, topo, preenchido, 5, 1.2, 1.2, 'F')

      doc.setTextColor(...CINZA)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(
        `${formatarMoeda(item.valor)}  ·  ${item.percentual.toFixed(1).replace('.', ',')}%`,
        largura - MARGEM,
        topo + 4,
        { align: 'right' }
      )
    })

    y += alturaBarras + 6
  }

  // ---------- Secoes ----------
  tabela(
    'Entradas',
    ['Descrição', 'Data', 'Valor'],
    doTipo('Entrada').map((linha) => [linha.descricao, diaEmTexto(linha), formatarMoeda(Math.abs(linha.valor))]),
    totais.entradas,
    'Nenhuma entrada lançada neste mês.'
  )

  tabela(
    'Gastos fixos',
    ['Descrição', 'Situação', 'Data', 'Valor'],
    doTipo('Gasto fixo').map((linha) => [
      linha.descricao,
      linha.situacao,
      diaEmTexto(linha),
      formatarMoeda(Math.abs(linha.valor)),
    ]),
    totais.fixos,
    'Nenhum gasto fixo neste mês.'
  )

  tabela(
    'Saídas',
    ['Descrição', 'Categoria', 'Data', 'Valor'],
    doTipo('Saída').map((linha) => [
      linha.descricao,
      linha.categoria || '—',
      diaEmTexto(linha),
      formatarMoeda(Math.abs(linha.valor)),
    ]),
    totais.saidas,
    'Nenhuma saída lançada neste mês.'
  )

  tabela(
    'Compras parceladas',
    ['Descrição', 'Cartão', 'Parcela', 'Valor'],
    doTipo('Parcela de cartão').map((linha) => [
      linha.descricao,
      linha.categoria || '—',
      linha.situacao,
      formatarMoeda(Math.abs(linha.valor)),
    ]),
    totais.parcelas,
    'Nenhuma parcela caindo neste mês.'
  )

  // ---------- Rodape em todas as paginas ----------
  const total = doc.getNumberOfPages()
  for (let pagina = 1; pagina <= total; pagina += 1) {
    doc.setPage(pagina)
    const altura = doc.internal.pageSize.getHeight()

    doc.setDrawColor(...LINHA)
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
