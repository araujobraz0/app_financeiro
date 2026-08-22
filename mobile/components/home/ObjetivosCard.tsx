import { memo } from 'react'
import { Text, View } from 'react-native'
import type { GoalItem, Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import PressableScale from '../common/motion/PressableScale'

type ObjetivosCardProps = {
  theme: Tema
  objetivos: GoalItem[]
  formatarValorVisivel: (valor: number) => string
  onNovo: () => void
  onEditar: (goal: GoalItem) => void
  onExcluir: (id: string, titulo: string) => void
}

/**
 * Metas de valor com barra de progresso.
 */
function ObjetivosCard({
  theme,
  objetivos,
  formatarValorVisivel,
  onNovo,
  onEditar,
  onExcluir,
}: ObjetivosCardProps) {
  return (
    <View style={[styles.manageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.manageHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.manageTitle, { color: theme.text }]}>Objetivos</Text>
          <Text style={[styles.manageSub, { color: theme.muted }]}>Acompanhe metas e progresso.</Text>
        </View>
        <PressableScale onPress={onNovo} style={[styles.smallActionBtn, { backgroundColor: theme.primary }]}>
          <Text style={[styles.smallActionBtnText, { color: theme.white }]}>+ Objetivo</Text>
        </PressableScale>
      </View>

      {objetivos.length === 0 ? (
        <View style={[styles.emptyChart, { backgroundColor: theme.cardSoft }]}>
          <Text style={[styles.emptyChartText, { color: theme.muted }]}>Nenhum objetivo criado.</Text>
        </View>
      ) : (
        objetivos.map((goal) => {
          const progresso = goal.alvo > 0 ? Math.min((goal.atual / goal.alvo) * 100, 100) : 0

          return (
            <View key={goal.id} style={[styles.fullRowCard, { borderColor: theme.border, backgroundColor: theme.cardSoft }]}>
              <View style={styles.fullRowTop}>
                <View style={styles.fullRowTitleWrap}>
                  <Text style={[styles.rowItemTitle, { color: theme.text }]}>{goal.titulo}</Text>
                  <Text style={[styles.rowItemMeta, { color: theme.muted }]}>
                    Atual {formatarValorVisivel(goal.atual)} de {formatarValorVisivel(goal.alvo)}
                  </Text>
                </View>
                <View style={styles.inlineActions}>
                  <PressableScale onPress={() => onEditar(goal)} style={styles.iconBtn}>
                    <Text style={[styles.iconBtnText, { color: theme.text }]}>✎</Text>
                  </PressableScale>
                  <PressableScale onPress={() => onExcluir(goal.id, goal.titulo)} style={styles.iconBtn}>
                    <Text style={[styles.iconBtnText, { color: theme.red }]}>×</Text>
                  </PressableScale>
                </View>
              </View>
              <View style={[styles.compareBarTrack, { backgroundColor: theme.card, borderColor: theme.border, marginTop: 10 }]}>
                <View style={[styles.compareBarFill, { width: `${Math.max(4, progresso)}%` as const, backgroundColor: theme.blue }]} />
              </View>
            </View>
          )
        })
      )}
    </View>
  )
}

export default memo(ObjetivosCard)
