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
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { router } from 'expo-router'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { supabase } from '../src/lib/supabase'
import { useTemaSalvo } from '../src/theme/useTemaSalvo'
import { formatarMoeda } from '../src/utils/currency'
import type { PremiumEntitlement, Tema } from './types'
import PressableScale from '../components/common/motion/PressableScale'
import AppearIn from '../components/common/motion/AppearIn'
import Icon, { type IconName } from '../components/common/Icon'

/** O que o premium libera, com o icone que representa a acao. */
const LIBERADOS: { icone: IconName; texto: string }[] = [
  { icone: 'editar', texto: 'Adicionar e editar sem bloqueio' },
  { icone: 'excluir', texto: 'Excluir lançamentos, cartões e categorias' },
  { icone: 'microfone', texto: 'Lançar falando, com a lista inteira de uma vez' },
  { icone: 'planilha', texto: 'Importar e exportar PDF, Excel e CSV' },
]

/** O que o app tem, para quem chegou aqui antes de conhecer. */
const RECURSOS: { icone: IconName; texto: string }[] = [
  { icone: 'aba_variavel', texto: 'Entradas e saídas' },
  { icone: 'aba_fixo', texto: 'Gastos fixos' },
  { icone: 'cartao', texto: 'Cartões e parcelas' },
  { icone: 'alvo', texto: 'Metas e objetivos' },
  { icone: 'investir', texto: 'Investimentos' },
  { icone: 'pix', texto: 'Pix e anotações' },
  { icone: 'carrinho', texto: 'Coisas para comprar' },
  { icone: 'grafico', texto: 'Gráficos por categoria' },
]

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
                <PressableScale
                  onPress={onSecondary}
                  style={[
                    styles.modalAction,
                    {
                      backgroundColor: theme.cardSoft,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.modalActionText, { color: theme.text }]}>{secondaryText}</Text>
                </PressableScale>
              ) : null}

              <PressableScale
                onPress={onPrimary}
                style={[
                  styles.modalAction,
                  {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
              >
                <Text style={[styles.modalActionText, { color: theme.white }]}>{primaryText}</Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default function PremiumScreen() {
  const insets = useSafeAreaInsets()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [creatingPix, setCreatingPix] = useState(false)

  const [premiumAtivo, setPremiumAtivo] = useState(false)
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null)
  const [pixData, setPixData] = useState<PixResponse | null>(null)
  const [onboardingPending, setOnboardingPending] = useState(false)

  const { theme, temaEscuro, alternarTema } = useTemaSalvo()

  const [popupVisible, setPopupVisible] = useState(false)
  const [popupTitle, setPopupTitle] = useState('')
  const [popupDescription, setPopupDescription] = useState('')

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
    } catch (error) {
      console.error('[premium] Falha ao carregar status premium:', error)
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

  /**
   * Voltar, de onde quer que a pessoa tenha vindo.
   *
   * Quem acabou de criar a conta chega aqui por `router.replace` — nao ha
   * historico, e `router.back()` nao fazia nada. O botao ficava vivo na tela
   * e morto no toque.
   *
   * Com o primeiro acesso pendente o destino e ele, e nao a home: a home
   * devolve para ca enquanto nao houver dados, entao voltar para la so
   * piscaria a tela e traria a pessoa de volta. O primeiro acesso funciona
   * sem premium; a home, para quem ainda nao montou nada, nao.
   */
  const voltar = useCallback(() => {
    if (onboardingPending) {
      router.replace('/primeiro-acesso')
      return
    }
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace('/home')
  }, [onboardingPending])

  /**
   * Sair da conta.
   *
   * Sem isto nao havia caminho nenhum daqui para o login: quem entrou na
   * conta errada ficava preso na tela de pagamento, porque a home devolve
   * para ca enquanto o primeiro acesso nao terminou.
   */
  const sairDaConta = useCallback(async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('[premium] Falha ao sair da conta:', error)
    }
    router.replace('/login')
  }, [])

  const handleCopyPix = useCallback(async () => {
    if (!pixData?.qr_code) {
      mostrarPopup('Código indisponível', 'Ainda não existe um código Pix para copiar.')
      return
    }

    try {
      await Clipboard.setStringAsync(pixData.qr_code)
      mostrarPopup('Código copiado', 'O código Pix foi copiado com sucesso.')
    } catch (error) {
      console.error('[pix] Falha ao copiar código Pix:', error)
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
          <PressableScale
            onPress={voltar}
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            style={[styles.circulo, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Icon name="seta_esquerda" size={18} color={theme.text} />
          </PressableScale>

          <Text style={[styles.topTitulo, { color: theme.text }]}>Premium</Text>

          <PressableScale
            onPress={alternarTema}
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel="Trocar tema"
            style={[styles.circulo, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Icon name={temaEscuro ? 'sol' : 'lua'} size={18} color={theme.text} />
          </PressableScale>
        </View>

        <AppearIn index={0}>
          <View style={[styles.cartao, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.heroTopo}>
              <View style={[styles.heroGlow, { backgroundColor: theme.backgroundSoft, borderColor: theme.borderStrong }]}>
                <Image source={require('../assets/images/icon-removebg.png')} style={styles.heroIcon} resizeMode="contain" />
              </View>

              <View style={styles.heroTextos}>
                <Text style={[styles.rotulo, { color: theme.primary }]}>Brazllet premium</Text>
                <Text style={[styles.titulo, { color: theme.text }]}>Tudo liberado, por R$ 6,90 no mês</Text>
              </View>
            </View>

            <Text style={[styles.descricao, { color: theme.muted }]}>
              Edição, importação, exportação, lançar falando e o resto do app sem bloqueio nenhum.
            </Text>

            <View style={styles.selos}>
              <View style={[styles.selo, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text style={[styles.seloTexto, { color: theme.text }]}>{formatarMoeda(6.9)} / mês</Text>
              </View>
              <View
                style={[
                  styles.selo,
                  styles.seloComIcone,
                  {
                    backgroundColor: premiumValido ? theme.greenSoft : theme.cardSoft,
                    borderColor: premiumValido ? theme.green : theme.border,
                  },
                ]}
              >
                <Icon
                  name={premiumValido ? 'confirmar' : 'premium'}
                  size={12}
                  color={premiumValido ? theme.green : theme.muted}
                />
                <Text style={[styles.seloTexto, { color: premiumValido ? theme.green : theme.text }]}>
                  {premiumValido ? 'Ativo' : 'Inativo'}
                </Text>
              </View>
            </View>
          </View>
        </AppearIn>

        <AppearIn index={1}>
          <View style={[styles.cartao, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.rotulo, { color: theme.muted }]}>Seu status</Text>
            <Text style={[styles.descricao, { color: theme.muted, marginTop: 6 }]}>{premiumStatusTexto}</Text>

            <View style={styles.numeros}>
              <View style={[styles.numero, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text style={[styles.numeroRotulo, { color: theme.muted }]}>Plano</Text>
                <Text style={[styles.numeroValor, { color: theme.text }]}>Mensal</Text>
              </View>
              <View style={[styles.numero, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text style={[styles.numeroRotulo, { color: theme.muted }]}>Valor</Text>
                <Text style={[styles.numeroValor, { color: theme.text }]}>{formatarMoeda(6.9)}</Text>
              </View>
            </View>
          </View>
        </AppearIn>

        <AppearIn index={2}>
          <View style={[styles.cartao, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.rotulo, { color: theme.muted }]}>O que o premium libera</Text>

            <View style={styles.liberados}>
              {LIBERADOS.map((item) => (
                <View key={item.texto} style={styles.liberado}>
                  <View style={[styles.liberadoIcone, { backgroundColor: theme.greenSoft, borderColor: theme.green }]}>
                    <Icon name={item.icone} size={14} color={theme.green} />
                  </View>
                  <Text style={[styles.liberadoTexto, { color: theme.text }]}>{item.texto}</Text>
                </View>
              ))}
            </View>
          </View>
        </AppearIn>

        <AppearIn index={3}>
          <View style={[styles.cartao, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.rotulo, { color: theme.muted }]}>O que tem no Brazllet</Text>

            <View style={styles.grade}>
              {RECURSOS.map((recurso) => (
                <View
                  key={recurso.texto}
                  style={[styles.recurso, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
                >
                  <Icon name={recurso.icone} size={16} color={theme.primary} />
                  <Text style={[styles.recursoTexto, { color: theme.text }]} numberOfLines={2}>
                    {recurso.texto}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </AppearIn>

        {onboardingPending && !premiumValido ? (
          <PressableScale
            onPress={handleStartFreeTrial}
            scaleTo={0.98}
            accessibilityRole="button"
            style={[styles.botaoSecundario, { backgroundColor: theme.card, borderColor: theme.primary }]}
          >
            <Icon name="premium" size={16} color={theme.primary} />
            <Text style={[styles.botaoSecundarioTexto, { color: theme.primary }]}>Usar 7 dias grátis</Text>
          </PressableScale>
        ) : null}

        <PressableScale
          onPress={handleCreatePix}
          disabled={creatingPix}
          scaleTo={0.98}
          accessibilityRole="button"
          style={[
            styles.botaoPrincipal,
            { backgroundColor: theme.primary, borderColor: theme.primary, opacity: creatingPix ? 0.6 : 1 },
          ]}
        >
          {creatingPix ? (
            <ActivityIndicator size="small" color={theme.textInverse} />
          ) : (
            <Icon name="pix" size={17} color={theme.textInverse} />
          )}
          <Text style={[styles.botaoPrincipalTexto, { color: theme.textInverse }]}>
            {creatingPix ? 'Gerando Pix...' : `Gerar Pix de ${formatarMoeda(6.9)}`}
          </Text>
        </PressableScale>

        {pixData ? (
          <AppearIn index={4}>
            <View style={[styles.cartao, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.rotulo, { color: theme.muted }]}>Pague com Pix</Text>
              <Text style={[styles.descricao, { color: theme.muted, marginTop: 6 }]}>
                Aponte a câmera do banco para o código, ou copie e cole.
              </Text>

              {pixData.qr_code_base64 ? (
                <View style={[styles.qrCaixa, { backgroundColor: theme.white, borderColor: theme.border }]}>
                  <Image
                    source={{ uri: `data:image/png;base64,${pixData.qr_code_base64}` }}
                    style={styles.qrImagem}
                    resizeMode="contain"
                  />
                </View>
              ) : null}

              <Text style={[styles.rotuloPequeno, { color: theme.muted }]}>Código copia e cola</Text>
              <View style={[styles.pixCaixa, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}>
                <Text style={[styles.pixTexto, { color: theme.text }]} numberOfLines={4}>
                  {pixData.qr_code || 'Código indisponível.'}
                </Text>
              </View>

              <PressableScale
                onPress={handleCopyPix}
                scaleTo={0.97}
                accessibilityRole="button"
                style={[styles.botaoSecundario, { backgroundColor: theme.cardSoft, borderColor: theme.border }]}
              >
                <Icon name="copiar" size={15} color={theme.text} />
                <Text style={[styles.botaoSecundarioTexto, { color: theme.text }]}>Copiar código Pix</Text>
              </PressableScale>

              {pixData.expires_at ? (
                <Text style={[styles.expira, { color: theme.faint }]}>
                  Expira em {new Date(pixData.expires_at).toLocaleString('pt-BR')}
                </Text>
              ) : null}
            </View>
          </AppearIn>
        ) : null}

        {/* O caminho de volta para o login. Fica no fim de proposito: quem
            veio pagar nao tropeça nele, e quem entrou na conta errada tem
            para onde ir. */}
        <PressableScale
          onPress={sairDaConta}
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel="Sair e entrar com outra conta"
          style={styles.sairBotao}
        >
          <Icon name="sair" size={15} color={theme.muted} />
          <Text style={[styles.sairTexto, { color: theme.muted }]}>Sair e entrar com outra conta</Text>
        </PressableScale>

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
  safeArea: { flex: 1 },
  sairBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    marginTop: 18,
  },
  sairTexto: { fontSize: 12.5, fontWeight: '800' },
  flex: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 13.5, fontWeight: '700' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  topTitulo: { fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  circulo: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cartao: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
  },

  heroTopo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroGlow: {
    width: 66,
    height: 66,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: { width: 42, height: 42 },
  heroTextos: { flex: 1, minWidth: 0 },

  rotulo: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  rotuloPequeno: {
    fontSize: 10.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 7,
  },
  titulo: { fontSize: 19, fontWeight: '900', letterSpacing: -0.5, lineHeight: 24, marginTop: 4 },
  descricao: { fontSize: 13, fontWeight: '600', lineHeight: 19, marginTop: 12 },

  selos: { flexDirection: 'row', gap: 8, marginTop: 14 },
  selo: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
  },
  seloComIcone: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  seloTexto: { fontSize: 12.5, fontWeight: '800' },

  numeros: { flexDirection: 'row', gap: 8, marginTop: 14 },
  numero: { flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 13 },
  numeroRotulo: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  numeroValor: { fontSize: 17, fontWeight: '900', letterSpacing: -0.4 },

  liberados: { marginTop: 12, gap: 10 },
  liberado: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  liberadoIcone: {
    width: 30,
    height: 30,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liberadoTexto: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '700', lineHeight: 18 },

  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  recurso: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 11,
  },
  recursoTexto: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '700', lineHeight: 16 },

  botaoPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    minHeight: 54,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 4,
    marginBottom: 12,
  },
  botaoPrincipalTexto: { fontSize: 14.5, fontWeight: '900' },
  botaoSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 4,
  },
  botaoSecundarioTexto: { fontSize: 13.5, fontWeight: '800' },

  qrCaixa: {
    alignSelf: 'center',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
  },
  qrImagem: { width: 190, height: 190 },
  pixCaixa: { borderWidth: 1, borderRadius: 14, padding: 12 },
  pixTexto: { fontSize: 11.5, fontWeight: '600', lineHeight: 17 },
  expira: { fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 10 },

  // --- popup ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    width: '88%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  modalTitle: { fontSize: 17, fontWeight: '900', letterSpacing: -0.3, marginBottom: 7 },
  modalDescription: { fontSize: 13, fontWeight: '600', lineHeight: 19, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 8 },
  modalBackdropTouch: { ...StyleSheet.absoluteFillObject },
  modalCenterWrap: { width: '100%', alignItems: 'center' },
  modalAction: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  modalActionText: { fontSize: 13.5, fontWeight: '800' },
})
