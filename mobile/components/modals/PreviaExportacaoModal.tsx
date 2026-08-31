// A previa da exportacao.
//
// Antes eram tres previas soltas dentro do home.tsx: o PDF de verdade, uma
// tabela de abas escrita a mao (que ja discordava do arquivo gerado) e, para o
// CSV, os primeiros 1400 caracteres do texto cru numa fonte monoespacada. Nada
// dizia quanto ia sair nem quantos lancamentos o arquivo teria, e trocar de
// formato exigia fechar tudo e voltar as configuracoes.
//
// Aqui a previa e uma so: os mesmos numeros no topo, o formato se troca por
// cima, e o corpo mostra o que aquele formato realmente produz — o PDF
// renderizado, as abas lidas da mesma descricao que gera o .xlsx, e o CSV
// como tabela, e nao como texto corrido.

import { useMemo, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import { formatarMoeda } from '../../src/utils/currency'
import { abasDaExportacao, type AbaExportada, type CelulaExportada } from '../../src/utils/export/abas'
import { amostraDoCsv } from '../../src/utils/export/rows'
import { linhasDoMes, totaisDasLinhas } from '../../src/utils/export/tabela'
import type { ExportData } from '../../src/utils/export/types'
import Icon, { type IconName } from '../common/Icon'
import ModalSheet from '../common/ModalSheet'
import PressableScale from '../common/motion/PressableScale'
import PdfPreview from '../PdfPreview'

export type FormatoExportacao = 'pdf' | 'excel' | 'csv'

type Props = {
  visible: boolean
  onClose: () => void
  theme: Tema
  dados: ExportData
  /** Nome do arquivo sem extensao: BRAZLLET_agosto_2026. */
  nomeBase: string
  formato: FormatoExportacao
  onTrocarFormato: (formato: FormatoExportacao) => void
  /** URL do PDF ja gerado, quando o formato e PDF. */
  pdfUri: string
  pdfGerando: boolean
  onConfirmar: () => void
}

const SOBRE_O_FORMATO: Record<
  FormatoExportacao,
  { extensao: string; icone: IconName; titulo: string; explicacao: string }
> = {
  pdf: {
    extensao: 'pdf',
    icone: 'documento',
    titulo: 'Relatório em PDF',
    explicacao: 'Para ler, imprimir ou mandar para alguém. Sai com os números do mês, as barras por categoria e uma tabela por seção.',
  },
  excel: {
    extensao: 'xlsx',
    icone: 'planilha',
    titulo: 'Planilha do Excel',
    explicacao: 'Uma aba com todos os lançamentos e uma por seção. Os valores vão como número e as datas como data, então dá para somar, filtrar e montar tabela dinâmica.',
  },
  csv: {
    extensao: 'csv',
    icone: 'exportar',
    titulo: 'Tabela em CSV',
    explicacao: 'Uma linha por lançamento, sem formatação. Abre em qualquer planilha — e o próprio Brazllet consegue reimportar este arquivo depois.',
  },
}

/** Quantas linhas de exemplo cabem sem virar rolagem infinita. */
const LINHAS_VISIVEIS = 8

export default function PreviaExportacaoModal({
  visible,
  onClose,
  theme,
  dados,
  nomeBase,
  formato,
  onTrocarFormato,
  pdfUri,
  pdfGerando,
  onConfirmar,
}: Props) {
  const [abaAtiva, setAbaAtiva] = useState(0)

  const totais = useMemo(() => totaisDasLinhas(linhasDoMes(dados)), [dados])
  const abas = useMemo(() => abasDaExportacao(dados), [dados])
  const csv = useMemo(() => amostraDoCsv(dados, LINHAS_VISIVEIS), [dados])

  const sobre = SOBRE_O_FORMATO[formato]
  const nomeArquivo = `${nomeBase}.${sobre.extensao}`
  const semNada = totais.lancamentos === 0

  // ------------------------------------------------------------ pedacos

  const bloco = (titulo: string, filhos: React.ReactNode) => (
    <View style={styles.bloco}>
      <Text style={[styles.blocoTitulo, { color: theme.faint }]}>{titulo}</Text>
      {filhos}
    </View>
  )

  const cartaoNumero = (rotulo: string, valor: number, cor: string, fundo: string, largo = false) => (
    <View
      style={[
        styles.numero,
        largo && styles.numeroLargo,
        { backgroundColor: fundo, borderColor: theme.border },
      ]}
    >
      <Text style={[styles.numeroRotulo, { color: theme.muted }]}>{rotulo}</Text>
      <Text style={[styles.numeroValor, { color: cor }]} numberOfLines={1}>
        {formatarMoeda(valor)}
      </Text>
    </View>
  )

  const chipFormato = (chave: FormatoExportacao, rotulo: string) => {
    const ativo = formato === chave
    return (
      <PressableScale
        key={chave}
        onPress={() => {
          onTrocarFormato(chave)
          setAbaAtiva(0)
        }}
        scaleTo={0.95}
        style={[
          styles.chip,
          {
            backgroundColor: ativo ? theme.primary : theme.cardSoft,
            borderColor: ativo ? theme.primary : theme.border,
          },
        ]}
      >
        <Icon
          name={SOBRE_O_FORMATO[chave].icone}
          size={13}
          color={ativo ? theme.textInverse : theme.muted}
        />
        <Text style={[styles.chipTexto, { color: ativo ? theme.textInverse : theme.muted }]}>
          {rotulo}
        </Text>
      </PressableScale>
    )
  }

  /** Uma celula da previa vira texto como vai sair no arquivo. */
  const celulaEmTexto = (valor: CelulaExportada, formatoCelula?: string) => {
    if (valor === null || valor === undefined || valor === '') return ''
    if (valor instanceof Date) {
      return `${String(valor.getDate()).padStart(2, '0')}/${String(valor.getMonth() + 1).padStart(2, '0')}/${valor.getFullYear()}`
    }
    if (typeof valor === 'number') {
      if (formatoCelula === 'moeda') return formatarMoeda(valor)
      if (formatoCelula === 'porcento') return `${valor.toFixed(1).replace('.', ',')}%`
      return String(valor)
    }
    return String(valor)
  }

  /**
   * As linhas do arquivo, uma por bloco.
   *
   * A primeira versao disto era uma tabela de verdade, com uma coluna por
   * coluna do arquivo. So que a aba de lancamentos tem sete colunas e o modal
   * tem a largura de um celular: sobrava um "Agosto...", um "E..." e um
   * "Sa..." por linha, o que nao e previa de coisa nenhuma. Aqui cada linha
   * mostra o nome inteiro, o resto embaixo e o valor a direita — o mesmo
   * formato das listas do app. As colunas do arquivo ficam listadas no pe.
   */
  const listaDeLinhas = (
    colunas: { titulo: string; formato?: string; principal?: boolean; escondida?: boolean }[],
    linhas: CelulaExportada[][],
    rodape: CelulaExportada[] | undefined,
    vazio: string
  ) => {
    const visiveis = linhas.slice(0, LINHAS_VISIVEIS)
    const restantes = linhas.length - visiveis.length
    const ultima = colunas.length - 1
    const valorENumero = colunas[ultima]?.formato === 'moeda' || colunas[ultima]?.formato === 'porcento'
    const marcada = colunas.findIndex((coluna) => coluna.principal)
    const iTitulo = marcada >= 0 ? marcada : 0
    const fimDoMeio = valorENumero ? ultima : colunas.length

    return (
      <View style={[styles.lista, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {visiveis.length === 0 ? (
          <Text style={[styles.vazio, { color: theme.faint }]}>{vazio}</Text>
        ) : (
          visiveis.map((linha, indiceLinha) => {
            const titulo = celulaEmTexto(linha[iTitulo], colunas[iTitulo]?.formato)
            const meio = colunas
              .slice(0, fimDoMeio)
              .map((coluna, i) =>
                i === iTitulo || coluna.escondida ? '' : celulaEmTexto(linha[i], coluna.formato)
              )
              .filter(Boolean)
              .join(' · ')
            const valor = valorENumero ? celulaEmTexto(linha[ultima], colunas[ultima].formato) : ''
            const negativo = typeof linha[ultima] === 'number' && (linha[ultima] as number) < 0

            return (
              <View
                key={indiceLinha}
                style={[
                  styles.linha,
                  { borderTopColor: theme.border, borderTopWidth: indiceLinha === 0 ? 0 : 1 },
                ]}
              >
                <View style={styles.linhaTextos}>
                  <Text style={[styles.linhaTitulo, { color: theme.text }]} numberOfLines={2}>
                    {titulo || '—'}
                  </Text>
                  {meio ? (
                    <Text style={[styles.linhaMeta, { color: theme.muted }]} numberOfLines={1}>
                      {meio}
                    </Text>
                  ) : null}
                </View>
                {valor ? (
                  <Text
                    style={[styles.linhaValor, { color: negativo ? theme.red : theme.text }]}
                    numberOfLines={1}
                  >
                    {valor}
                  </Text>
                ) : null}
              </View>
            )
          })
        )}

        {restantes > 0 ? (
          <Text style={[styles.restantes, { color: theme.faint, borderTopColor: theme.border }]}>
            + {restantes} {restantes === 1 ? 'linha' : 'linhas'} no arquivo
          </Text>
        ) : null}

        {rodape && visiveis.length ? (
          <View style={[styles.rodapeLista, { backgroundColor: theme.cardSoft, borderTopColor: theme.border }]}>
            <Text style={[styles.linhaTitulo, { color: theme.text, flex: 1 }]}>Total</Text>
            <Text style={[styles.linhaValor, { color: theme.text }]} numberOfLines={1}>
              {celulaEmTexto(rodape[ultima], colunas[ultima]?.formato)}
            </Text>
          </View>
        ) : null}
      </View>
    )
  }

  /** As colunas que o arquivo realmente tem, para a previa nao esconder nada. */
  const listaDeColunas = (colunas: { titulo: string }[]) => (
    <Text style={[styles.colunas, { color: theme.faint }]}>
      Colunas no arquivo: {colunas.map((c) => c.titulo).join(', ')}.
    </Text>
  )

  const corpoDaPlanilha = (lista: AbaExportada[]) => {
    const aba = lista[Math.min(abaAtiva, lista.length - 1)]

    return (
      <>
        <View style={styles.abas}>
          {lista.map((item, indice) => {
            const ativa = indice === Math.min(abaAtiva, lista.length - 1)
            return (
              <PressableScale
                key={item.nome}
                onPress={() => setAbaAtiva(indice)}
                scaleTo={0.95}
                style={[
                  styles.aba,
                  {
                    backgroundColor: ativa ? theme.primary : theme.cardSoft,
                    borderColor: ativa ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.abaTexto, { color: ativa ? theme.textInverse : theme.muted }]}>
                  {item.nome} {item.linhas.length}
                </Text>
              </PressableScale>
            )
          })}
        </View>

        {listaDeLinhas(aba.colunas, aba.linhas, aba.total, aba.vazio)}
        {listaDeColunas(aba.colunas)}
      </>
    )
  }

  // ---------------------------------------------------------------- tela

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo="Conferir antes de exportar"
      subtitulo={
        semNada
          ? 'Este mês não tem lançamento nenhum — o arquivo sai só com os títulos.'
          : `${totais.lancamentos} ${totais.lancamentos === 1 ? 'lançamento' : 'lançamentos'} de ${dados.resumo.competencia}`
      }
      alto
      acoes={[
        { label: 'Fechar', onPress: onClose },
        { label: `Baixar ${sobre.extensao.toUpperCase()}`, onPress: onConfirmar, primaria: true },
      ]}
    >
      {/* ---------- Formato ---------- */}
      <View style={styles.chips}>
        {chipFormato('pdf', 'PDF')}
        {chipFormato('excel', 'Excel')}
        {chipFormato('csv', 'CSV')}
      </View>

      {/* ---------- O arquivo ---------- */}
      <View style={[styles.arquivo, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
        <View style={[styles.arquivoIcone, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Icon name={sobre.icone} size={18} color={theme.primary} />
        </View>
        <View style={styles.arquivoTextos}>
          <Text style={[styles.arquivoNome, { color: theme.text }]} numberOfLines={1}>
            {nomeArquivo}
          </Text>
          <Text style={[styles.arquivoDetalhe, { color: theme.muted }]}>{sobre.explicacao}</Text>
        </View>
      </View>

      {/* ---------- Os numeros ---------- */}
      {bloco(
        'O que vai no arquivo',
        <View style={styles.numeros}>
          {cartaoNumero('Entradas', totais.entradas, theme.green, theme.greenSoft)}
          {cartaoNumero('Saídas', totais.saidas + totais.fixos + totais.parcelas, theme.red, theme.redSoft)}
          {cartaoNumero(
            'Resultado',
            totais.resultado,
            totais.resultado >= 0 ? theme.green : theme.red,
            theme.cardSoft,
            true
          )}
        </View>
      )}

      {/* ---------- O corpo, conforme o formato ---------- */}
      {formato === 'pdf' ? (
        <View style={styles.bloco}>
          <Text style={[styles.blocoTitulo, { color: theme.faint }]}>Como vai ficar</Text>
          <View style={[styles.pdf, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
            {pdfGerando ? (
              <View style={styles.centralizado}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.aguardando, { color: theme.muted }]}>Montando o relatório...</Text>
              </View>
            ) : pdfUri ? (
              <PdfPreview uri={pdfUri} theme={theme} nomeArquivo={nomeArquivo} style={styles.pdfInterno} />
            ) : (
              <View style={styles.centralizado}>
                <Text style={[styles.aguardando, { color: theme.muted }]}>
                  Não consegui montar a prévia agora, mas o botão abaixo ainda gera o arquivo.
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : formato === 'excel' ? (
        bloco('Abas da planilha', corpoDaPlanilha(abas))
      ) : (
        bloco(
          'Linhas do arquivo',
          <>
            {listaDeLinhas(
              csv.colunas.map((titulo) => ({
                titulo,
                formato: titulo === 'Valor' ? 'moeda' : undefined,
                principal: titulo === 'Descrição',
                // O dia sozinho e a data completa dizem a mesma coisa; na
                // linha da previa so a data cabe.
                escondida: titulo === 'Dia',
              })),
              // O CSV guarda o valor como texto ("−45,90") para o Excel ler
              // como numero; aqui ele volta a numero so para a previa poder
              // pintar de vermelho o que sai.
              csv.linhas.map((linha) => [
                ...linha.slice(0, -1),
                Number(String(linha[linha.length - 1]).replace(',', '.')),
              ]),
              undefined,
              'Nenhum lançamento neste mês.'
            )}
            {listaDeColunas(csv.colunas.map((titulo) => ({ titulo })))}
          </>
        )
      )}
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 7 },
  chip: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
  },
  chipTexto: { fontSize: 12, fontWeight: '800' },

  arquivo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 13,
    marginTop: 12,
  },
  arquivoIcone: {
    width: 40,
    height: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arquivoTextos: { flex: 1, minWidth: 0 },
  arquivoNome: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  arquivoDetalhe: { fontSize: 11, fontWeight: '500', marginTop: 3, lineHeight: 16 },

  bloco: { marginTop: 18 },
  blocoTitulo: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 2,
  },

  numeros: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  numero: {
    flexGrow: 1,
    flexBasis: '46%',
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  numeroLargo: { flexBasis: '100%' },
  numeroRotulo: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  numeroValor: { fontSize: 15, fontWeight: '800', marginTop: 4, letterSpacing: -0.3 },

  abas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  aba: {
    minHeight: 30,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abaTexto: { fontSize: 11, fontWeight: '800' },

  lista: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12 },
  linhaTextos: { flex: 1, minWidth: 0 },
  linhaTitulo: { fontSize: 12.5, fontWeight: '700', letterSpacing: -0.2 },
  linhaMeta: { fontSize: 10.5, fontWeight: '600', marginTop: 2 },
  linhaValor: { fontSize: 12, fontWeight: '800', letterSpacing: -0.2 },
  rodapeLista: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12, borderTopWidth: 1 },
  colunas: { fontSize: 10.5, fontWeight: '500', lineHeight: 15, marginTop: 8, paddingHorizontal: 2 },
  vazio: { fontSize: 12, fontWeight: '500', padding: 16, textAlign: 'center' },
  restantes: { fontSize: 11, fontWeight: '600', padding: 10, textAlign: 'center', borderTopWidth: 1 },

  pdf: { borderWidth: 1, borderRadius: 16, overflow: 'hidden', minHeight: 460 },
  pdfInterno: { minHeight: 460 },
  centralizado: { minHeight: 460, alignItems: 'center', justifyContent: 'center', padding: 22, gap: 10 },
  aguardando: { fontSize: 12, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
})
