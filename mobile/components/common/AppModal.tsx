import { type ReactNode, useCallback, useEffect, useState } from 'react'
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { MODAL_SCALE_FROM, duration, easing, spring } from '../../src/theme/motion'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

type AppModalProps = {
  visible: boolean
  onClose: () => void
  children: ReactNode
  /**
   * Empilhamento. Modais que abrem por cima de outros — o calendario, por
   * exemplo, chamado de dentro de um formulario — precisam de um valor
   * maior para nao ficarem atras de quem os abriu.
   */
  level?: number
}

export default function AppModal({ visible, onClose, children, level = 0 }: AppModalProps) {
  /**
   * O <Modal> nativo desmonta na hora que `visible` vira false, o que mataria
   * a animacao de saida. Por isso mantemos um estado proprio: ele so desliga
   * depois que a animacao termina.
   */
  const [mounted, setMounted] = useState(visible)

  const progress = useSharedValue(visible ? 1 : 0)
  const keyboardOffset = useSharedValue(0)
  const { height: windowHeight } = useWindowDimensions()

  const unmount = useCallback(() => setMounted(false), [])

  useEffect(() => {
    if (visible) {
      setMounted(true)
      progress.value = withSpring(1, spring.gentle)
      return
    }

    progress.value = withTiming(
      0,
      { duration: duration.fast, easing: easing.accelerate },
      (finished) => {
        if (finished) runOnJS(unmount)()
      }
    )
  }, [progress, unmount, visible])

  useEffect(() => {
    if (!visible) {
      keyboardOffset.value = 0
      return
    }

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const onKeyboardShow = (event: any) => {
      const keyboardHeight = Number(event?.endCoordinates?.height || 0)
      const deslocamento = Math.min(
        Math.max(keyboardHeight * 0.022, 4),
        Math.min(12, windowHeight * 0.018)
      )

      keyboardOffset.value = withSpring(-deslocamento, spring.snappy)
    }

    const onKeyboardHide = () => {
      keyboardOffset.value = withSpring(0, spring.snappy)
    }

    const showSubscription = Keyboard.addListener(showEvent as any, onKeyboardShow)
    const hideSubscription = Keyboard.addListener(hideEvent as any, onKeyboardHide)

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [keyboardOffset, visible, windowHeight])

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }))

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: keyboardOffset.value + (1 - progress.value) * 18 },
      { scale: MODAL_SCALE_FROM + (1 - MODAL_SCALE_FROM) * progress.value },
    ],
  }))

  return (
    <Modal
      visible={mounted}
      transparent
      animationType='none'
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={[styles.modalOverlay, level > 0 && { zIndex: level }]}>
        <AnimatedPressable
          style={[styles.modalBackdropTouch, styles.modalBackdrop, backdropStyle]}
          onPress={onClose}
        />
        <KeyboardAvoidingView
          pointerEvents='box-none'
          style={styles.modalCenterWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
        >
          <Animated.View style={[styles.modalKeyboardWrap, cardStyle]}>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  modalCenterWrap: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(6, 14, 10, 0.62)',
  },
  modalKeyboardWrap: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
