import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { useTemaSalvo } from '../theme/useTemaSalvo'
import {
  BACKUP_LAST_KEY,
  DONO_DA_COPIA_KEY,
  PREMIUM_KEY,
  SINCRONIZADO_KEY,
  STORAGE_KEY,
  criarAppDataInicial,
  normalizarAppData,
} from '../data/appData'
import { idsPendentes, pareceVazio, temPendencia } from '../utils/pendencias'
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
  /** Muda os dados sem criar um passo de desfazer (ajustes internos). */
  atualizarSemHistorico: Dispatch<SetStateAction<AppData>>
  carregando: boolean

  // desfazer / refazer
  podeDesfazer: boolean
  podeRefazer: boolean
  desfazer: () => void
  refazer: () => void

  sincronizando: boolean
  dadosRemotosCarregados: boolean
  /** Ha algo na tela que ainda nao chegou ao servidor. */
  pendenteDeEnvio: boolean
  /** Ids dos itens que mudaram desde a ultima confirmacao do servidor. */
  idsNaoSalvos: Set<string>
  /** Tenta subir agora, sem esperar a proxima janela. */
  sincronizarAgora: () => void
  /** Sobe o que falta e rebusca os dados do servidor. Usado no puxar para atualizar. */
  recarregarDados: () => Promise<void>

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

/**
 * Mudou algo que o usuario queira poder desfazer?
 *
 * Compara so as partes que guardam lancamentos. Como todas sao substituidas
 * por copias novas a cada alteracao, comparar a referencia basta e e barato.
 */
/** Quantas acoes o desfazer alcanca para tras (e o refazer para frente). */
const LIMITE_HISTORICO = 50

function mudouAlgumLancamento(anterior: AppData, atual: AppData) {
  if (anterior.bancoDeDados !== atual.bancoDeDados) return true
  const a = anterior.global
  const b = atual.global
  return (
    a.fixosRecorrentes !== b.fixosRecorrentes ||
    a.cards !== b.cards ||
    a.pixContacts !== b.pixContacts ||
    a.notes !== b.notes ||
    a.shoppingWishes !== b.shoppingWishes
  )
}

const FinanceContext = createContext<FinanceContextValue | null>(null)

/**
 * Acesso aos dados do app. Precisa estar dentro de <FinanceProvider>.
 */
/**
 * Desiste depois de um tempo.
 *
 * Uma chamada de rede que nunca responde nem falha — acontece com sinal ruim,
 * e tambem quando o navegador segura a requisicao — deixava o app parado na
 * tela de carregamento para sempre. Com o limite ela vira um erro comum, e o
 * caminho de "sem resposta do servidor" assume: a copia local aparece e a
 * pessoa usa o app.
 */
function comTempoLimite<T>(promessa: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolver, rejeitar) => {
    const relogio = setTimeout(() => rejeitar(new Error('tempo esgotado')), ms)
    Promise.resolve(promessa).then(
      (valor) => {
        clearTimeout(relogio)
        resolver(valor)
      },
      (erro) => {
        clearTimeout(relogio)
        rejeitar(erro)
      }
    )
  })
}

