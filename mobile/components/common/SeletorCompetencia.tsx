// Escolha de mes e ano.
//
// A versao anterior eram dois modais separados, cada um com uma lista longa:
// o de ano trazia um punhado fixo de anos e o de mes uma coluna de doze itens
// que deixava metade do modal vazia. Aqui os dois viram um so, no formato de
// calendario: o ano no cabecalho, com setas, e os doze meses em grade.
//
// A navegacao de ano nao tem fim — sempre da para avancar ou voltar — mas
// so um ano aparece por vez, entao nao existe lista de anos para percorrer.

import { useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import { meses } from '../../src/utils/dates'
import Icon from './Icon'
import ModalSheet from './ModalSheet'
import PressableScale from './motion/PressableScale'

const ABREVIADOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

type Props = {
  theme: Tema
  visible: boolean
  onClose: () => void
  /** Mes atualmente selecionado, por nome completo. */
  mes: string
  ano: number
  onSelecionar: (mes: string, ano: number) => void
  /** Competencias que ja tem lancamentos, no formato "2026-Agosto". */
  competenciasComDados: string[]
  /** Mes corrente do calendario, para o atalho "hoje". */
  mesAtual: string
  anoAtual: number
}

export default function SeletorCompetencia({
  theme,
  visible,
  onClose,
  mes,
  ano,
  onSelecionar,
  competenciasComDados,
  mesAtual,
  anoAtual,
}: Props) {
  // O ano em exibicao acompanha o selecionado, mas o usuario pode folhear
  // sem escolher nada ainda.
  const [anoVisivel, setAnoVisivel] = useState(ano)

  const comDados = useMemo(() => new Set(competenciasComDados), [competenciasComDados])

  // Reposiciona ao reabrir num ano diferente.
  const [ultimoAnoAberto, setUltimoAnoAberto] = useState(ano)
  if (visible && ultimoAnoAberto !== ano) {
    setUltimoAnoAberto(ano)
    setAnoVisivel(ano)
  }

  const ehHoje = (indice: number) => anoVisivel === anoAtual && meses[indice] === mesAtual

  return (
    <ModalSheet
      theme={theme}
      visible={visible}
      onClose={onClose}
      titulo="Escolher período"
      level={2}
    >
      {/* Ano, com navegacao sem fim */}
      <View style={styles.cabecalho}>
        <PressableScale
          onPress={() => setAnoVisivel((a) => a - 1)}
          scaleTo={0.88}
          style={[styles.seta, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          accessibilityLabel="Ano anterior"
        >
          <Icon name="seta_esquerda" size={17} color={theme.text} />
        </PressableScale>

        <Text style={[styles.ano, { color: theme.text }]}>{anoVisivel}</Text>

        <PressableScale
          onPress={() => setAnoVisivel((a) => a + 1)}
          scaleTo={0.88}
          style={[styles.seta, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          accessibilityLabel="Próximo ano"
        >
          <Icon name="seta_direita" size={17} color={theme.text} />
        </PressableScale>
      </View>

      {/* Doze meses em grade: cabem todos sem rolagem e sem sobra */}
      <View style={styles.grade}>
        {ABREVIADOS.map((abreviado, indice) => {
          const nomeCompleto = meses[indice]
          const selecionado = anoVisivel === ano && nomeCompleto === mes
          const temDados = comDados.has(`${anoVisivel}-${nomeCompleto}`)
          const hoje = ehHoje(indice)

          return (
            <PressableScale
              key={abreviado}
              onPress={() => {
                onSelecionar(nomeCompleto, anoVisivel)
                onClose()
              }}
              scaleTo={0.93}
              style={[
                styles.mes,
                {
                  backgroundColor: selecionado ? theme.primary : theme.cardSoft,
                  borderColor: selecionado
                    ? theme.primary
                    : hoje
                      ? theme.accent
                      : theme.border,
                  borderWidth: hoje && !selecionado ? 1.5 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.mesTexto,
                  { color: selecionado ? theme.textInverse : hoje ? theme.accent : theme.text },
                ]}
              >
                {abreviado}
              </Text>

              {/* Ponto discreto marca os meses que ja tem lancamentos */}
              {temDados && !selecionado ? (
                <View style={[styles.ponto, { backgroundColor: theme.green }]} />
              ) : null}
            </PressableScale>
          )
        })}
      </View>

      <View style={styles.legenda}>
        <View style={styles.legendaItem}>
          <View style={[styles.pontoLegenda, { backgroundColor: theme.green }]} />
          <Text style={[styles.legendaTexto, { color: theme.muted }]}>tem lançamentos</Text>
        </View>
        <View style={styles.legendaItem}>
          <View style={[styles.anelLegenda, { borderColor: theme.accent }]} />
          <Text style={[styles.legendaTexto, { color: theme.muted }]}>mês atual</Text>
        </View>
      </View>

      {(anoVisivel !== anoAtual || mes !== mesAtual) ? (
        <PressableScale
          onPress={() => {
            onSelecionar(mesAtual, anoAtual)
            onClose()
          }}
          style={[styles.hoje, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}
        >
          <Icon name="calendario" size={15} color={theme.accent} />
          <Text style={[styles.hojeTexto, { color: theme.accent }]}>
            Ir para {mesAtual} de {anoAtual}
          </Text>
        </PressableScale>
      ) : null}
    </ModalSheet>
  )
}

const styles = StyleSheet.create({
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  seta: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ano: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },

  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mes: {
    flexGrow: 1,
    flexBasis: '28%',
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  mesTexto: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  ponto: { width: 5, height: 5, borderRadius: 999 },

  legenda: { flexDirection: 'row', gap: 16, marginTop: 16, justifyContent: 'center' },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pontoLegenda: { width: 6, height: 6, borderRadius: 999 },
  anelLegenda: { width: 10, height: 10, borderRadius: 3, borderWidth: 1.5 },
  legendaTexto: { fontSize: 10, fontWeight: '600' },

  hoje: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  hojeTexto: { fontSize: 13, fontWeight: '800' },
})
