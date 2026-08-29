// "Instalar" — o convite para colocar o app na tela inicial.
//
// Fica ao lado do selo de premium, no mesmo formato de pilula, porque os dois
// dizem a mesma classe de coisa: o estado do app para aquela pessoa. Some
// sozinho depois de instalado, e nem chega a aparecer onde o navegador nao
// permite instalar.

import { StyleSheet, Text, View } from 'react-native'

import type { Tema } from '../../app/types'
import Icon from '../common/Icon'
import PressableScale from '../common/motion/PressableScale'

type Props = {
  theme: Tema
  onPress: () => void
}

export default function BotaoInstalar({ theme, onPress }: Props) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel="Instalar o Brazllet na tela inicial"
      style={[styles.pilula, { backgroundColor: theme.primary, borderColor: theme.primary }]}
    >
      <View style={[styles.selo, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
        <Icon name="importar" size={9} color={theme.textInverse} />
      </View>
      <Text style={[styles.texto, { color: theme.textInverse }]} numberOfLines={1}>
        Instalar
      </Text>
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  pilula: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 24,
    paddingLeft: 4,
    paddingRight: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  selo: {
    width: 17,
    height: 17,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.2, textTransform: 'uppercase' },
})