/** Oito segundos: o bastante para uma rede lenta, pouco para uma tela parada. */
const LIMITE_DE_ESPERA = 8000

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) {
    throw new Error('useFinance precisa ser usado dentro de <FinanceProvider>')
  }
  return ctx
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData] = useState<AppData>(criarAppDataInicial())
  const [carregando, setCarregando] = useState(true)

  // --- desfazer / refazer ---
  //
  // Uma pilha de estados anteriores: cada clique volta uma acao, e da para
  // continuar clicando ate onde a memoria alcanca. As pilhas ficam em ref e
  // nao em estado — o que a tela precisa saber e so se ha o que desfazer ou
  // refazer, entao guardar as versoes em estado re-renderizaria a arvore
  // inteira a cada edicao sem motivo.
  const passadoRef = useRef<AppData[]>([])
  const futuroRef = useRef<AppData[]>([])
  const ultimoAppDataRef = useRef<AppData | null>(null)
  /** Marca a proxima mudanca como "nao e edicao do usuario" (carga, desfazer). */
  const ignorarNoHistoricoRef = useRef(true)
  const [disponivel, setDisponivel] = useState({ desfazer: false, refazer: false })

  const sincronizarDisponivel = useCallback(() => {
    setDisponivel((anterior) => {
      const desfazer = passadoRef.current.length > 0
      const refazer = futuroRef.current.length > 0
      if (anterior.desfazer === desfazer && anterior.refazer === refazer) return anterior
      return { desfazer, refazer }
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
    // Desfazer serve para criar, editar e excluir. Ocultar valores, trocar de
    // tema ou renomear o perfil mudam `appData`, mas nao ha nada a recuperar
    // ali — e entulhariam o historico com passos que ninguem quer voltar.
    if (!mudouAlgumLancamento(anterior, appData)) return

    passadoRef.current = [...passadoRef.current, anterior].slice(-LIMITE_HISTORICO)
    // Uma edicao nova apaga o caminho para a frente: refazer so faz sentido
    // sobre o que acabou de ser desfeito.
    futuroRef.current = []
    sincronizarDisponivel()
  }, [appData, sincronizarDisponivel])

  const desfazer = useCallback(() => {
    const alvo = passadoRef.current[passadoRef.current.length - 1]
    if (!alvo) return

    const atual = ultimoAppDataRef.current
    passadoRef.current = passadoRef.current.slice(0, -1)
    if (atual) futuroRef.current = [atual, ...futuroRef.current].slice(0, LIMITE_HISTORICO)

    ignorarNoHistoricoRef.current = true
    setAppData(alvo)
    sincronizarDisponivel()
  }, [sincronizarDisponivel])

  const refazer = useCallback(() => {
    const alvo = futuroRef.current[0]
    if (!alvo) return

    const atual = ultimoAppDataRef.current
    futuroRef.current = futuroRef.current.slice(1)
    if (atual) passadoRef.current = [...passadoRef.current, atual].slice(-LIMITE_HISTORICO)

    ignorarNoHistoricoRef.current = true
    setAppData(alvo)
    sincronizarDisponivel()
  }, [sincronizarDisponivel])

  const atualizarSemHistorico = useCallback<Dispatch<SetStateAction<AppData>>>((acao) => {
    ignorarNoHistoricoRef.current = true
    setAppData(acao)
  }, [])

  const [sincronizando, setSincronizando] = useState(false)
  const [dadosRemotosCarregados, setDadosRemotosCarregados] = useState(false)

  /**
   * A copia que o servidor confirmou ter recebido.
   *
   * E a referencia de tudo: o que esta na tela menos ela e o que falta subir.
   * Fica em ref porque as tentativas de envio a leem de dentro de callbacks
   * antigos, e um valor de estado ali estaria vencido.
   */
  const confirmadoRef = useRef<AppData | null>(null)
  const [confirmado, setConfirmado] = useState<AppData | null>(null)
  const appDataRef = useRef(appData)
  const tentarDeNovoRef = useRef<(() => void) | null>(null)

  const [usuarioId, setUsuarioId] = useState<string | null>(null)
  const [nome, setNome] = useState('Usuário')
  const [email, setEmail] = useState('')
  const [avatarPerfil, setAvatarPerfil] = useState('💼')

  const [premiumAtivo, setPremiumAtivo] = useState(false)
  const [premiumExpiresAt, setPremiumExpiresAt] = useState<string | null>(null)
  const [premiumLoading, setPremiumLoading] = useState(true)

  const { theme, temaEscuro, themeMode, alternarTema, alternarModoTemaSistema } = useTemaSalvo()

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const usuarioIdRef = useRef<string | null>(null)

  const premiumValido = useMemo(() => {
    if (!premiumAtivo || !premiumExpiresAt) return false
    return new Date(premiumExpiresAt).getTime() > Date.now()
  }, [premiumAtivo, premiumExpiresAt])

  /** O premium so vale enquanto a data de validade nao passou. */
  const aindaVale = (direito: PremiumEntitlement | null) =>
    !!direito?.premium_active &&
    !!direito?.premium_expires_at &&
    new Date(direito.premium_expires_at).getTime() > Date.now()

  const carregarStatusPremium = async (userId: string) => {
    try {
      setPremiumLoading(true)
      const { data, error } = await comTempoLimite(
        supabase
          .from('user_entitlements')
          .select('premium_active, premium_expires_at')
          .eq('user_id', userId)
          .maybeSingle<PremiumEntitlement>(),
        LIMITE_DE_ESPERA
      )

      if (error) throw error

      setPremiumAtivo(aindaVale(data ?? null))
      setPremiumExpiresAt(data?.premium_expires_at ?? null)
      AsyncStorage.setItem(
        PREMIUM_KEY,
        JSON.stringify({ usuario: userId, direito: data ?? null })
      ).catch(() => undefined)
    } catch (error) {
      /**
       * Sem resposta do servidor, vale o ultimo direito confirmado.
       *
       * Antes qualquer falha de rede derrubava o premium: abrir o app sem
       * internet dizia "plano inativo" e travava as acoes de quem tinha
       * pagado. A copia guardada carrega a data de validade, entao ela vence
       * sozinha no dia certo — nao e um premium eterno, e sim o mesmo direito
       * esperando o proximo sinal.
       */
      console.warn('[premium] Sem resposta do servidor; usando o último direito confirmado.', error)

      try {
        const bruto = await AsyncStorage.getItem(PREMIUM_KEY)
        const guardado = bruto ? JSON.parse(bruto) : null

        if (guardado?.usuario === userId) {
          setPremiumAtivo(aindaVale(guardado.direito))
          setPremiumExpiresAt(guardado.direito?.premium_expires_at ?? null)
          return
        }
      } catch {
        // Copia corrompida: cai no caminho de baixo.
      }

      setPremiumAtivo(false)
      setPremiumExpiresAt(null)
    } finally {
      setPremiumLoading(false)
    }
  }

  /**
   * A copia local, se ela for desta conta e tiver alguma coisa dentro.
   *
   * As duas condicoes existem por um motivo cada. A conta: a copia mora numa
   * chave so, entao entrar com outro login encontrava os dados do anterior e
   * os subiria por cima. O conteudo: uma copia vazia nao e trabalho de
   * ninguem, e trata-la como tal apagaria o que estava na nuvem.
   */
  const lerCopiaLocal = useCallback(async (usuario: string): Promise<AppData | null> => {
    try {
      const dono = await AsyncStorage.getItem(DONO_DA_COPIA_KEY)
      if (dono && dono !== usuario) return null

      const bruto = await AsyncStorage.getItem(STORAGE_KEY)
      if (!bruto) return null

      const dados = normalizarAppData(JSON.parse(bruto))
      return pareceVazio(dados) ? null : dados
    } catch {
      return null
    }
  }, [])

  /** O que o servidor confirmou da ultima vez, se for desta conta. */
  const lerConfirmado = useCallback(async (usuario: string): Promise<AppData | null> => {
    try {
      const dono = await AsyncStorage.getItem(DONO_DA_COPIA_KEY)
      if (dono && dono !== usuario) return null

      const bruto = await AsyncStorage.getItem(SINCRONIZADO_KEY)
      return bruto ? normalizarAppData(JSON.parse(bruto)) : null
    } catch {
      return null
    }
  }, [])

  const guardarConfirmado = useCallback((dados: AppData | null) => {
    confirmadoRef.current = dados
    setConfirmado(dados)
    if (dados) AsyncStorage.setItem(SINCRONIZADO_KEY, JSON.stringify(dados)).catch(() => undefined)
  }, [])

  const retentativaRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /**
   * Marca outra tentativa daqui a pouco.
   *
   * Trinta segundos: perto o bastante para o gasto subir assim que o sinal
   * volta, longe o bastante para nao ficar batendo no servidor sem parar
   * enquanto o aparelho esta em modo aviao. Quem realmente resolve sao os
   * gatilhos de "voltou a internet" e "voltou para o app"; isto e a rede de
   * seguranca de quando nenhum dos dois dispara.
   */
  const agendarNovaTentativa = useCallback(() => {
    if (retentativaRef.current) clearTimeout(retentativaRef.current)
    retentativaRef.current = setTimeout(() => {
      tentarDeNovoRef.current?.()
    }, 30000)
  }, [])

  const sincronizarAgora = useCallback(() => {
    if (retentativaRef.current) clearTimeout(retentativaRef.current)
    tentarDeNovoRef.current?.()
  }, [])

  /**
   * Puxar para atualizar.
   *
   * A ordem importa e nao e a obvia: primeiro sobe o que ainda nao foi, so
   * depois busca. Baixar antes de subir jogaria a versao do servidor por
   * cima do que a pessoa acabou de lancar — e num gesto que ela faz esperando
   * ganhar dados, nao perder.
   */
  const recarregarDados = useCallback(async () => {
    const usuario = usuarioIdRef.current
    if (!usuario) return

    if (temPendencia(appDataRef.current, confirmadoRef.current)) {
      await tentarDeNovoRef.current?.()
    }

    try {
      const { data, error } = await supabase
        .from('financial_data')
        .select('data')
        .eq('user_id', usuario)
        .maybeSingle()

      if (error || !data?.data) return

      // Se ainda ha pendencia, a subida acima falhou — provavelmente sem
      // internet. Trocar a tela pela copia do servidor agora apagaria o que
      // nao subiu.
      if (temPendencia(appDataRef.current, confirmadoRef.current)) return

      const normalizado = normalizarAppData(data.data)
      ignorarNoHistoricoRef.current = true
      setAppData(normalizado)
      guardarConfirmado(normalizado)
      if (normalizado.global.profileName) setNome(normalizado.global.profileName)
      setAvatarPerfil(normalizado.global.profileAvatar || '💼')
    } catch (error) {
      console.warn('[dados] Não foi possível atualizar agora.', error)
    }

    await carregarStatusPremium(usuario)
  }, [guardarConfirmado])

  const recarregarStatusPremium = async () => {
    if (!usuarioIdRef.current) return
    await carregarStatusPremium(usuarioIdRef.current)
  }

  // --- carga inicial: tema, sessao, premium e dados do Supabase ---
  useEffect(() => {
    const carregarTudo = async () => {
      setCarregando(true)

      try {
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
        // De proposito sem `await`: o premium tem o proprio estado de carga e
        // nao decide o que aparece na tela. Esperando por ele, uma rede ruim
        // somava o tempo das duas chamadas antes de a pessoa ver qualquer
        // coisa — e sem rede nenhuma, era o dobro da espera para chegar na
        // copia local.
        carregarStatusPremium(session.user.id)

        const nomeBaseSessao = String(
          session.user.user_metadata?.nome ||
            session.user.user_metadata?.name ||
            session.user.email?.split('@')[0] ||
            'Usuário'
        )
        setNome(nomeBaseSessao)

        const { data, error } = await comTempoLimite(
          supabase.from('financial_data').select('data').eq('user_id', session.user.id).maybeSingle(),
          LIMITE_DE_ESPERA
        )

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

          // A copia do servidor e, por definicao, o que ele tem. Mas se o
          // aparelho guarda mudancas que nunca subiram, quem manda e a copia
          // local: sobrescreve-la com a do servidor apagaria o que a pessoa
          // lancou sem internet.
          const local = await lerCopiaLocal(session.user.id)
          const confirmadoSalvo = await lerConfirmado(session.user.id)

          if (local && confirmadoSalvo && temPendencia(local, confirmadoSalvo)) {
            ignorarNoHistoricoRef.current = true
            setAppData(local)
            guardarConfirmado(confirmadoSalvo)
          } else {
            guardarConfirmado(normalizado)
          }
        } else {
          router.replace('/premium')
          return
        }
      } catch (error) {
        // Sem rede a leitura falha. Antes isso derrubava a pessoa no login,
        // com os dados intactos no aparelho — agora o app abre com a copia
        // local e sobe tudo quando a internet voltar.
        // `usuarioIdRef` ja foi preenchido antes da busca. Se nem a sessao
        // saiu, ele e null e a copia local nao e usada — sem saber de quem
        // sao os dados, o certo e mandar para o login.
        const local = usuarioIdRef.current ? await lerCopiaLocal(usuarioIdRef.current) : null

        if (local) {
          console.warn('[dados] Sem resposta do servidor; abrindo com a cópia local.', error)
          ignorarNoHistoricoRef.current = true
          setAppData(local)
          if (local.global.profileName) setNome(local.global.profileName)
          setAvatarPerfil(local.global.profileAvatar || '💼')
          guardarConfirmado(await lerConfirmado(usuarioIdRef.current || ''))
          setDadosRemotosCarregados(true)
          return
        }

        console.error('[dados] Falha ao carregar dados do usuário, redirecionando para login:', error)
        router.replace('/login')
      } finally {
        setCarregando(false)
      }
    }

    carregarTudo()
    // Carga unica: o tema agora tem o proprio guardiao, entao mudar o modo
    // claro/escuro do navegador nao precisa mais rebuscar tudo no Supabase.
    // Os leitores de disco sao estaveis; lista-los aqui nao mudaria nada, e
    // rodar isto duas vezes buscaria os dados de novo sem motivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- copia local dos dados ---
  //
  // A trava e o ponto deste efeito. O app nasce com um AppData vazio em
  // memoria, e sem ela a primeira execucao — que acontece na montagem, antes
  // de a resposta do servidor chegar — gravava esse vazio por cima da copia
  // local. Enquanto ninguem lia essa copia o estrago ficava invisivel; desde
  // que ela virou o plano B de quando falta internet, abrir o app offline
  // encontrava a copia recem-zerada e subia o vazio para a nuvem.
  useEffect(() => {
    if (!dadosRemotosCarregados || carregando) return

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(appData))
    if (usuarioIdRef.current) {
      AsyncStorage.setItem(DONO_DA_COPIA_KEY, usuarioIdRef.current)
    }
  }, [appData, carregando, dadosRemotosCarregados])

  // --- copia do que o servidor tem, sempre a mao ---
  useEffect(() => {
    appDataRef.current = appData
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

    /**
     * Sobe o que esta na tela agora.
     *
     * Envia sempre o estado mais recente, e nao o que existia quando a
     * tentativa foi agendada: entre o agendamento e a subida a pessoa pode ter
     * lancado mais coisa, e mandar a versao velha marcaria como salvo algo que
     * o servidor nunca recebeu.
     */
    const sincronizarBanco = async () => {
      const enviado = appDataRef.current

      /**
       * A ultima trava antes da nuvem.
       *
       * Subir um AppData sem nada dentro por cima de um que tem dados apaga o
       * trabalho da pessoa, e nenhuma acao normal do app produz esse estado —
       * nem apagar tudo a mao, que deixaria salario ou categorias. Quando
       * acontece e defeito, e um defeito nao pode ter permissao de gravar.
       */
      if (pareceVazio(enviado) && !pareceVazio(confirmadoRef.current)) {
        console.error('[sincronização] Envio vazio barrado: os dados locais sumiram sem motivo.')
        return
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.user) return

        setSincronizando(true)

        const { error } = await supabase.from('financial_data').upsert({
          user_id: session.user.id,
          data: enviado,
          updated_at: new Date().toISOString(),
        })

        if (error) {
          console.warn('[sincronização] Não foi possível salvar na nuvem agora:', error)
          agendarNovaTentativa()
          return
        }

        guardarConfirmado(enviado)
        await criarBackupSeNecessario(session.user.id, enviado)
      } catch (error) {
        // Sem rede a chamada estoura. Nao e erro do usuario: os dados estao
        // no aparelho e sobem na proxima tentativa.
        console.warn('[sincronização] Sem conexão com o servidor; tentaremos de novo.', error)
        agendarNovaTentativa()
      } finally {
        setSincronizando(false)
      }
    }

    tentarDeNovoRef.current = sincronizarBanco

    if (!dadosRemotosCarregados || carregando) return

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      sincronizarBanco()
    }, 700)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [appData, carregando, dadosRemotosCarregados, guardarConfirmado, agendarNovaTentativa])

  /**
   * Volta a tentar assim que a internet volta.
   *
   * O evento `online` do navegador e o sinal mais direto que existe: dispara
   * no instante em que a conexao e restabelecida, sem esperar o proximo
   * intervalo.
   */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.addEventListener) return

    const aoVoltar = () => sincronizarAgora()
    window.addEventListener('online', aoVoltar)
    return () => window.removeEventListener('online', aoVoltar)
  }, [sincronizarAgora])

  // Voltar para o app tambem e hora de tentar: no celular a tela fica parada
  // em segundo plano e o evento `online` pode ter passado sem ninguem ouvir.
  useEffect(() => {
    const inscricao = AppState.addEventListener('change', (proximo) => {
      if (proximo === 'active') sincronizarAgora()
    })
    return () => inscricao.remove()
  }, [sincronizarAgora])

  useEffect(() => {
    return () => {
      if (retentativaRef.current) clearTimeout(retentativaRef.current)
    }
  }, [])

  const pendenteDeEnvio = useMemo(
    () => dadosRemotosCarregados && !carregando && temPendencia(appData, confirmado),
    [appData, confirmado, carregando, dadosRemotosCarregados]
  )

  const idsNaoSalvos = useMemo(
    () => (pendenteDeEnvio ? idsPendentes(appData, confirmado) : new Set<string>()),
    [appData, confirmado, pendenteDeEnvio]
  )

  // --- revalida o premium quando o app volta do segundo plano ---
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && usuarioIdRef.current) {
        carregarStatusPremium(usuarioIdRef.current)
      }
    })

    return () => subscription.remove()
  }, [])

  // useMemo aqui e essencial: sem ele o objeto seria recriado a cada render
  // do Provider e todos os consumidores re-renderizariam sem necessidade.
  const value = useMemo<FinanceContextValue>(
    () => ({
      appData,
      setAppData,
      atualizarSemHistorico,
      carregando,
      podeDesfazer: disponivel.desfazer,
      podeRefazer: disponivel.refazer,
      desfazer,
      refazer,
      sincronizando,
      dadosRemotosCarregados,
      pendenteDeEnvio,
      idsNaoSalvos,
      sincronizarAgora,
      recarregarDados,
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
      atualizarSemHistorico,
      disponivel,
      desfazer,
      refazer,
      sincronizando,
      dadosRemotosCarregados,
      pendenteDeEnvio,
      idsNaoSalvos,
      sincronizarAgora,
      recarregarDados,
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
