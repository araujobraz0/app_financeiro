// Montagem do HTML do relatório em PDF.
// Função pura: recebe os dados do mês, devolve uma string HTML.
// Quem transforma esse HTML em arquivo é o home.tsx (expo-print no nativo,
// html2pdf no web) — aqui só cuidamos do layout.

import { formatarMoeda } from '../currency'
import type { ExportData } from './types'

/** Escapa caracteres especiais para não quebrar o HTML gerado. */
export const escapeHtml = (value: string) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/** Monta as linhas <tr> de uma tabela, ou uma linha de "sem dados". */
export const renderPdfRows = (rows: string[][], emptyCols: number) => {
  if (!rows.length) {
    return `<tr><td colspan="${emptyCols}" class="empty">Sem dados no mês selecionado.</td></tr>`
  }
  return rows
    .map((cols) => `<tr>${cols.map((col) => `<td>${escapeHtml(col)}</td>`).join('')}</tr>`)
    .join('')
}

const PDF_STYLES = `
  * { box-sizing: border-box; }
  @page { margin: 26mm 16mm 24mm; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    padding: 0;
    color: #17361f;
    background: #f8fafc;
  }
  .page {
    background: #f7f3e8;
    border: 1px solid #d8c9a9;
    border-radius: 24px;
    overflow: hidden;
  }
  .hero {
    padding: 28px 30px 22px;
    background: linear-gradient(135deg, #113120 0%, #1f5a34 62%, #b7923b 100%);
    color: #ffffff;
  }
  .eyebrow {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  h1 {
    font-size: 28px;
    line-height: 1.15;
    margin: 14px 0 8px;
  }
  .hero-sub {
    color: #cbd5e1;
    font-size: 13px;
    margin: 0;
  }
  .section-wrap {
    padding: 22px 24px 26px;
  }
  .summary-grid {
    width: 100%;
    border-collapse: separate;
    border-spacing: 12px 12px;
    margin: 0 -12px 6px;
  }
  .summary-card {
    width: 50%;
    background: #fffdf8;
    border: 1px solid #dfd0b2;
    border-radius: 18px;
    padding: 14px 16px;
    vertical-align: top;
  }
  .summary-label {
    font-size: 11px;
    color: #6f7c67;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    margin-bottom: 8px;
  }
  .summary-value {
    font-size: 22px;
    font-weight: 800;
    color: #17361f;
  }
  .summary-value.positive { color: #2c7a4a; }
  .summary-value.negative { color: #c24f4f; }
  .section-title {
    font-size: 16px;
    font-weight: 800;
    color: #17361f;
    margin: 22px 0 10px;
  }
  .section-sub {
    font-size: 12px;
    color: #6f7c67;
    margin: -2px 0 10px;
  }
  table.section {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    margin-top: 8px;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    overflow: hidden;
  }
  table.section th,
  table.section td {
    padding: 10px 12px;
    text-align: left;
    vertical-align: top;
    font-size: 12px;
  }
  table.section thead th {
    background: #f3ead6;
    color: #17361f;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-size: 10px;
    font-weight: 800;
    border-bottom: 1px solid #ddcfb1;
  }
  table.section tbody tr:nth-child(even) td {
    background: #fffaf0;
  }
  table.section tbody tr:not(:last-child) td {
    border-bottom: 1px solid #eee1c7;
  }
  .empty {
    text-align: center;
    color: #6f7c67;
    padding: 16px 12px;
  }
  .badge-row {
    margin-top: 14px;
  }
  .badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(246, 232, 176, 0.18);
    color: #f6e8b0;
    font-size: 11px;
    font-weight: 700;
    margin-right: 8px;
  }
  .footer-note {
    margin-top: 18px;
    font-size: 11px;
    color: #6f7c67;
    text-align: center;
  }
`

