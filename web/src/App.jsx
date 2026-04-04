import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { Login } from './login'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  LabelList,
} from 'recharts'

function App() {
  const [session, setSession] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [loadingDados, setLoadingDados] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [dadosProntos, setDadosProntos] = useState(false)

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]

  const mesesCurtos = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  const categoriasPadrao = ['Mercado', 'Saúde', 'Extra', 'Lazer', 'Uber']
  const coresPizza = ['#0f172a', '#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c', '#0891b2', '#ca8a04']

  const opcoesGraficoResumo = [
    { chave: 'saldo', label: 'Saldo' },
    { chave: 'salario', label: 'Salário' },
    { chave: 'entradas', label: 'Entradas' },
    { chave: 'saidas', label: 'Saídas' },
    { chave: 'fixoPago', label: 'Fixo Pago' },
    { chave: 'fixoNaoPago', label: 'Fixo Não Pago' },
  ]

  const dataAtual = new Date()
  const anoAtual = dataAtual.getFullYear()
  const mesAtualIndex = dataAtual.getMonth()
  const listaAnos = [anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1, anoAtual + 2]

  const fixosPadrao = [
    { nome: 'Comissão de formatura', valor: 130, pago: false },
    { nome: 'Lavadeira', valor: 120, pago: false },
    { nome: 'Aeroland', valor: 49.85, pago: false },
    { nome: 'Plano de Celular', valor: 35, pago: false },
    { nome: 'Chat GPT', valor: 19, pago: false },
    { nome: 'Saeear', valor: 15, pago: false },
    { nome: 'CTMG', valor: 15, pago: false },
    { nome: 'YouTube Music', valor: 9, pago: false },
  ]

  const [temaEscuro, setTemaEscuro] = useState(() => {
    const salvo = localStorage.getItem('controle-financeiro-tema')
    return salvo ? JSON.parse(salvo) : false
  })

  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual)
  const [mesSelecionado, setMesSelecionado] = useState(meses[mesAtualIndex])
  const [abaAtiva, setAbaAtiva] = useState('fixo')

  const [anoComparacao, setAnoComparacao] = useState(anoAtual)
  const [mesComparacao, setMesComparacao] = useState(meses[mesAtualIndex])

  const [filtroCategoria, setFiltroCategoria] = useState('Todas')

  const [modalItemAberto, setModalItemAberto] = useState(false)
  const [modoModalItem, setModoModalItem] = useState('novo')
  const [itemEditandoId, setItemEditandoId] = useState(null)
  const [novoNome, setNovoNome] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [novaCategoria, setNovaCategoria] = useState(categoriasPadrao[0])

  const [modalCategoriasAberto, setModalCategoriasAberto] = useState(false)
  const [modalCategoriaNomeAberto, setModalCategoriaNomeAberto] = useState(false)
  const [modoCategoria, setModoCategoria] = useState('nova')
  const [categoriaOriginal, setCategoriaOriginal] = useState('')
  const [categoriaDigitada, setCategoriaDigitada] = useState('')

  const [salarioEmEdicao, setSalarioEmEdicao] = useState(false)
  const [salarioTexto, setSalarioTexto] = useState('0,00')
  const salarioInputRef = useRef(null)

  const [itensGraficoSelecionados, setItensGraficoSelecionados] = useState(['saldo', 'entradas', 'saidas'])
  const [mostrarCategoriasNoGrafico, setMostrarCategoriasNoGrafico] = useState(false)
  const itensGraficoAntesCategoriasRef = useRef(['saldo', 'entradas', 'saidas'])

  const saveTimeoutRef = useRef(null)

  const criarBancoInicial = () => {
    const banco = {}

    listaAnos.forEach((ano) => {
      meses.forEach((mes) => {
        const chave = `${ano}-${mes}`
        banco[chave] = {
          salario: 0,
          entradas: [],
          fixo: fixosPadrao.map((item, index) => ({
            id: `fixo-${ano}-${mes}-${index}`,
            nome: item.nome,
            valor: item.valor,
            pago: item.pago,
          })),
          saidas: [],
          categoriasSaidas: [...categoriasPadrao],
        }
      })
    })

    return banco
  }

  const normalizarBanco = (bancoOriginal) => {
    const base = bancoOriginal && typeof bancoOriginal === 'object' ? bancoOriginal : {}
    const banco = {}

    listaAnos.forEach((ano) => {
      meses.forEach((mes) => {
        const chave = `${ano}-${mes}`
        const bloco = base[chave] || {}

        const categoriasNormalizadas = Array.from(
          new Set(
            (bloco.categoriasSaidas || categoriasPadrao)
              .filter((cat) => cat && String(cat).trim())
              .map((cat) => String(cat).trim())
              .concat(categoriasPadrao)
          )
        )

        banco[chave] = {
          salario: Number(bloco.salario || 0),
          entradas: (bloco.entradas || []).map((item, index) => ({
            id: item.id || `entrada-${chave}-${index}`,
            nome: item.nome || '',
            valor: Number(item.valor || 0),
          })),
          fixo: (bloco.fixo || fixosPadrao).map((item, index) => ({
            id: item.id || `fixo-${chave}-${index}`,
            nome: item.nome,
            valor: Number(item.valor || 0),
            pago: Boolean(item.pago),
          })),
          saidas: (bloco.saidas || []).map((item, index) => ({
            id: item.id || `saida-${chave}-${index}`,
            nome: item.nome || '',
            valor: Number(item.valor || 0),
            categoria: item.categoria && String(item.categoria).trim()
              ? String(item.categoria).trim()
              : 'Mercado',
          })),
          categoriasSaidas: categoriasNormalizadas,
        }
      })
    })

    return banco
  }

  const [bancoDeDados, setBancoDeDados] = useState(() => {
    const salvo = localStorage.getItem('controle-financeiro-v15')
    if (salvo) {
      try {
        return normalizarBanco(JSON.parse(salvo))
      } catch {
        return criarBancoInicial()
      }
    }

    const legado14 = localStorage.getItem('controle-financeiro-v14')
    if (legado14) {
      try {
        return normalizarBanco(JSON.parse(legado14))
      } catch {
        return criarBancoInicial()
      }
    }

    const legado13 = localStorage.getItem('controle-financeiro-v13')
    if (legado13) {
      try {
        return normalizarBanco(JSON.parse(legado13))
      } catch {
        return criarBancoInicial()
      }
    }

    const legado12 = localStorage.getItem('controle-financeiro-v12')
    if (legado12) {
      try {
        return normalizarBanco(JSON.parse(legado12))
      } catch {
        return criarBancoInicial()
      }
    }

    return criarBancoInicial()
  })

  useEffect(() => {
    let ativo = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!ativo) return
      setSession(session)
      setLoadingAuth(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sessionAtual) => {
      if (!ativo) return
      setSession(sessionAtual)
      setLoadingAuth(false)
    })

    return () => {
      ativo = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('controle-financeiro-tema', JSON.stringify(temaEscuro))
  }, [temaEscuro])

  useEffect(() => {
    localStorage.setItem('controle-financeiro-grafico-itens', JSON.stringify(itensGraficoSelecionados))
  }, [itensGraficoSelecionados])

  useEffect(() => {
    localStorage.setItem('controle-financeiro-grafico-categorias', JSON.stringify(mostrarCategoriasNoGrafico))
  }, [mostrarCategoriasNoGrafico])

  useEffect(() => {
    const salvoItens = localStorage.getItem('controle-financeiro-grafico-itens')
    const salvoCategorias = localStorage.getItem('controle-financeiro-grafico-categorias')

    if (salvoItens) {
      try {
        const parsed = JSON.parse(salvoItens)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItensGraficoSelecionados(parsed)
          itensGraficoAntesCategoriasRef.current = parsed
        }
      } catch {
        // noop
      }
    }

    if (salvoCategorias) {
      try {
        const categoriasAtivas = Boolean(JSON.parse(salvoCategorias))
        setMostrarCategoriasNoGrafico(categoriasAtivas)
        if (categoriasAtivas) {
          setItensGraficoSelecionados([])
        }
      } catch {
        // noop
      }
    }
  }, [])

  useEffect(() => {
    if (!session?.user?.id) {
      setLoadingDados(false)
      setDadosProntos(false)
      return
    }

    let ativo = true

    const carregarDados = async () => {
      setLoadingDados(true)

      const { data, error } = await supabase
        .from('financial_data')
        .select('data')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (!ativo) return

      if (error) {
        console.error('Erro ao carregar dados do Supabase:', error)
        setLoadingDados(false)
        setDadosProntos(true)
        return
      }

      if (data?.data) {
        const bancoNormalizado = normalizarBanco(data.data)
        setBancoDeDados(bancoNormalizado)
        localStorage.setItem('controle-financeiro-v15', JSON.stringify(bancoNormalizado))
      } else {
        const fallbackLocal =
          localStorage.getItem('controle-financeiro-v15') ||
          localStorage.getItem('controle-financeiro-v14') ||
          localStorage.getItem('controle-financeiro-v13')

        const bancoInicial = fallbackLocal
          ? normalizarBanco(JSON.parse(fallbackLocal))
          : criarBancoInicial()

        setBancoDeDados(bancoInicial)

        await supabase.from('financial_data').upsert({
          user_id: session.user.id,
          data: bancoInicial,
          updated_at: new Date().toISOString(),
        })
      }

      setLoadingDados(false)
      setDadosProntos(true)
    }

    carregarDados()

    return () => {
      ativo = false
    }
  }, [session?.user?.id])

  useEffect(() => {
    localStorage.setItem('controle-financeiro-v15', JSON.stringify(bancoDeDados))
  }, [bancoDeDados])

  useEffect(() => {
    if (!session?.user?.id || !dadosProntos) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSincronizando(true)

      const { error } = await supabase.from('financial_data').upsert({
        user_id: session.user.id,
        data: bancoDeDados,
        updated_at: new Date().toISOString(),
      })

      if (error) {
        console.error('Erro ao salvar dados no Supabase:', error)
      }

      setSincronizando(false)
    }, 700)

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [bancoDeDados, session?.user?.id, dadosProntos])

  const formatarNumeroBR = (valor) =>
    Number(valor || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

  const digitsToMoneyString = (digits) => {
    const onlyDigits = String(digits || '').replace(/\D/g, '')
    const normalized = onlyDigits === '' ? '0' : onlyDigits
    const number = Number(normalized) / 100
    return number.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const moneyStringToNumber = (text) => {
    if (!text) return 0
    const normalized = text.replace(/\./g, '').replace(',', '.')
    const n = Number(normalized)
    return Number.isNaN(n) ? 0 : n
  }

  const chaveAtual = `${anoSelecionado}-${mesSelecionado}`
  const dadosAtual = bancoDeDados[chaveAtual] || {
    salario: 0,
    entradas: [],
    fixo: [],
    saidas: [],
    categoriasSaidas: [...categoriasPadrao],
  }

  const salario = Number(dadosAtual.salario || 0)
  const entradas = dadosAtual.entradas || []
  const fixos = dadosAtual.fixo || []
  const saidas = dadosAtual.saidas || []
  const categoriasSaidas = dadosAtual.categoriasSaidas || [...categoriasPadrao]

  useEffect(() => {
    setSalarioTexto(formatarNumeroBR(salario))
  }, [salario, chaveAtual])

  useEffect(() => {
    if (salarioEmEdicao && salarioInputRef.current) {
      salarioInputRef.current.focus()
      salarioInputRef.current.select()
    }
  }, [salarioEmEdicao])

  const saidasFiltradas =
    filtroCategoria === 'Todas'
      ? saidas
      : saidas.filter((item) => item.categoria === filtroCategoria)

  const itensExibidos =
    abaAtiva === 'fixo' ? fixos : abaAtiva === 'entradas' ? entradas : saidasFiltradas

  const totalEntradas = useMemo(
    () => entradas.reduce((acc, item) => acc + Number(item.valor || 0), 0),
    [entradas]
  )

  const totalFixoPago = useMemo(
    () => fixos.filter((item) => item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0),
    [fixos]
  )

  const totalFixoNaoPago = useMemo(
    () => fixos.filter((item) => !item.pago).reduce((acc, item) => acc + Number(item.valor || 0), 0),
    [fixos]
  )

  const totalSaidas = useMemo(
    () => saidas.reduce((acc, item) => acc + Number(item.valor || 0), 0),
    [saidas]
  )

  const totalSaidasGerais = totalFixoPago + totalSaidas
  const saldoMes = salario + totalEntradas - totalSaidasGerais

  const chaveComparacao = `${anoComparacao}-${mesComparacao}`
  const dadosComparacao = bancoDeDados[chaveComparacao] || {
    salario: 0,
    entradas: [],
    fixo: [],
    saidas: [],
    categoriasSaidas: [...categoriasPadrao],
  }

  const saldoComparacao =
    Number(dadosComparacao.salario || 0) +
    (dadosComparacao.entradas || []).reduce((acc, item) => acc + Number(item.valor || 0), 0) -
    (dadosComparacao.fixo || [])
      .filter((item) => item.pago)
      .reduce((acc, item) => acc + Number(item.valor || 0), 0) -
    (dadosComparacao.saidas || []).reduce((acc, item) => acc + Number(item.valor || 0), 0)

  const diferencaSaldo = saldoMes - saldoComparacao

  const totaisCategorias = useMemo(() => {
    const mapa = {}
    categoriasSaidas.forEach((cat) => {
      mapa[cat] = 0
    })
    saidas.forEach((item) => {
      const cat = item.categoria || 'Sem categoria'
      mapa[cat] = (mapa[cat] || 0) + Number(item.valor || 0)
    })
    return mapa
  }, [categoriasSaidas, saidas])

  const dadosPizza = Object.entries(totaisCategorias)
    .filter(([, valor]) => valor > 0)
    .map(([name, value]) => ({ name, value }))

  const totalPizza = dadosPizza.reduce((acc, item) => acc + item.value, 0)

  const definicoesGrafico = {
    salario: { nome: 'Salário', valor: salario, fill: '#16a34a' },
    entradas: { nome: 'Entradas', valor: totalEntradas, fill: '#2563eb' },
    saidas: { nome: 'Saídas', valor: totalSaidas, fill: '#dc2626' },
    fixoPago: { nome: 'Fixo Pago', valor: totalFixoPago, fill: '#7c3aed' },
    fixoNaoPago: { nome: 'Fixo Não Pago', valor: totalFixoNaoPago, fill: '#d97706' },
    saldo: { nome: 'Saldo', valor: saldoMes, fill: saldoMes >= 0 ? '#0891b2' : '#dc2626' },
  }

  const dadosResumo = useMemo(() => {
    if (mostrarCategoriasNoGrafico) {
      return Object.entries(totaisCategorias)
        .filter(([, valor]) => valor > 0)
        .map(([nome, valor], index) => ({
          nome,
          valor,
          fill: coresPizza[index % coresPizza.length],
        }))
    }

    return itensGraficoSelecionados
      .filter((chave) => definicoesGrafico[chave])
      .map((chave) => definicoesGrafico[chave])
  }, [
    itensGraficoSelecionados,
    mostrarCategoriasNoGrafico,
    totaisCategorias,
    salario,
    totalEntradas,
    totalSaidas,
    totalFixoPago,
    totalFixoNaoPago,
    saldoMes,
  ])

  const alturaGraficoResumo = dadosResumo.length > 5 ? 222 : 204
  const maiorValorResumo = dadosResumo.reduce((acc, item) => Math.max(acc, Number(item.valor || 0)), 0)
  const dominioMaximoResumo =
    maiorValorResumo > 0
      ? Number((maiorValorResumo * (maiorValorResumo > 999 ? 1.3 : 1.22)).toFixed(2))
      : 100
  const margemTopoGraficoResumo =
    maiorValorResumo >= 1000 ? 34 : maiorValorResumo >= 500 ? 30 : 24

  const alturaGraficoPizza = dadosPizza.length <= 2 ? 198 : dadosPizza.length <= 4 ? 212 : 224
  const raioExternoPizza =
    dadosPizza.length <= 2 ? 68 : dadosPizza.length <= 4 ? 72 : dadosPizza.length <= 6 ? 76 : 80
  const raioInternoPizza =
    dadosPizza.length <= 3 ? 38 : dadosPizza.length <= 6 ? 42 : 45
  const deslocamentoLabelPizza =
    dadosPizza.length <= 2 ? 18 : dadosPizza.length <= 4 ? 16 : 14

  const formatarMoeda = (valor) =>
    Number(valor || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })

  const handleMaskedMoneyInput = (rawValue, setter) => {
    const digits = rawValue.replace(/\D/g, '')
    setter(digitsToMoneyString(digits))
  }

  const atualizarSalario = (textoMascarado) => {
    setBancoDeDados((prev) => ({
      ...prev,
      [chaveAtual]: {
        ...prev[chaveAtual],
        salario: moneyStringToNumber(textoMascarado),
      },
    }))
  }

  const iniciarEdicaoSalario = () => {
    setSalarioTexto(formatarNumeroBR(salario))
    setSalarioEmEdicao(true)
  }

  const salvarSalarioEdicao = () => {
    atualizarSalario(salarioTexto)
    setSalarioEmEdicao(false)
  }

  const alternarPagoFixo = (id) => {
    setBancoDeDados((prev) => ({
      ...prev,
      [chaveAtual]: {
        ...prev[chaveAtual],
        fixo: prev[chaveAtual].fixo.map((item) =>
          item.id === id ? { ...item, pago: !item.pago } : item
        ),
      },
    }))
  }

  const excluirItem = (id) => {
    const chaveLista = abaAtiva === 'fixo' ? 'fixo' : abaAtiva === 'entradas' ? 'entradas' : 'saidas'
    setBancoDeDados((prev) => ({
      ...prev,
      [chaveAtual]: {
        ...prev[chaveAtual],
        [chaveLista]: prev[chaveAtual][chaveLista].filter((item) => item.id !== id),
      },
    }))
  }

  const abrirModalNovoItem = () => {
    setModoModalItem('novo')
    setItemEditandoId(null)
    setNovoNome('')
    setNovoValor('0,00')
    setNovaCategoria(categoriasSaidas[0] || 'Mercado')
    setModalItemAberto(true)
  }

  const abrirModalEditarItem = (item) => {
    setModoModalItem('editar')
    setItemEditandoId(item.id)
    setNovoNome(item.nome)
    setNovoValor(formatarNumeroBR(item.valor))
    if (abaAtiva === 'saidas') {
      setNovaCategoria(item.categoria || categoriasSaidas[0] || 'Mercado')
    }
    setModalItemAberto(true)
  }

  const fecharModalItem = () => {
    setModalItemAberto(false)
    setModoModalItem('novo')
    setItemEditandoId(null)
    setNovoNome('')
    setNovoValor('')
  }

  const salvarItem = () => {
    if (!novoNome.trim()) return

    const valorConvertido = moneyStringToNumber(novoValor)

    if (modoModalItem === 'novo') {
      const base = {
        id: `${abaAtiva}-${Date.now()}`,
        nome: novoNome.trim(),
        valor: valorConvertido,
      }

      const novoItem =
        abaAtiva === 'fixo'
          ? { ...base, pago: false }
          : abaAtiva === 'entradas'
            ? base
            : { ...base, categoria: novaCategoria || categoriasSaidas[0] || 'Mercado' }

      const chaveLista = abaAtiva === 'fixo' ? 'fixo' : abaAtiva === 'entradas' ? 'entradas' : 'saidas'

      setBancoDeDados((prev) => ({
        ...prev,
        [chaveAtual]: {
          ...prev[chaveAtual],
          [chaveLista]: [...prev[chaveAtual][chaveLista], novoItem],
        },
      }))

      if (abaAtiva === 'fixo') {
        fecharModalItem()
      } else {
        setNovoNome('')
        setNovoValor('0,00')
        if (abaAtiva === 'saidas') {
          setNovaCategoria(categoriasSaidas[0] || 'Mercado')
        }
      }
    } else {
      const chaveLista = abaAtiva === 'fixo' ? 'fixo' : abaAtiva === 'entradas' ? 'entradas' : 'saidas'

      setBancoDeDados((prev) => ({
        ...prev,
        [chaveAtual]: {
          ...prev[chaveAtual],
          [chaveLista]: prev[chaveAtual][chaveLista].map((item) =>
            item.id === itemEditandoId
              ? {
                  ...item,
                  nome: novoNome.trim(),
                  valor: valorConvertido,
                  ...(abaAtiva === 'saidas' ? { categoria: novaCategoria } : {}),
                }
              : item
          ),
        },
      }))

      fecharModalItem()
    }
  }

  const abrirModalNovaCategoria = () => {
    setModoCategoria('nova')
    setCategoriaOriginal('')
    setCategoriaDigitada('')
    setModalCategoriaNomeAberto(true)
  }

  const abrirModalEditarCategoria = (categoria) => {
    setModoCategoria('editar')
    setCategoriaOriginal(categoria)
    setCategoriaDigitada(categoria)
    setModalCategoriaNomeAberto(true)
  }

  const fecharModalCategoriaNome = () => {
    setModalCategoriaNomeAberto(false)
    setModoCategoria('nova')
    setCategoriaOriginal('')
    setCategoriaDigitada('')
  }

  const salvarCategoria = () => {
    const nome = categoriaDigitada.trim()
    if (!nome) return

    if (modoCategoria === 'nova') {
      if (categoriasSaidas.includes(nome)) return

      setBancoDeDados((prev) => ({
        ...prev,
        [chaveAtual]: {
          ...prev[chaveAtual],
          categoriasSaidas: [...prev[chaveAtual].categoriasSaidas, nome],
        },
      }))
    } else {
      if (nome === categoriaOriginal) {
        fecharModalCategoriaNome()
        return
      }

      if (categoriasSaidas.includes(nome)) return

      setBancoDeDados((prev) => ({
        ...prev,
        [chaveAtual]: {
          ...prev[chaveAtual],
          categoriasSaidas: prev[chaveAtual].categoriasSaidas.map((cat) =>
            cat === categoriaOriginal ? nome : cat
          ),
          saidas: prev[chaveAtual].saidas.map((item) =>
            item.categoria === categoriaOriginal ? { ...item, categoria: nome } : item
          ),
        },
      }))

      if (filtroCategoria === categoriaOriginal) {
        setFiltroCategoria(nome)
      }
    }

    fecharModalCategoriaNome()
  }

  const excluirCategoria = (categoria) => {
    if (categoriasPadrao.includes(categoria)) {
      alert('As categorias padrão não podem ser excluídas.')
      return
    }

    const emUso = saidas.some((item) => item.categoria === categoria)
    if (emUso) {
      alert('Essa categoria ainda está sendo usada.')
      return
    }

    setBancoDeDados((prev) => ({
      ...prev,
      [chaveAtual]: {
        ...prev[chaveAtual],
        categoriasSaidas: prev[chaveAtual].categoriasSaidas.filter((cat) => cat !== categoria),
      },
    }))

    if (filtroCategoria === categoria) {
      setFiltroCategoria('Todas')
    }
  }

  const alternarItemGrafico = (chave) => {
    if (mostrarCategoriasNoGrafico) return

    setItensGraficoSelecionados((prev) => {
      if (prev.includes(chave)) {
        if (prev.length === 1) return prev
        const proximo = prev.filter((item) => item !== chave)
        itensGraficoAntesCategoriasRef.current = proximo
        return proximo
      }

      const proximo = [...prev, chave]
      itensGraficoAntesCategoriasRef.current = proximo
      return proximo
    })
  }

  const alternarCategoriasNoGrafico = () => {
    setMostrarCategoriasNoGrafico((prev) => {
      if (!prev) {
        itensGraficoAntesCategoriasRef.current =
          itensGraficoSelecionados.length > 0
            ? itensGraficoSelecionados
            : itensGraficoAntesCategoriasRef.current

        setItensGraficoSelecionados([])
        return true
      }

      const restaurar =
        itensGraficoAntesCategoriasRef.current && itensGraficoAntesCategoriasRef.current.length > 0
          ? itensGraficoAntesCategoriasRef.current
          : ['saldo', 'entradas', 'saidas']

      setItensGraficoSelecionados(restaurar)
      return false
    })
  }

  const renderPieLabel = ({ percent, cx, cy, midAngle, outerRadius, viewBox }) => {
    if (!percent || percent < 0.06) return null

    const RADIAN = Math.PI / 180
    const raio = Number(outerRadius || raioExternoPizza) + deslocamentoLabelPizza
    const brutoX = Number(cx) + raio * Math.cos(-midAngle * RADIAN)
    const brutoY = Number(cy) + raio * Math.sin(-midAngle * RADIAN)

    const largura = Number(viewBox?.width || 240)
    const altura = Number(viewBox?.height || 240)
    const margemHorizontal = 26
    const margemVertical = 20

    const x = Math.min(Math.max(brutoX, margemHorizontal), largura - margemHorizontal)
    const y = Math.min(Math.max(brutoY, margemVertical), altura - margemVertical)
    const ancora =
      brutoX <= margemHorizontal + 6 ? 'start' : brutoX >= largura - margemHorizontal - 6 ? 'end' : 'middle'

    return {
      texto: `${(percent * 100).toFixed(0)}%`,
      x,
      y,
      ancora,
    }
  }

  const corTextoGraficoPizza = temaEscuro ? '#f8fafc' : '#111827'

  const themeClass = temaEscuro ? 'theme-dark' : 'theme-light'
  const corPrefixoModal =
    abaAtiva === 'entradas'
      ? 'money-prefix-green'
      : abaAtiva === 'saidas'
        ? 'money-prefix-red'
        : 'money-prefix-neutral'

  const corValorModal =
    abaAtiva === 'entradas'
      ? 'money-input-green'
      : abaAtiva === 'saidas'
        ? 'money-input-red'
        : 'money-input-neutral'

  const nomeUsuario = session?.user?.email?.split('@')[0] || 'Usuário'

  if (loadingAuth) {
    return (
      <div className={`app-shell ${themeClass}`}>
        <div className="app-wrapper">
          <div className="card loading-auth-card">
            <div className="section-label">Carregando</div>
            <div className="loading-auth-text">Verificando sua sessão...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  if (loadingDados) {
    return (
      <div className={`app-shell ${themeClass}`}>
        <div className="app-wrapper">
          <div className="card loading-auth-card">
            <div className="section-label">Sincronizando</div>
            <div className="loading-auth-text">Carregando seus dados do Supabase...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`app-shell ${themeClass}`}>
        <div className="app-wrapper">
          <div className="layout-principal">
            <aside className="sidebar-esquerda">
              <div className="card salary-sidebar-card">
                <div className="section-label">Salário do mês</div>

                {salarioEmEdicao ? (
                  <div className="salary-sidebar-edit">
                    <span className="salary-sidebar-prefix">R$</span>
                    <input
                      ref={salarioInputRef}
                      type="text"
                      value={salarioTexto}
                      onChange={(e) => handleMaskedMoneyInput(e.target.value, setSalarioTexto)}
                      onBlur={salvarSalarioEdicao}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') salvarSalarioEdicao()
                        if (e.key === 'Escape') {
                          setSalarioTexto(formatarNumeroBR(salario))
                          setSalarioEmEdicao(false)
                        }
                      }}
                      className="salary-sidebar-input"
                      inputMode="numeric"
                      placeholder="0,00"
                    />
                  </div>
                ) : (
                  <div className="salary-sidebar-display">
                    <span className="salary-sidebar-value">{formatarMoeda(salario)}</span>
                    <button
                      onClick={iniciarEdicaoSalario}
                      className="icon-action-btn centered-icon-btn"
                      title="Editar salário"
                    >
                      ✎
                    </button>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="mini-label spacing-bottom">Anos</div>
                <div className="mini-grid mini-grid-anos">
                  {listaAnos.map((ano) => (
                    <button
                      key={ano}
                      onClick={() => setAnoSelecionado(ano)}
                      className={`mini-btn ${anoSelecionado === ano ? 'ativo' : ''}`}
                    >
                      {ano}
                    </button>
                  ))}
                </div>

                <div className="mini-label spacing-top spacing-bottom">Meses</div>
                <div className="mini-grid mini-grid-meses">
                  {meses.map((mes, index) => (
                    <button
                      key={mes}
                      onClick={() => setMesSelecionado(mes)}
                      className={`mini-btn ${mesSelecionado === mes ? 'ativo' : ''}`}
                    >
                      {mesesCurtos[index]}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            <main className="conteudo-direita">
              <section className="top-dashboard-section">
                <div className="card hero-card">
                  <div className="hero-top hero-top-premium">
                    <div className="hero-title-row">
                      <div className="hero-title-balance-wrap">
                        <div>
                          <h1 className="main-title">Controle Financeiro</h1>
                          <div className="subtitle">
                            {mesSelecionado} de {anoSelecionado}
                          </div>
                        </div>
                      </div>

                      <div className="top-actions">
                        {sincronizando && (
                          <div className="sync-badge">
                            Salvando...
                          </div>
                        )}

                        <button
                          onClick={() => setTemaEscuro((prev) => !prev)}
                          className="theme-toggle-btn"
                          title="Alternar tema"
                        >
                          {temaEscuro ? '☀' : '☾'}
                        </button>

                        <button
                          onClick={() => supabase.auth.signOut()}
                          className="logout-btn"
                          title="Sair"
                        >
                          Sair ({nomeUsuario})
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="cards-resumo cards-resumo-auto">
                    <div className="resumo-card">
                      <div className="resumo-label">ENTRADAS</div>
                      <div className="resumo-valor green">{formatarMoeda(totalEntradas)}</div>
                    </div>

                    <div className="resumo-card">
                      <div className="resumo-label">SAÍDAS</div>
                      <div className="resumo-valor red">{formatarMoeda(totalSaidas)}</div>
                    </div>

                    <div className="resumo-card resumo-card-fixo-pago">
                      <div className="resumo-label">FIXO PAGO</div>
                      <div className="resumo-valor resumo-fixo-pago-valor">{formatarMoeda(totalFixoPago)}</div>
                    </div>

                    <div className="resumo-card">
                      <div className="resumo-label">FIXO NÃO PAGO</div>
                      <div className="resumo-valor amber">{formatarMoeda(totalFixoNaoPago)}</div>
                    </div>

                    <div className="resumo-card resumo-card-saldo-atual">
                      <div className="resumo-label">SALDO ATUAL</div>
                      <div
                        className={`resumo-valor ${saldoMes >= 0 ? 'green' : 'red'}`}
                      >
                        {formatarMoeda(saldoMes)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="charts-grid">
                  <div className="card card-chart">
                    <div className="chart-header-top">
                      <div className="section-label">Resumo visual do mês</div>
                    </div>

                    <div className="chart-filter-panel">
                      <div className="chart-filter-title">Itens do gráfico</div>

                      <div className="chart-filter-pills">
                        {opcoesGraficoResumo.map((opcao) => (
                          <button
                            key={opcao.chave}
                            type="button"
                            onClick={() => alternarItemGrafico(opcao.chave)}
                            className={`chart-pill ${itensGraficoSelecionados.includes(opcao.chave) && !mostrarCategoriasNoGrafico ? 'ativo' : ''}`}
                          >
                            {opcao.label}
                          </button>
                        ))}

                        <button
                          type="button"
                          onClick={alternarCategoriasNoGrafico}
                          className={`chart-pill chart-pill-categorias ${mostrarCategoriasNoGrafico ? 'ativo' : ''}`}
                        >
                          Categorias das saídas
                        </button>
                      </div>
                    </div>

                    <div className="chart-box chart-box-fluid">
                      <ResponsiveContainer width="100%" height={alturaGraficoResumo}>
                        <BarChart
                          data={dadosResumo}
                          barCategoryGap={14}
                          margin={{ top: margemTopoGraficoResumo, right: 2, left: -8, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="nome"
                            tick={{ fontSize: 10, fontWeight: 700 }}
                            interval={0}
                            angle={dadosResumo.length > 5 ? -12 : 0}
                            textAnchor={dadosResumo.length > 5 ? 'end' : 'middle'}
                            height={dadosResumo.length > 5 ? 40 : 24}
                          />
                          <YAxis
                            width={48}
                            domain={[0, dominioMaximoResumo]}
                            tickFormatter={(v) =>
                              Number(v).toLocaleString('pt-BR', {
                                notation: 'compact',
                                compactDisplay: 'short',
                              })
                            }
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip formatter={(value) => formatarMoeda(value)} />
                          <Bar dataKey="valor" radius={[12, 12, 8, 8]} maxBarSize={42}>
                            {dadosResumo.map((entry, index) => (
                              <Cell key={index} fill={entry.fill} />
                            ))}
                            <LabelList
                              dataKey="valor"
                              position="top"
                              formatter={(value) => formatarMoeda(value)}
                              style={{ fontSize: 9, fontWeight: 800 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="card card-chart">
                    <div className="section-label">Saídas por categoria</div>
                    <div className="pie-side-layout auto-fit-pie">
                      <div className="pie-chart-side" style={{ height: alturaGraficoPizza }}>
                        {dadosPizza.length === 0 ? (
                          <div className="empty-chart">Nenhuma saída categorizada ainda.</div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                              <Pie
                                data={dadosPizza}
                                cx="50%"
                                cy="50%"
                                outerRadius={raioExternoPizza}
                                innerRadius={raioInternoPizza}
                                dataKey="value"
                                nameKey="name"
                                paddingAngle={dadosPizza.length > 1 ? 2 : 0}
                                labelLine={false}
                                label={(props) => {
                                  const label = renderPieLabel(props)
                                  if (!label) return null

                                  return (
                                    <text
                                      x={label.x}
                                      y={label.y}
                                      fill={corTextoGraficoPizza}
                                      textAnchor={label.ancora}
                                      dominantBaseline="central"
                                      fontSize={10}
                                      fontWeight={800}
                                    >
                                      {label.texto}
                                    </text>
                                  )
                                }}
                              >
                                {dadosPizza.map((_, index) => (
                                  <Cell key={index} fill={coresPizza[index % coresPizza.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => formatarMoeda(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>

                      {dadosPizza.length > 0 && (
                        <div className="pie-side-legend auto-grow-legend">
                          {dadosPizza.map((item, index) => {
                            const percentual = totalPizza > 0 ? (item.value / totalPizza) * 100 : 0
                            return (
                              <div key={item.name} className="legend-item premium-legend-item">
                                <span
                                  className="legend-dot"
                                  style={{ backgroundColor: coresPizza[index % coresPizza.length] }}
                                />
                                <div className="legend-text-group">
                                  <span className="legend-name">{item.name}</span>
                                  <span className="legend-sub">
                                    {formatarMoeda(item.value)} · {percentual.toFixed(1).replace('.', ',')}%
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                <div className="card comparacao-card-premium dashboard-compare-card">
                  <div className="section-label">Comparação com mês selecionado</div>

                  <div className="dashboard-bottom-grid">
                    <div className="compare-pretty-grid compare-pretty-grid-inline">
                      <div className="compare-select-card">
                        <div className="compare-small-label">Ano</div>
                        <select
                          value={anoComparacao}
                          onChange={(e) => setAnoComparacao(Number(e.target.value))}
                          className="select-clean select-compare"
                        >
                          {listaAnos.map((ano) => (
                            <option key={ano} value={ano}>
                              {ano}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="compare-select-card">
                        <div className="compare-small-label">Mês</div>
                        <select
                          value={mesComparacao}
                          onChange={(e) => setMesComparacao(e.target.value)}
                          className="select-clean select-compare"
                        >
                          {meses.map((mes) => (
                            <option key={mes} value={mes}>
                              {mes}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="fancy-compare-block dashboard-compare-metric">
                      <div className="comparacao-small">Saldo do mês comparado</div>
                      <div className="comparacao-strong">{formatarMoeda(saldoComparacao)}</div>
                    </div>

                    <div className="diferenca-box dashboard-compare-metric">
                      <div className="comparacao-small">Diferença de saldo</div>
                      <div
                        className="comparacao-big"
                        style={{ color: diferencaSaldo >= 0 ? '#16a34a' : '#dc2626' }}
                      >
                        {diferencaSaldo >= 0 ? '+' : '-'}
                        {formatarMoeda(Math.abs(diferencaSaldo))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {abaAtiva === 'saidas' && (
                <div className="card">
                  <div className="categorias-header">
                    <div className="section-label">Categorias das saídas</div>
                    <div className="categoria-toolbar">
                      <button onClick={abrirModalNovaCategoria} className="mini-action-btn">
                        + Nova categoria
                      </button>
                      <button
                        onClick={() => setModalCategoriasAberto(true)}
                        className="mini-action-btn secondary"
                      >
                        Gerenciar categorias
                      </button>
                    </div>
                  </div>

                  <div className="filtro-premium">
                    <button
                      onClick={() => setFiltroCategoria('Todas')}
                      className={`filtro-pill ${filtroCategoria === 'Todas' ? 'ativo' : ''}`}
                    >
                      Todas
                    </button>

                    {categoriasSaidas.map((categoria) => (
                      <button
                        key={categoria}
                        onClick={() => setFiltroCategoria(categoria)}
                        className={`filtro-pill ${filtroCategoria === categoria ? 'ativo' : ''}`}
                      >
                        {categoria}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="card table-card">
                <div className="table-topbar">
                  <div className="abas-wrapper">
                    <button
                      onClick={() => setAbaAtiva('fixo')}
                      className={`aba-btn ${abaAtiva === 'fixo' ? 'ativo' : ''}`}
                    >
                      FIXO
                    </button>
                    <button
                      onClick={() => setAbaAtiva('entradas')}
                      className={`aba-btn ${abaAtiva === 'entradas' ? 'ativo' : ''}`}
                    >
                      ENTRADAS
                    </button>
                    <button
                      onClick={() => setAbaAtiva('saidas')}
                      className={`aba-btn ${abaAtiva === 'saidas' ? 'ativo' : ''}`}
                    >
                      SAÍDAS
                    </button>
                  </div>

                  <button onClick={abrirModalNovoItem} className="add-btn">
                    + Adicionar em {abaAtiva === 'fixo' ? 'Gastos Fixos' : abaAtiva === 'entradas' ? 'Entradas' : 'Saídas'}
                  </button>
                </div>

                <div
                  className={
                    abaAtiva === 'fixo'
                      ? 'table-header-fixo'
                      : abaAtiva === 'saidas'
                        ? 'table-header-saidas'
                        : 'table-header-entradas'
                  }
                >
                  {abaAtiva === 'fixo' ? (
                    <>
                      <div className="header-cell-left">Categoria</div>
                      <div className="header-cell-center">Valor</div>
                      <div className="header-cell-center">Pagamento</div>
                      <div className="header-cell-center">Ações</div>
                    </>
                  ) : abaAtiva === 'saidas' ? (
                    <>
                      <div className="header-cell-left">Categoria</div>
                      <div className="header-cell-center">Categoria</div>
                      <div className="header-cell-center">Valor</div>
                      <div className="header-cell-center">Ações</div>
                    </>
                  ) : (
                    <>
                      <div className="header-cell-left">Categoria</div>
                      <div className="header-cell-center">Valor</div>
                      <div className="header-cell-center">Ações</div>
                    </>
                  )}
                </div>

                {itensExibidos.length === 0 ? (
                  <div className="empty-state">Nenhum item cadastrado nesta aba.</div>
                ) : abaAtiva === 'fixo' ? (
                  itensExibidos.map((item, index) => (
                    <div
                      key={item.id}
                      className="table-row-fixo premium-row compact-row"
                      style={{
                        borderBottom: index !== itensExibidos.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div className="row-main-info">
                        <span className="row-title">{item.nome}</span>
                      </div>

                      <div className="row-value neutral-value row-value-centered">
                        {formatarMoeda(item.valor)}
                      </div>

                      <div className="cell-center">
                        <button
                          onClick={() => alternarPagoFixo(item.id)}
                          className="status-btn"
                          style={{ backgroundColor: item.pago ? '#16a34a' : '#dc2626' }}
                        >
                          {item.pago ? 'Pago' : 'Não pago'}
                        </button>
                      </div>

                      <div className="row-actions row-actions-centered">
                        <button
                          onClick={() => abrirModalEditarItem(item)}
                          className="icon-action-btn centered-icon-btn"
                          title="Editar"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => excluirItem(item.id)}
                          className="delete-icon-btn centered-icon-btn"
                          title="Excluir"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                ) : abaAtiva === 'saidas' ? (
                  itensExibidos.map((item, index) => (
                    <div
                      key={item.id}
                      className="table-row-saidas premium-row compact-row"
                      style={{
                        borderBottom: index !== itensExibidos.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div className="row-main-info">
                        <span className="row-title">{item.nome}</span>
                      </div>

                      <div className="cell-center">
                        <div className="row-type-pill">{item.categoria}</div>
                      </div>

                      <div className="row-value red-text row-value-centered">
                        {formatarMoeda(item.valor)}
                      </div>

                      <div className="row-actions row-actions-centered">
                        <button
                          onClick={() => abrirModalEditarItem(item)}
                          className="icon-action-btn centered-icon-btn"
                          title="Editar"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => excluirItem(item.id)}
                          className="delete-icon-btn centered-icon-btn"
                          title="Excluir"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  itensExibidos.map((item, index) => (
                    <div
                      key={item.id}
                      className="table-row-entradas premium-row compact-row"
                      style={{
                        borderBottom: index !== itensExibidos.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div className="row-main-info">
                        <span className="row-title">{item.nome}</span>
                      </div>

                      <div className="row-value green-text row-value-centered">
                        {formatarMoeda(item.valor)}
                      </div>

                      <div className="row-actions row-actions-centered">
                        <button
                          onClick={() => abrirModalEditarItem(item)}
                          className="icon-action-btn centered-icon-btn"
                          title="Editar"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => excluirItem(item.id)}
                          className="delete-icon-btn centered-icon-btn"
                          title="Excluir"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}

                <div
                  className={
                    abaAtiva === 'fixo'
                      ? 'table-total table-total-fixo'
                      : abaAtiva === 'saidas'
                        ? 'table-total table-total-saidas'
                        : 'table-total table-total-entradas'
                  }
                >
                  {abaAtiva === 'fixo' ? (
                    <>
                      <span className="table-total-label">Total Gastos Fixos Pagos</span>
                      <span className="table-total-value">{formatarMoeda(totalFixoPago)}</span>
                      <span></span>
                      <span></span>
                    </>
                  ) : abaAtiva === 'entradas' ? (
                    <>
                      <span className="table-total-label">Total Entradas</span>
                      <span className="table-total-value">{formatarMoeda(totalEntradas)}</span>
                      <span></span>
                    </>
                  ) : (
                    <>
                      <span className="table-total-label">
                        {filtroCategoria === 'Todas' ? 'Total Saídas' : `Total Saídas · ${filtroCategoria}`}
                      </span>
                      <span></span>
                      <span className="table-total-value">
                        {formatarMoeda(
                          saidasFiltradas.reduce((acc, item) => acc + Number(item.valor || 0), 0)
                        )}
                      </span>
                      <span></span>
                    </>
                  )}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {modalItemAberto && (
        <div className="modal-overlay" onClick={fecharModalItem}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {modoModalItem === 'novo' ? 'Adicionar' : 'Editar'} em{' '}
              {abaAtiva === 'fixo' ? 'Gastos Fixos' : abaAtiva === 'entradas' ? 'Entradas' : 'Saídas'}
            </div>

            <div className="modal-field">
              <label className="modal-label">Nome</label>
              <input
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Digite o nome"
                className="modal-input"
              />
            </div>

            {abaAtiva === 'saidas' && (
              <div className="modal-field">
                <label className="modal-label">Categoria</label>
                <select
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  className="select-clean"
                >
                  {categoriasSaidas.map((categoria) => (
                    <option key={categoria} value={categoria}>
                      {categoria}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="modal-field">
              <label className="modal-label">Valor</label>
              <div className="money-edit-wrap compact-money-wrap">
                <span className={`money-prefix-fixed compact-prefix ${corPrefixoModal}`}>R$</span>
                <input
                  type="text"
                  value={novoValor}
                  onChange={(e) => handleMaskedMoneyInput(e.target.value, setNovoValor)}
                  className={`money-edit-input compact-money-input ${corValorModal}`}
                  inputMode="numeric"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={fecharModalItem} className="modal-cancel">
                Cancelar
              </button>
              <button onClick={salvarItem} className="modal-save">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCategoriasAberto && (
        <div className="modal-overlay" onClick={() => setModalCategoriasAberto(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Gerenciar categorias</div>

            <div className="category-list-manager">
              {categoriasSaidas.map((categoria) => (
                <div key={categoria} className="category-manage-row">
                  <span>{categoria}</span>
                  <div className="category-manage-actions">
                    <button onClick={() => abrirModalEditarCategoria(categoria)} className="manage-btn">
                      Renomear
                    </button>
                    <button onClick={() => excluirCategoria(categoria)} className="manage-btn danger">
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button onClick={() => setModalCategoriasAberto(false)} className="modal-save">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalCategoriaNomeAberto && (
        <div className="modal-overlay" onClick={fecharModalCategoriaNome}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {modoCategoria === 'nova' ? 'Nova categoria' : 'Renomear categoria'}
            </div>

            <div className="modal-field">
              <label className="modal-label">Nome</label>
              <input
                type="text"
                value={categoriaDigitada}
                onChange={(e) => setCategoriaDigitada(e.target.value)}
                className="modal-input"
                placeholder="Digite o nome"
              />
            </div>

            <div className="modal-actions">
              <button onClick={fecharModalCategoriaNome} className="modal-cancel">
                Cancelar
              </button>
              <button onClick={salvarCategoria} className="modal-save">
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
