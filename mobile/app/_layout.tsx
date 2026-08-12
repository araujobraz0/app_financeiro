import { useCallback, useEffect, useRef, useState } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import {
  ActivityIndicator,
  Animated,
  AppState,
  Easing,
  ImageBackground,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import * as Updates from 'expo-updates'
import Constants from 'expo-constants'
import { supabase } from '../src/lib/supabase'

SplashScreen.preventAutoHideAsync()

SplashScreen.setOptions({
  duration: 800,
  fade: true,
})

type AppVersionRow = {
  platform: string
  latest_version: string | null
  minimum_version: string | null
  apk_url: string | null
  message: string | null
  force_update: boolean | null
}

function compareVersions(currentVersion: string, latestVersion: string) {
  const currentParts = currentVersion.split('.').map((part) => Number(part) || 0)
  const latestParts = latestVersion.split('.').map((part) => Number(part) || 0)
  const maxLength = Math.max(currentParts.length, latestParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const currentValue = currentParts[index] ?? 0
    const latestValue = latestParts[index] ?? 0

    if (latestValue > currentValue) return 1
    if (latestValue < currentValue) return -1
  }

  return 0
}

export default function RootLayout() {
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [appReady, setAppReady] = useState(false)
  const [showVisualSplash, setShowVisualSplash] = useState(true)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const [apkUpdate, setApkUpdate] = useState<AppVersionRow | null>(null)
  const [otaUpdateVisible, setOtaUpdateVisible] = useState(false)
  const [otaUpdateLoading, setOtaUpdateLoading] = useState(false)

  const segments = useSegments()
  const colorScheme = useColorScheme()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const appStateRef = useRef(AppState.currentState)
  const lastApkCheckRef = useRef<number>(0)
  const lastOtaCheckRef = useRef<number>(0)

  const splashImage =
    colorScheme === 'dark'
      ? require('../assets/images/splash-dark.png')
      : require('../assets/images/splash-light.png')

  const currentVersion = Constants.expoConfig?.version ?? '1.0.0'

  const checkForOtaUpdate = useCallback(async () => {
    if (__DEV__) return
    if (checkingUpdate) return

    const now = Date.now()
    if (now - lastOtaCheckRef.current < 1000 * 60 * 10) return
    lastOtaCheckRef.current = now

    try {
      setCheckingUpdate(true)
      const update = await Updates.checkForUpdateAsync()

      if (update.isAvailable) {
        setOtaUpdateVisible(true)
      }
    } catch (error) {
      console.log('Erro ao verificar atualização OTA:', error)
    } finally {
      setCheckingUpdate(false)
    }
  }, [checkingUpdate])

  const applyOtaUpdate = useCallback(async () => {
    try {
      setOtaUpdateLoading(true)
      await Updates.fetchUpdateAsync()
      await Updates.reloadAsync()
    } catch (error) {
      console.log('Erro ao aplicar atualização OTA:', error)
      setOtaUpdateLoading(false)
      setOtaUpdateVisible(false)
    }
  }, [])

  const checkForApkUpdate = useCallback(async () => {
    const now = Date.now()
    if (now - lastApkCheckRef.current < 1000 * 60 * 30) return
    lastApkCheckRef.current = now

    try {
      const { data, error } = await supabase
        .from('app_versions')
        .select('platform, latest_version, minimum_version, apk_url, message, force_update')
        .eq('platform', 'android')
        .maybeSingle()

      if (error || !data?.latest_version || !data?.apk_url) return

      const hasNewerVersion = compareVersions(currentVersion, data.latest_version) > 0

      if (hasNewerVersion) {
        setApkUpdate(data)
      }
    } catch (error) {
      console.log('Erro ao verificar atualização APK:', error)
    }
  }, [currentVersion])

  const openApkLink = useCallback(async () => {
    if (!apkUpdate?.apk_url) return

    try {
      await Linking.openURL(apkUpdate.apk_url)
    } catch (error) {
      console.log('Erro ao abrir link do APK:', error)
    }
  }, [apkUpdate])

  useEffect(() => {
    let mounted = true

    const syncSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (!mounted) return

      if (
        error?.message?.includes('Invalid Refresh Token') ||
        error?.message?.includes('Refresh Token Not Found')
      ) {
        await supabase.auth.signOut()
        setIsLoggedIn(false)
        setLoading(false)
        return
      }

      setIsLoggedIn(!!session)
      setLoading(false)
    }

    syncSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return
      setIsLoggedIn(!!session)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (loading) return

    const currentRoute = segments[segments.length - 1]

    if (!isLoggedIn && currentRoute !== 'login') {
      router.replace('/login')
      return
    }

    if (
      isLoggedIn &&
      !['home', 'primeiro-acesso', 'premium', 'reset-password', 'callback'].includes(
        String(currentRoute)
      )
    ) {
      router.replace('/home')
      return
    }

    setAppReady(true)
  }, [isLoggedIn, loading, segments])

  useEffect(() => {
    if (!appReady) return

    const prepare = async () => {
      await SplashScreen.hideAsync()

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start()

      setTimeout(() => {
        setShowVisualSplash(false)
      }, 1700)
    }

    prepare()
  }, [appReady, fadeAnim])

  useEffect(() => {
    if (!appReady || showVisualSplash) return

    checkForOtaUpdate()
    checkForApkUpdate()

    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasInactive = appStateRef.current.match(/inactive|background/)
      const isActive = nextState === 'active'

      appStateRef.current = nextState

      if (wasInactive && isActive) {
        checkForOtaUpdate()
        checkForApkUpdate()
      }
    })

    return () => subscription.remove()
  }, [appReady, checkForApkUpdate, checkForOtaUpdate, showVisualSplash])

  if (loading || !appReady) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#34d399" />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.appContainer, { opacity: fadeAnim }]}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="primeiro-acesso" />
          <Stack.Screen name="home" />
          <Stack.Screen name="premium" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="auth/callback" />
        </Stack>
      </Animated.View>

      {showVisualSplash ? (
        <ImageBackground source={splashImage} style={styles.visualSplash} resizeMode="cover" />
      ) : null}

      <Modal visible={otaUpdateVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.updateCard}>
            <Text style={styles.updateIcon}>✨</Text>
            <Text style={styles.updateTitle}>Atualização disponível</Text>
            <Text style={styles.updateText}>
              Há melhorias prontas para o Brazllet. Atualize agora para usar a versão mais recente.
            </Text>

            <Pressable
              style={[styles.primaryButton, otaUpdateLoading && styles.disabledButton]}
              onPress={applyOtaUpdate}
              disabled={otaUpdateLoading}
            >
              <Text style={styles.primaryButtonText}>
                {otaUpdateLoading ? 'Atualizando...' : 'Atualizar agora'}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={() => setOtaUpdateVisible(false)}>
              <Text style={styles.secondaryButtonText}>Depois</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!apkUpdate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.updateCard}>
            <Text style={styles.updateIcon}>⬆️</Text>
            <Text style={styles.updateTitle}>Nova versão do Brazllet</Text>
            <Text style={styles.updateText}>
              {apkUpdate?.message ||
                'Uma nova versão do APK está disponível com melhorias e correções.'}
            </Text>
            <Text style={styles.versionText}>
              Versão instalada: {currentVersion} • Nova versão: {apkUpdate?.latest_version}
            </Text>

            <Pressable style={styles.primaryButton} onPress={openApkLink}>
              <Text style={styles.primaryButtonText}>Atualizar agora</Text>
            </Pressable>

            {!apkUpdate?.force_update ? (
              <Pressable style={styles.secondaryButton} onPress={() => setApkUpdate(null)}>
                <Text style={styles.secondaryButtonText}>Depois</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  visualSplash: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    zIndex: 50,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  updateCard: {
    width: '88%',
    maxWidth: 390,
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  updateIcon: {
    fontSize: 34,
    textAlign: 'center',
    marginBottom: 10,
  },
  updateTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  updateText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 14,
  },
  versionText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  secondaryButton: {
    minHeight: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.65,
  },
})
