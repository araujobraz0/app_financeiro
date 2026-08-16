import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { supabase } from '../src/lib/supabase'
import { darkTheme, lightTheme, THEME_KEY, THEME_MODE_KEY } from '../src/theme/themes'
import { formatarMoeda } from '../src/utils/currency'
import type { PremiumEntitlement, SettingsThemeMode, Tema } from './types'

type PixResponse = {
  payment_id: string
  amount: number
  status: string
  qr_code: string | null
  qr_code_base64: string | null
  ticket_url: string | null
  expires_at: string | null
}

type AppPopupProps = {
  visible: boolean
  title: string
  description: string
  primaryText?: string
  secondaryText?: string
  onPrimary?: () => void
  onSecondary?: () => void
  theme: Tema
}

function AppPopup({
  visible,
  title,
  description,
  primaryText = 'OK',
  secondaryText,
  onPrimary,
  onSecondary,
  theme,
}: AppPopupProps) {
  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onPrimary} statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdropTouch} onPress={onPrimary} />
        <View style={styles.modalCenterWrap}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                shadowColor: theme.shadow,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.modalDescription, { color: theme.muted }]}>{description}</Text>

            <View style={styles.modalActions}>
              {secondaryText ? (
                <Pressable
                  onPress={onSecondary}
                  style={[
                    styles.modalActionBtn,
                    {
                      backgroundColor: theme.cardSoft,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.modalActionText, { color: theme.text }]}>{secondaryText}</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={onPrimary}
                style={[
                  styles.modalActionBtn,
                  {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
              >
                <Text style={[styles.modalActionText, { color: theme.white }]}>{primaryText}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default function PremiumScreen() {
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [creatingPix, setCreatingPix] = useState(false)

  const [premiumAtivo, setPremiumAtivo] = useState(false)
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null)
  const [pixData, setPixData] = useState<PixResponse | null>(null)
  const [onboardingPending, setOnboardingPending] = useState(false)

  const [temaEscuro, setTemaEscuro] = useState(false)
  const [themeMode, setThemeMode] = useState<SettingsThemeMode>('manual')

  const [popupVisible, setPopupVisible] = useState(false)
  const [popupTitle, setPopupTitle] = useState('')
  const [popupDescription, setPopupDescription] = useState('')

  const theme = temaEscuro ? darkTheme : lightTheme

  const premiumValido = useMemo(() => {
    if (!premiumAtivo || !premiumExpiresAt) return false
    return new Date(premiumExpiresAt).getTime() > Date.now()
  }, [premiumAtivo, premiumExpiresAt])

  const premiumStatusTexto = useMemo(() => {
    if (!premiumExpiresAt || !premiumValido) {
      return 'Seu premium ainda não está ativo. Gere um Pix e desbloqueie todas as ações do Brazllet.'
    }

    const data = new Date(premiumExpiresAt)
    return `Premium ativo até ${data.toLocaleDateString('pt-BR')} às ${data.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })}.`
  }, [premiumExpiresAt, premiumValido])

  const mostrarPopup = useCallback((title: string, description: string) => {
    setPopupTitle(title)
    setPopupDescription(description)
    setPopupVisible(true)
  }, [])

  useEffect(() => {
    const carregarTema = async () => {
      const temaSalvo = await AsyncStorage.getItem(THEME_KEY)
      const modoTemaSalvo = await AsyncStorage.getItem(THEME_MODE_KEY)

      if (modoTemaSalvo === 'system') {
        setThemeMode('system')
        setTemaEscuro(colorScheme === 'dark')
      } else if (temaSalvo) {
        setThemeMode('manual')
        setTemaEscuro(temaSalvo === 'dark')
      } else {
        setThemeMode('manual')
        setTemaEscuro(false)
      }
    }

    carregarTema()
  }, [colorScheme])

  useEffect(() => {
    if (themeMode === 'system') {
      setTemaEscuro(colorScheme === 'dark')
    }
    AsyncStorage.setItem(THEME_MODE_KEY, themeMode)
  }, [themeMode, colorScheme])

  useEffect(() => {
    if (themeMode === 'manual') {
      AsyncStorage.setItem(THEME_KEY, temaEscuro ? 'dark' : 'light')
    }
  }, [temaEscuro, themeMode])

  const carregarStatusPremium = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const [{ data: entitlementData }, { data: financialData }] = await Promise.all([
        supabase
          .from('user_entitlements')
          .select('premium_active, premium_expires_at')
          .eq('user_id', user.id)
          .maybeSingle<PremiumEntitlement>(),
        supabase
          .from('financial_data')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])

      const ativo =
        !!entitlementData?.premium_active &&
        !!entitlementData?.premium_expires_at &&
        new Date(entitlementData.premium_expires_at).getTime() > Date.now()

      setPremiumAtivo(ativo)
      setPremiumExpiresAt(entitlementData?.premium_expires_at ?? null)
      setOnboardingPending(!financialData)
    } catch {
      setPremiumAtivo(false)
      setPremiumExpiresAt(null)
      setOnboardingPending(false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregarStatusPremium()
  }, [carregarStatusPremium])

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true)
      await carregarStatusPremium()
    } finally {
      setRefreshing(false)
    }
  }, [carregarStatusPremium])

  const handleCreatePix = useCallback(async () => {
    try {
      setCreatingPix(true)

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        mostrarPopup('Sessão inválida', 'Faça login novamente para gerar o Pix do seu premium.')
        return
      }

      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: {},
      })

      if (error) {
        const details =
          typeof error.context === 'string'
            ? error.context
            : JSON.stringify(error.context ?? {})

        throw new Error(details || error.message || 'Não foi possível gerar o Pix.')
      }

      setPixData(data as PixResponse)
      mostrarPopup('Pix gerado', 'Seu QR Code e o código copia e cola já estão prontos para pagamento.')
    } catch (error) {
      mostrarPopup(
        'Erro',
        error instanceof Error ? error.message : 'Não foi possível gerar o Pix agora.'
      )
    } finally {
      setCreatingPix(false)
    }
  }, [mostrarPopup])


  const handleStartFreeTrial = useCallback(async () => {
    try {
      const {
        data: { user, session },
      } = await supabase.auth.getUser().then(async ({ data, error }) => {
        if (error) throw error
        const {
          data: { session },
        } = await supabase.auth.getSession()
        return { data: { user: data.user, session } }
      })

      if (!user || !session) {
        mostrarPopup('Sessão inválida', 'Faça login novamente para ativar seu teste grátis.')
        return
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      const { error } = await supabase.from('user_entitlements').upsert(
        {
          user_id: user.id,
          premium_active: true,
          premium_expires_at: expiresAt,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

      if (error) {
        throw error
      }

      setPremiumAtivo(true)
      setPremiumExpiresAt(expiresAt)

      if (onboardingPending) {
        router.replace('/primeiro-acesso')
        return
      }
    } catch (error) {
      mostrarPopup(
        'Erro',
        error instanceof Error ? error.message : 'Não foi possível ativar o teste grátis agora.'
      )
    }
  }, [mostrarPopup, onboardingPending])

  const handleCopyPix = useCallback(async () => {
    if (!pixData?.qr_code) {
      mostrarPopup('Código indisponível', 'Ainda não existe um código Pix para copiar.')
      return
    }

    try {
      await Clipboard.setStringAsync(pixData.qr_code)
      mostrarPopup('Código copiado', 'O código Pix foi copiado com sucesso.')
    } catch {
      mostrarPopup('Erro', 'Não foi possível copiar o código Pix.')
    }
  }, [pixData, mostrarPopup])

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style={temaEscuro ? 'light' : 'dark'} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size='large' color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Carregando Premium...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar style={temaEscuro ? 'light' : 'dark'} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 10,
          paddingBottom: 28 + Math.max(insets.bottom, 10),
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backCircle, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.backCircleText, { color: theme.text }]}>←</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              setThemeMode('manual')
              setTemaEscuro((prev) => !prev)
            }}
            style={[styles.themeCircle, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.themeCircleText, { color: theme.text }]}>{temaEscuro ? '☀' : '☾'}</Text>
          </Pressable>
        </View>

        <View style={[styles.heroCard, { backgroundColor: theme.card, borderColor: theme.border, shadowColor: theme.shadow }]}>
          <View style={[styles.heroGlow, { backgroundColor: theme.backgroundSoft, borderColor: theme.borderStrong }]}>
            <Image source={require('../assets/images/icon-removebg.png')} style={styles.heroIcon} resizeMode='contain' />
          </View>

          <Text style={[styles.eyebrow, { color: theme.primary }]}>BRAZLLET PREMIUM</Text>
          <Text style={[styles.heroTitle, { color: theme.text }]}>Seu controle financeiro no nível premium</Text>
          <Text style={[styles.heroSub, { color: theme.muted }]}>
            Desbloqueie edição, importação, exportação e toda a experiência completa do Brazllet.
          </Text>

          <View style={styles.heroBadgeRow}>
            <View style={[styles.heroBadge, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.heroBadgeText, { color: theme.text }]}>R$ 6,90 / mês</Text>
            </View>
            <View
              style={[
                styles.heroBadge,
                {
                  backgroundColor: premiumValido ? theme.green : theme.cardSoft,
                  borderColor: premiumValido ? theme.green : theme.border,
                },
              ]}
            >
              <Text style={[styles.heroBadgeText, { color: premiumValido ? theme.white : theme.text }]}>
                {premiumValido ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </View>
        </View>


        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.appOverviewHeader}>
            <View style={[styles.appOverviewIconWrap, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.appOverviewIcon, { color: theme.primary }]}>✓</Text>
            </View>
            <View style={styles.appOverviewTitleWrap}>
              <Text style={[styles.sectionTitle, styles.appOverviewTitle, { color: theme.text }]}>O que o Brazllet possui</Text>
              <Text style={[styles.sectionDescription, { color: theme.muted }]}>
                Um app completo para organizar sua vida financeira em um só lugar, de forma simples e visual.
              </Text>
            </View>
          </View>

          <View style={styles.appOverviewGrid}>
            {[
              'Entradas e saídas',
              'Gastos fixos',
              'Cartões e parcelas',
              'Metas e objetivos',
              'Investimentos',
              'Pix e anotações',
              'Coisas para comprar',
              'Importação e exportação',
            ].map((item) => (
              <View key={item} style={[styles.appOverviewPill, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text style={[styles.appOverviewPillText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Seu status</Text>
          <Text style={[styles.sectionDescription, { color: theme.muted }]}>{premiumStatusTexto}</Text>

          <View style={styles.statusGrid}>
            <View style={[styles.statusPill, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.statusLabel, { color: theme.muted }]}>Plano</Text>
              <Text style={[styles.statusValue, { color: theme.text }]}>Mensal</Text>
            </View>

            <View style={[styles.statusPill, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.statusLabel, { color: theme.muted }]}>Valor</Text>
              <Text style={[styles.statusValue, { color: theme.text }]}>{formatarMoeda(6.9)}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>O que o Premium libera</Text>

          <View style={styles.featureList}>
            {[
              'Adicionar e editar informações sem bloqueio',
              'Excluir lançamentos, cartões, notas e categorias',
              'Importar e exportar arquivos com identidade Brazllet',
              'Experiência completa para organizar tudo no app',
            ].map((item) => (
              <View key={item} style={[styles.featureItem, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text style={[styles.featureBullet, { color: theme.primary }]}>✦</Text>
                <Text style={[styles.featureText, { color: theme.text }]}>{item}</Text>
              </View>
            ))}
          </View>
        </View>


        {onboardingPending && !premiumValido ? (
          <Pressable
            onPress={handleStartFreeTrial}
            style={[
              styles.trialButton,
              { backgroundColor: theme.card, borderColor: theme.primary, shadowColor: theme.shadow },
            ]}
          >
            <Text style={[styles.trialButtonText, { color: theme.primary }]}>Usar 7 dias grátis</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={handleCreatePix}
          disabled={creatingPix}
          style={[
            styles.ctaButton,
            { backgroundColor: theme.primary, shadowColor: theme.shadow },
            creatingPix ? styles.ctaButtonDisabled : null,
          ]}
        >
          <Text style={[styles.ctaButtonText, { color: theme.white }]}>
            {creatingPix ? 'Gerando Pix...' : 'Gerar Pix de R$ 6,90'}
          </Text>
        </Pressable>

        {pixData ? (
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Pague com Pix</Text>
            <Text style={[styles.sectionDescription, { color: theme.muted }]}>
              Use o QR Code abaixo ou copie o código Pix para concluir seu pagamento.
            </Text>

            {pixData.qr_code_base64 ? (
              <View style={[styles.qrWrap, { backgroundColor: theme.white, borderColor: theme.border }]}>
                <Image
                  source={{ uri: `data:image/png;base64,${pixData.qr_code_base64}` }}
                  style={styles.qrImage}
                  resizeMode='contain'
                />
              </View>
            ) : null}

            <Text style={[styles.pixCodeLabel, { color: theme.muted }]}>Código copia e cola</Text>
            <View style={[styles.pixCodeBox, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
              <Text style={[styles.pixCodeText, { color: theme.text }]}>{pixData.qr_code || 'Código indisponível.'}</Text>
            </View>

            <Pressable
              onPress={handleCopyPix}
              style={[styles.secondaryButton, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
            >
              <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Copiar código Pix</Text>
            </Pressable>

            {pixData.expires_at ? (
              <Text style={[styles.expireText, { color: theme.muted }]}>
                Expira em: {new Date(pixData.expires_at).toLocaleString('pt-BR')}
              </Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <AppPopup
        visible={popupVisible}
        title={popupTitle}
        description={popupDescription}
        onPrimary={() => setPopupVisible(false)}
        theme={theme}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },

  loadingText: {
    fontSize: 16,
    fontWeight: '700',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  backCircleText: {
    fontSize: 21,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: -5,
  },

  themeCircle: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  themeCircleText: {
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 18,
  },

  heroCard: {
    borderWidth: 1,
    borderRadius: 28,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  heroGlow: {
    width: 92,
    height: 92,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 14,
  },

  heroIcon: {
    width: 68,
    height: 68,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
  },

  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 30,
  },

  heroSub: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
  },

  heroBadgeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },

  heroBadge: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },

  sectionCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },

  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },


  appOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },

  appOverviewIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  appOverviewIcon: {
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
  },

  appOverviewTitleWrap: {
    flex: 1,
  },

  appOverviewTitle: {
    marginBottom: 6,
  },

  appOverviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },

  appOverviewPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 12,
  },

  appOverviewPillText: {
    fontSize: 12,
    fontWeight: '800',
  },

  statusGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },

  statusPill: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },

  statusLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  statusValue: {
    fontSize: 17,
    fontWeight: '900',
  },

  featureList: {
    gap: 10,
    marginTop: 4,
  },

  featureItem: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  featureBullet: {
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
    marginTop: -1,
  },

  featureText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },

  ctaButton: {
    minHeight: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },

  ctaButtonDisabled: {
    opacity: 0.75,
  },

  ctaButtonText: {
    fontSize: 17,
    fontWeight: '900',
  },

  qrWrap: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 10,
    marginTop: 12,
    marginBottom: 14,
  },

  qrImage: {
    width: '100%',
    height: 270,
  },

  pixCodeLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  pixCodeBox: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },

  pixCodeText: {
    fontSize: 13,
    lineHeight: 20,
  },

  secondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },

  expireText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 18,
  },

  onboardingHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 19,
  },

  trialButton: {
    minHeight: 54,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },

  trialButtonText: {
    fontSize: 16,
    fontWeight: '900',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },

  modalBackdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },

  modalCenterWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },

  modalCard: {
    width: '88%',
    maxWidth: 390,
    borderRadius: 24,
    borderWidth: 1,
    paddingTop: 20,
    paddingHorizontal: 18,
    paddingBottom: 22,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },

  modalDescription: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 18,
    width: '100%',
  },

  modalActionBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  modalActionText: {
    fontSize: 15,
    fontWeight: '800',
  },
})
