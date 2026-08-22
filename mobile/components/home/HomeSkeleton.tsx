// Esqueleto da Home exibido enquanto os dados carregam.
//
// Espelha a estrutura real da tela (cabecalho, salario, saldo, par
// entradas/saidas e grafico) para que o conteudo apareca no lugar onde o
// usuario ja estava olhando, em vez de substituir um spinner centralizado.

import { View } from 'react-native'

import type { Tema } from '../../app/types'
import { styles } from '../../src/theme/homeStyles'
import Skeleton from '../common/motion/Skeleton'

export default function HomeSkeleton({ theme }: { theme: Tema }) {
  return (
    <View style={styles.scrollContent}>
      <View style={styles.topRow}>
        <Skeleton theme={theme} width={48} height={48} radius={999} />
        <View style={styles.topActions}>
          <Skeleton theme={theme} width={42} height={42} radius={999} />
          <Skeleton theme={theme} width={42} height={42} radius={999} />
          <Skeleton theme={theme} width={92} height={42} radius={999} />
        </View>
      </View>

      <View style={styles.selectorGroup}>
        <Skeleton theme={theme} height={62} radius={20} style={{ flex: 1 }} />
        <Skeleton theme={theme} height={62} radius={20} style={{ flex: 1 }} />
      </View>

      <Skeleton theme={theme} height={96} radius={24} style={{ marginBottom: 10 }} />
      <Skeleton theme={theme} height={112} radius={26} style={{ marginBottom: 10 }} />

      <View style={styles.summaryRow}>
        <Skeleton theme={theme} height={82} radius={20} style={{ flex: 1 }} />
        <Skeleton theme={theme} height={82} radius={20} style={{ flex: 1 }} />
      </View>

      <Skeleton theme={theme} height={210} radius={24} />
    </View>
  )
}
