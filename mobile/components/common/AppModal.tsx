import { type ReactNode, useEffect, useRef } from 'react'
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native'

type AppModalProps = {
  visible: boolean
  onClose: () => void
  children: ReactNode
}

export default function AppModal({ visible, onClose, children }: AppModalProps) {
  const translateY = useRef(new Animated.Value(0)).current
  const { height: windowHeight } = useWindowDimensions()

  useEffect(() => {
    if (!visible) {
      translateY.stopAnimation()
      translateY.setValue(0)
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

      Animated.timing(translateY, {
        toValue: -deslocamento,
        duration: Platform.OS === 'ios' ? 220 : 180,
        useNativeDriver: true,
      }).start()
    }

    const onKeyboardHide = () => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? 220 : 180,
        useNativeDriver: true,
      }).start()
    }

    const showSubscription = Keyboard.addListener(showEvent as any, onKeyboardShow)
    const hideSubscription = Keyboard.addListener(hideEvent as any, onKeyboardHide)

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [translateY, visible, windowHeight])

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdropTouch} onPress={onClose} />
        <KeyboardAvoidingView
          pointerEvents='box-none'
          style={styles.modalCenterWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
        >
          <Animated.View style={[styles.modalKeyboardWrap, { transform: [{ translateY }] }]}> 
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
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
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
  modalKeyboardWrap: {
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
