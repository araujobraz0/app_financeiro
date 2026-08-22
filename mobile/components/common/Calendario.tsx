// Calendario mensal.
//
// A versao anterior era uma tira horizontal com os numeros dos meses e uma
// grade solta de dias, sem semanas — ou seja, nao dava para ver em que dia da
// semana algo cai, que e metade da razao de existir um calendario. Aqui os
// dias ficam alinhados por coluna de semana, com o dia de hoje marcado.

import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import Icon from './Icon'
import PressableScale from './motion/PressableScale'

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

type Props = {
  theme: Tema
  /** 1 a 12. */
  mes: number
  ano: number
  /** Dia selecionado, 1 a 31. */
  dia: number
  onSelecionar: (dia: number, mes: number) => void
  onMudarMes: (mes: number) => void
}

export default function Calendario({ theme, mes, ano, dia, onSelecionar, onMudarMes }: Props) {
  const hoje = useMemo(() => new Date(), [])
  const ehMesDeHoje = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes

  const { semanas, totalDias } = useMemo(() => {
    const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay()
    const dias = new Date(ano, mes, 0).getDate()

    // Celulas vazias antes do dia 1, para alinhar a coluna do dia da semana.
    const celulas: (number | null)[] = Array.from({ length: primeiroDiaSemana }, () => null)
    for (let d = 1; d <= dias; d += 1) celulas.push(d)
    while (celulas.length % 7 !== 0) celulas.push(null)

    const linhas: (number | null)[][] = []
    for (let i = 0; i < celulas.length; i += 7) linhas.push(celulas.slice(i, i + 7))

    return { semanas: linhas, totalDias: dias }
  }, [ano, mes])

  const mudar = (passo: -1 | 1) => {
    const alvo = mes + passo
    if (alvo < 1) onMudarMes(12)
    else if (alvo > 12) onMudarMes(1)
    else onMudarMes(alvo)
  }

  return (
    <View>
      <View style={styles.cabecalho}>
        <PressableScale
          onPress={() => mudar(-1)}
          scaleTo={0.88}
          style={[styles.seta, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          accessibilityLabel="Mês anterior"
        >
          <Icon name="seta_esquerda" size={16} color={theme.text} />
        </PressableScale>

        <Text style={[styles.mesTitulo, { color: theme.text }]}>
          {MESES[mes - 1]} <Text style={{ color: theme.muted }}>{ano}</Text>
        </Text>

        <PressableScale
          onPress={() => mudar(1)}
          scaleTo={0.88}
          style={[styles.seta, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
          accessibilityLabel="Próximo mês"
        >
          <Icon name="seta_direita" size={16} color={theme.text} />
        </PressableScale>
      </View>

      <View style={styles.linhaSemana}>
        {DIAS_SEMANA.map((letra, indice) => (
          <Text key={`${letra}-${indice}`} style={[styles.letraSemana, { color: theme.faint }]}>
            {letra}
          </Text>
        ))}
      </View>

      {semanas.map((semana, indiceSemana) => (
        <View key={indiceSemana} style={styles.semana}>
          {semana.map((numero, indiceDia) => {
            if (numero === null) {
              return <View key={`vazio-${indiceDia}`} style={styles.celula} />
            }

            const selecionado = numero === dia
            const ehHoje = ehMesDeHoje && numero === hoje.getDate()

            return (
              <PressableScale
                key={numero}
                onPress={() => onSelecionar(numero, mes)}
                scaleTo={0.9}
                style={styles.celula}
              >
                <View
                  style={[
                    styles.dia,
                    selecionado && { backgroundColor: theme.primary },
                    !selecionado && ehHoje && { borderWidth: 1.5, borderColor: theme.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.diaTexto,
                      {
                        color: selecionado
                          ? theme.textInverse
                          : ehHoje
                            ? theme.accent
                            : theme.text,
                      },
                    ]}
                  >
                    {numero}
                  </Text>
                </View>
              </PressableScale>
            )
          })}
        </View>
      ))}

      <Text style={[styles.rodape, { color: theme.muted }]}>
        {totalDias} dias neste mês
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  seta: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mesTitulo: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },

  linhaSemana: { flexDirection: 'row', marginBottom: 6 },
  letraSemana: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  semana: { flexDirection: 'row' },
  celula: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  dia: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaTexto: { fontSize: 14, fontWeight: '700' },

  rodape: { fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 12 },
})
