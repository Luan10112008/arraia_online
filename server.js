require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')

const { createClient } = require('@supabase/supabase-js')

const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname)))

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// Cache simples em memória
let produtosCache = null
let ultimaAtualizacao = null
const CACHE_DURATION = 1000 * 60 * 5 // 5 minutos

// Produtos de exemplo (fallback)
const PRODUTOS_EXEMPLO = [
  {
    id: 1,
    nome: 'Pamonha',
    categoria: '🌽 Barraca Tradicional',
    descricao: 'Pamonha cremosa tradicional feita na hora. Com milho fresco e sabor típico da roça.',
    preco: 12,
    imagem: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ7sbQOnV1mkbb51j3Gjl1dSibjlh88ZmqSgA&s'
  },
  {
    id: 2,
    nome: 'Canjica',
    categoria: '🍚 Doces Juninos',
    descricao: 'Canjica doce com leite condensado e canela. Receita caseira deliciosa.',
    preco: 15,
    imagem: 'https://cdn0.umcomo.com.br/pt/posts/6/2/3/como_fazer_canjica_9326_600.jpg'
  },
  {
    id: 3,
    nome: 'Cachorro-Quente',
    categoria: '🌭 Lanches da Festa',
    descricao: 'Cachorro-quente completo com molho especial, milho e batata palha crocante.',
    preco: 18,
    imagem: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRdkJdjiUyZbYQmnZwYBfa5BljatiQJUeTv9Q&s'
  },
  {
    id: 4,
    nome: 'Pipoca',
    categoria: '🍿 Snacks Juninos',
    descricao: 'Pipoca amanteigada fresquinha da festa. Crocante e feita na hora.',
    preco: 8,
    imagem: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?q=80&w=1200&auto=format&fit=crop'
  }
]

// TESTE
app.get('/', (req, res) => {
  res.send('🎪 Backend do Arraiá funcionando!')
})

// TESTE - Para verificar se produtosCache está funcionando
app.get('/teste', (req, res) => {
  res.json({
    status: 'ok',
    message: '✅ Servidor respondendo normalmente',
    cache: produtosCache ? `${produtosCache.length} produtos em cache` : 'sem cache',
    timestamp: new Date().toISOString()
  })
})

// PEGAR PRODUTOS COM CACHE
app.get('/produtos', async (req, res) => {
  try {
    // Verificar se tem cache válido
    if (produtosCache && ultimaAtualizacao && (Date.now() - ultimaAtualizacao) < CACHE_DURATION) {
      res.set('X-Cache', 'HIT')
      return res.json(produtosCache)
    }

    let data = null
    
    // Tentar buscar do Supabase
    const { data: supaData, error } = await supabase
      .from('produtos')
      .select('*')

    if (!error && supaData && supaData.length > 0) {
      // Se conseguiu do Supabase, usar esses dados
      data = supaData
      console.log('✅ Produtos carregados do Supabase')
    } else {
      // Se erro ou vazio, usar produtos de exemplo
      data = PRODUTOS_EXEMPLO
      console.log('⚠️ Supabase não disponível, usando produtos de exemplo')
    }

    // Salvar em cache
    produtosCache = data
    ultimaAtualizacao = Date.now()
    
    // Headers de cache para o cliente
    res.set('Cache-Control', 'public, max-age=300')
    res.set('X-Cache', 'MISS')
    
    res.json(data)
  } catch (erro) {
    console.error('Erro:', erro)
    // Em caso de erro, retornar produtos de exemplo
    res.json(PRODUTOS_EXEMPLO)
  }
})

// CRIAR PEDIDO
app.post('/pedido', async (req, res) => {
  try {
    const pedido = req.body

    console.log('🛒 Pedido recebido:', pedido)

    res.json({
      sucesso: true,
      mensagem: 'Pedido realizado com sucesso!'
    })
  } catch (erro) {
    console.error('Erro ao processar pedido:', erro)
    res.status(500).json({ erro: 'Erro ao processar pedido' })
  }
})

// AGENDAMENTOS - Sistema de Fila Virtual
let agendamentos = []

// CRIAR AGENDAMENTO
app.post('/agendamento', async (req, res) => {
  try {
    const agendamento = req.body
    
    // Validar dados
    if (!agendamento.nome || !agendamento.email || !agendamento.telefone || !agendamento.horario) {
      return res.status(400).json({ erro: 'Dados incompletos' })
    }
    
    // Salvar agendamento
    agendamentos.push(agendamento)
    
    console.log(`💋 Agendamento realizado: ${agendamento.nome} - ${agendamento.horario}`)
    
    res.json({
      sucesso: true,
      mensagem: 'Agendamento realizado com sucesso!',
      agendamento
    })
  } catch (erro) {
    console.error('Erro ao criar agendamento:', erro)
    res.status(500).json({ erro: 'Erro ao criar agendamento' })
  }
})

// LISTAR AGENDAMENTOS
app.get('/agendamentos', (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=60')
    res.json(agendamentos)
  } catch (erro) {
    console.error('Erro ao listar agendamentos:', erro)
    res.status(500).json({ erro: 'Erro ao listar agendamentos' })
  }
})

// OBTER AGENDAMENTOS DE UM HORÁRIO
app.get('/agendamentos/:horario', (req, res) => {
  try {
    const horario = req.params.horario
    const agendamentosHorario = agendamentos.filter(a => a.horario === horario)
    
    res.json({
      horario,
      total: agendamentosHorario.length,
      agendamentos: agendamentosHorario
    })
  } catch (erro) {
    console.error('Erro ao buscar agendamentos:', erro)
    res.status(500).json({ erro: 'Erro ao buscar agendamentos' })
  }
})

// DELETAR AGENDAMENTO (quando o cliente chegou)
app.delete('/agendamento/:senha', (req, res) => {
  try {
    const senha = parseInt(req.params.senha)
    const index = agendamentos.findIndex(a => a.senha === senha)
    
    if (index === -1) {
      return res.status(404).json({ erro: 'Agendamento não encontrado' })
    }
    
    const agendamentoRemovido = agendamentos.splice(index, 1)[0]
    console.log(`✅ Agendamento atendido: ${agendamentoRemovido.nome}`)
    
    res.json({
      sucesso: true,
      mensagem: 'Agendamento removido com sucesso!'
    })
  } catch (erro) {
    console.error('Erro ao deletar agendamento:', erro)
    res.status(500).json({ erro: 'Erro ao deletar agendamento' })
  }
})

app.listen(process.env.PORT, () => {
  console.log(`🔥 Servidor rodando em http://localhost:${process.env.PORT}`)
})