/** Monta o HTML completo do relatório em PDF. */
export function buildPdfHtml(dados: ExportData): string {
  const { resumo, entradas, fixos, saidas, categorias, parcelas } = dados

  return `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>${PDF_STYLES}</style>
          </head>
          <body>
            <div class="page">
              <div class="hero">
                <span class="eyebrow">Brazllet · relatório financeiro</span>
                <h1>Brazllet financeiro</h1>
                <p class="hero-sub">Competência exportada: ${escapeHtml(resumo.competencia)}</p>
                <div class="badge-row">
                  <span class="badge">Entradas, fixos, saídas e cartões</span>
                  <span class="badge">Identidade Brazllet</span>
                </div>
              </div>

              <div class="section-wrap">
                <table class="summary-grid">
                  <tr>
                    <td class="summary-card">
                      <div class="summary-label">Salário</div>
                      <div class="summary-value">${escapeHtml(formatarMoeda(resumo.salario))}</div>
                    </td>
                    <td class="summary-card">
                      <div class="summary-label">Saldo atual</div>
                      <div class="summary-value ${resumo.saldoAtual >= 0 ? 'positive' : 'negative'}">${escapeHtml(formatarMoeda(resumo.saldoAtual))}</div>
                    </td>
                  </tr>
                  <tr>
                    <td class="summary-card">
                      <div class="summary-label">Entradas</div>
                      <div class="summary-value positive">${escapeHtml(formatarMoeda(resumo.entradas))}</div>
                    </td>
                    <td class="summary-card">
                      <div class="summary-label">Saídas</div>
                      <div class="summary-value negative">${escapeHtml(formatarMoeda(resumo.saidas))}</div>
                    </td>
                  </tr>
                  <tr>
                    <td class="summary-card">
                      <div class="summary-label">Fixos pagos</div>
                      <div class="summary-value">${escapeHtml(formatarMoeda(resumo.fixosPagos))}</div>
                    </td>
                    <td class="summary-card">
                      <div class="summary-label">Fixos não pagos</div>
                      <div class="summary-value">${escapeHtml(formatarMoeda(resumo.fixosNaoPagos))}</div>
                    </td>
                  </tr>
                  <tr>
                    <td class="summary-card">
                      <div class="summary-label">Cartões no mês</div>
                      <div class="summary-value">${escapeHtml(formatarMoeda(resumo.cartoes))}</div>
                    </td>
                    <td class="summary-card">
                      <div class="summary-label">Categorias com gasto</div>
                      <div class="summary-value">${escapeHtml(String(categorias.length))}</div>
                    </td>
                  </tr>
                </table>

                <div class="section-title">Entradas</div>
                <div class="section-sub">Lançamentos positivos registrados na competência selecionada.</div>
                <table class="section">
                  <thead><tr><th>Nome</th><th>Valor</th></tr></thead>
                  <tbody>${renderPdfRows(entradas.map((item) => [item.nome, formatarMoeda(item.valor)]), 2)}</tbody>
                </table>

                <div class="section-title">Gastos fixos</div>
                <div class="section-sub">Itens recorrentes do mês, com status de pagamento.</div>
                <table class="section">
                  <thead><tr><th>Nome</th><th>Valor</th><th>Status</th></tr></thead>
                  <tbody>${renderPdfRows(fixos.map((item) => [item.nome, formatarMoeda(item.valor), item.pago ? 'Pago' : 'Não pago']), 3)}</tbody>
                </table>

                <div class="section-title">Saídas variáveis</div>
                <div class="section-sub">Despesas organizadas com categoria e valor.</div>
                <table class="section">
                  <thead><tr><th>Nome</th><th>Categoria</th><th>Valor</th></tr></thead>
                  <tbody>${renderPdfRows(saidas.map((item) => [item.nome, item.categoria, formatarMoeda(item.valor)]), 3)}</tbody>
                </table>

                <div class="section-title">Ranking de categorias</div>
                <div class="section-sub">Categorias com maior impacto financeiro no mês.</div>
                <table class="section">
                  <thead><tr><th>Categoria</th><th>Valor</th><th>Percentual</th></tr></thead>
                  <tbody>${renderPdfRows(categorias.map((item) => [item.categoria, formatarMoeda(item.valor), `${item.percentual.toFixed(1).replace('.', ',')}%`]), 3)}</tbody>
                </table>

                <div class="section-title">Cartões e parcelas</div>
                <div class="section-sub">Compras parceladas que compõem a competência exportada.</div>
                <table class="section">
                  <thead><tr><th>Cartão</th><th>Descrição</th><th>Parcela</th><th>Valor</th></tr></thead>
                  <tbody>${renderPdfRows(parcelas.map((item) => [item.cartao, item.descricao, `${item.parcelaAtual}/${item.totalParcelas}`, formatarMoeda(item.valorParcela)]), 4)}</tbody>
                </table>

                <div class="footer-note">Arquivo gerado automaticamente com base na competência selecionada no app.</div>
              </div>
            </div>
          </body>
        </html>`
}
