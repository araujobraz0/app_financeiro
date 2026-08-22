import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { AppState, useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { darkTheme, lightTheme, THEME_KEY, THEME_MODE_KEY } from '../theme/themes'
import {
  BACKUP_LAST_KEY,
  STORAGE_KEY,
  criarAppDataInicial,
  normalizarAppData,
} from '../data/appData'
import type {
  AppData,
  PremiumEntitlement,
  SettingsThemeMode,
  Tema,
} from '../../app/types'

/**
 * Dono da camada de dados do app.
 *
 * Este Provider fica ACIMA da tela. Isso e o ponto central: se ele vivesse
 * dentro do HomeScreen, o valor do contexto seria recriado a cada render da
 * tela e todos os consumidores re-renderizariam junto — que e exatamente o
 * problema que estamos resolvendo.
 *
 * Como o estado mora aqui, digitar num campo la na tela nao mexe em nada
 * daqui, e as abas que consomem este contexto ficam paradas.
 */

type FinanceContextValue = {
  // dados
  appData: AppData
  setAppData: Dispatch<SetStateAction<AppData>>
  carregando: boolean

  // desfazer / refazer
  podeDesfazer: boolean
  podeRefazer: boolean
  desfazer: () => void
  refazer: () => void

  sincronizando: boolean
  dadosRemotosCarregados: boolean

  // perfil
  usuarioId: string | null
  nome: string
  setNome: (value: string) => void
  email: string
  avatarPerfil: string
  setAvatarPerfil: (value: string) => void

  // premium
  premiumAtivo: boolean
  premiumExpiresAt: string | null
  premiumLoading: boolean
  premiumValido: boolean
  recarregarStatusPremium: () => Promise<void>

  // tema
  theme: Tema
  temaEscuro: boolean
  themeMode: SettingsThemeMode
  alternarTema: () => void
  alternarModoTemaSistema: () => void
}

/** Quantas edicoes o app lembra para tras (e para frente). */
const LIMITE_HISTORICO = 50

const FinanceContext = createContext<FinanceContextValue | null>(null)

/**
 * Acesso aos dados do app. Precisa estar dentro de <FinanceProvider>.
 */
export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) {
    throw new Error('useFinance precisa ser usado dentro de <FinanceProvider>')
  }
  return ctx
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme()

  const [appData, setAppData] = useState<AppData>(criarAppDataInicial())
  const [carregando, setCarregando] = useState(true)

  // --- historico de desfazer/refazer ---
  //
  // Todo o estado editavel do app mora em `appData`, entao o historico e
  // simplesmente uma pilha de versoes anteriores desse objeto. Guardar as
  // pilhas em refs (e nao em estado) evita re-renderizar a arvore inteira a
  // cada edicao: so as duas contagens abaixo viram estado, e elas mudam
  // apenas quando um botao precisa ligar ou desligar.
  const passadoRef = useRef<AppData[]>([])
  const futuroRef = useRef<AppData[]>([])
  const ultimoAppDataRef = useRef<AppData | null>(null)
  /** Marca a proxima mudanca como "nao e edicao do usuario" (carga, desfazer, refazer). */
  const ignorarNoHistoricoRef = useRef(true)
  const [tamanhoHistorico, setTamanhoHistorico] = useState({ passado: 0, futuro: 0 })

  const sincronizarTamanhoHistorico = useCallback(() => {
    setTamanhoHistorico((anterior) => {
      const passado = passadoRef.current.length
      const futuro = futuroRef.current.length
      if (anterior.passado === passado && anterior.futuro === futuro) return anterior
      return { passado, futuro }
    })
  }, [])

  useEffect(() => {
    const anterior = ultimoAppDataRef.current
    ultimoAppDataRef.current = appData

    if (ignorarNoHistoricoRef.current) {
      ignorarNoHistoricoRef.current = false
      return
    }
    if (anterior === null || anterior === appData) return

    passadoRef.current = [...passadoRef.current, anterior].slice(-LIMITE_HISTORICO)
    futuroRef.current = []
    sincronizarTamanhoHistorico()
  }, [appData, sincronizarTamanhoHistorico])

  const desfazer = useCallback(() => {
    const anterior = passadoRef.current[passadoRef.current.length - 1]
    if (!anterior) return
    const atual = ultimoAppDataRef.current
    passadoRef.current = passadoRef.current.slice(0, -1)
    if (atual) futuroRef.current = [atual, ...futuroRef.current].slice(0, LIMITE_HISTORICO)
    ignorarNoHistoricoRef.current = true
    setAppData(anterior)
    sincronizarTamanhoHistorico()
  }, [sincronizarTamanhoHistorico])

  const refazer = useCallback(() => {
    const proximo = futuroRef.current[0]
    if (!proximo) return
    const atual = ultimoAppDataRef.current
    futuroRef.current = futuroRef.current.slice(1)
    if (atual) passadoRef.current = [...passadoRef.current, atual].slice(-LIMITE_HISTORICO)
    ignorarNoHistoricoRef.current = true
    setAppData(proximo)
    sincronizarTamanhoHistorico()
  }, [sincronizarTamanhoHistorico])
  const [sincronizando, setSincronizando] = useState(false)
  const [dadosRemotosCarregados, setDadosRemotosCarregados] = useState(false)

  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [nome, setNome] = useState('Usuário')
  const [email, setEmail] = useState('')
  const [avatarPerfil, setAvatarPerfil] = useState('💼')

  const [premiumAtivo, setPremiumAtivo] = useState(false)
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null)
  const [premiumLoading, setPremiumLoading] = useState(true)

  const [temaEscuro, setTemaEscuro] = useState(false)
  const [themeMode, setThemeMode] = useState<SettingsThemeMode>('manual')

  const temaStorageCarregadoRef = useRef(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const usuarioIdRef = useRef<string | null>(null)

  const theme = temaEscuro ? darkTheme : lightTheme

  const premiumValido = useMemo(() => {
    if (!premiumAtivo || !premiumExpiresAt) return false
    return new Date(premiumExpiresAt).getTime() > Date.now()
  }, [premiumAtivo, premiumExpiresAt])

  const carregarStatusPremium = async (userId: string) => {
    try {
      setPremiumLoading(true)
      const { data } = await supabase
        .from('user_entitlements')
        .select('premium_active, premium_expires_at')
        .eq('user_id', userId)
        .maybeSingle<PremiumEntitlement>()

      const ativo =
        !!data?.premium_active &&
        !!data?.premium_expires_at &&
        new Date(data.premium_expires_at).getTime() > Date.now()
      setPremiumAtivo(ativo)
      setPremiumExpiresAt(data?.premium_expires_at ?? null)
    } catch (error) {
      console.error('[premium] Falha ao verificar status premium:', error)
      setPremiumAtivo(false)
      setPremiumExpiresAt(null)
    } finally {
      setPremiumLoading(false)
    }
  }

  const recarregarStatusPremium = async () => {
    if (!usuarioIdRef.current) return
    await carregarStatusPremium(usuarioIdRef.current)
  }

  // --- carga inicial: tema, sessao, premium e dados do Supabase ---
  useEffect(() => {
    const carregarTudo = async () => {
      setCarregando(true)

      try {
        const temaSalvo = await AsyncStorage.getItem(THEME_KEY)
        const modoTemaSalvo = await AsyncStorage.getItem(THEME_MODE_KEY)

        if (modoTemaSalvo === 'system') {
          setThemeMode('system')
          setTemaEscuro(colorScheme === 'dark')
        } else {
          setThemeMode('manual')
          if (temaSalvo) setTemaEscuro(temaSalvo === 'dark')
        }

        temaStorageCarregadoRef.current = true

        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) {
          router.replace('/login')
          return
        }

        usuarioIdRef.current = session.user.id
        setUsuarioId(session.user.id)
        setEmail(session.user.email || '')
        await carregarStatusPremium(session.user.id)

        const nomeBaseSessao = String(
          session.user.user_metadata?.nome ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'Usuário'
        )
        setNome(nomeBaseSessao)

        const { data, error } = await supabase
          .from('financial_data')
          .select('data')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (error) throw error

        if (data?.data) {
          const normalizado = normalizarAppData(data.data)
          ignorarNoHistoricoRef.current = true
          setAppData(normalizado)
          if (normalizado.global.profileName) {
            setNome(normalizado.global.profileName)
          }
          setAvatarPerfil(normalizado.global.profileAvatar || '💼')
          setDadosRemotosCarregados(true)
        } else {
          router.replace('/premium')
          return
        }
      } catch (error) {
        console.error('[dados] Falha ao carregar dados do usuário, redirecionando para login:', error)
        router.replace('/login')
      } finally {
        setCarregando(false)
      }
    }

    carregarTudo()
  }, [colorScheme])

  // --- persistencia do tema ---
  useEffect(() => {
    if (!temaStorageCarregadoRef.current) return
    if (themeMode === 'system') {
      setTemaEscuro(colorScheme === 'dark')
    }
    AsyncStorage.setItem(THEME_MODE_KEY, themeMode)
  }, [themeMode, colorScheme])

  useEffect(() => {
    if (!temaStorageCarregadoRef.current) return
    if (themeMode === 'manual') {
      AsyncStorage.setItem(THEME_KEY, temaEscuro ? 'dark' : 'light')
    }
  }, [temaEscuro, themeMode])

  // --- copia local dos dados ---
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(appData))
  }, [appData])

  // --- sincronizacao com o Supabase (com debounce) e backup diario ---
  useEffect(() => {
    const criarBackupSeNecessario = async (userId: string, dadosAtuais: AppData) => {
      try {
        const ultimoBackupIso = await AsyncStorage.getItem(BACKUP_LAST_KEY)
        const ultimoBackupData = ultimoBackupIso ? new Date(ultimoBackupIso) : null
        const agora = new Date()
        const passou24h =
          !ultimoBackupData || agora.getTime() - ultimoBackupData.getTime() > 1000 * 60 * 60 * 24

        if (!passou24h) return

        const { error: erroBackup } = await supabase.from('financial_data_backups').insert({
          user_id: userId,
          data: dadosAtuais,
        })

        if (erroBackup) {
          console.warn('[backup] Não foi possível criar snapshot automático:', erroBackup)
          return
        }

        await AsyncStorage.setItem(BACKUP_LAST_KEY, agora.toISOString())

        const limite = new Date(agora.getTime() - 1000 * 60 * 60 * 24 * 60).toISOString()
        await supabase
          .from('financial_data_backups')
          .delete()
          .eq('user_id', userId)
          .lt('created_at', limite)
      } catch (error) {
        console.warn('[backup] Falha ao processar backup automático:', error)
      }
    }

    const sincronizarBanco = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) return

      try {
        setSincronizando(true)
        const { error } = await supabase.from('financial_data').upsert({
          user_id: session.user.id,
          data: appData,
          updated_at: new Date().toISOString(),
        })

        if (error) {
          console.error('[sincronização] Falha ao salvar dados na nuvem:', error)
          return
        }

        await criarBackupSeNecessario(session.user.id, appData)
      } catch (error) {
        console.error('[sincronização] Falha ao sincronizar dados:', error)
      } finally {
        setSincronizando(false)
      }
    }

    if (!dadosRemotosCarregados || carregando) return

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      sincronizarBanco()
    }, 700)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [appData, carregando, dadosRemotosCarregados])

  // --- revalida o premium quando o app volta do segundo plano ---
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && usuarioIdRef.current) {
        carregarStatusPremium(usuarioIdRef.current)
      }
    })

    return () => subscription.remove()
  }, [])

  const alternarTema = () => {
    setThemeMode('manual')
    AsyncStorage.setItem(THEME_MODE_KEY, 'manual')
    setTemaEscuro((prev) => {
      const proximoTema = !prev
      AsyncStorage.setItem(THEME_KEY, proximoTema ? 'dark' : 'light')
      return proximoTema
    })
  }

  const alternarModoTemaSistema = () => {
    setThemeMode((prev) => {
      const proximoModo: SettingsThemeMode = prev === 'system' ? 'manual' : 'system'
      AsyncStorage.setItem(THEME_MODE_KEY, proximoModo)

      if (proximoModo === 'system') {
        setTemaEscuro(colorScheme === 'dark')
      } else {
        AsyncStorage.setItem(THEME_KEY, temaEscuro ? 'dark' : 'light')
      }

      return proximoModo
    })
  }

  // useMemo aqui e essencial: sem ele o objeto seria recriado a cada render
  // do Provider e todos os consumidores re-renderizariam sem necessidade.
  const value = useMemo<FinanceContextValue>(
    () => ({
      appData,
      setAppData,
      carregando,
      podeDesfazer: tamanhoHistorico.passado > 0,
      podeRefazer: tamanhoHistorico.futuro > 0,
      desfazer,
      refazer,
      sincronizando,
      dadosRemotosCarregados,
      usuarioId,
      nome,
      setNome,
      email,
      avatarPerfil,
      setAvatarPerfil,
      premiumAtivo,
      premiumExpiresAt,
      premiumLoading,
      premiumValido,
      recarregarStatusPremium,
      theme,
      temaEscuro,
      themeMode,
      alternarTema,
      alternarModoTemaSistema,
    }),
    [
      appData,
      carregando,
      tamanhoHistorico,
      desfazer,
      refazer,
      sincronizando,
      dadosRemotosCarregados,
      usuarioId,
      nome,
      email,
      avatarPerfil,
      premiumAtivo,
      premiumExpiresAt,
      premiumLoading,
      premiumValido,
      theme,
      temaEscuro,
      themeMode,
    ]
  )

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}
