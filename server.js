require('dotenv').config()

const express = require('express')
const cors = require('cors')

const { createClient } = require('@supabase/supabase-js')

const app = express()

app.use(cors())
app.use(express.json())

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

// TESTE
app.get('/', (req, res) => {
  res.send('🎪 Backend do Arraiá funcionando!')
})

// PEGAR PRODUTOS
app.get('/produtos', async (req, res) => {

  const { data, error } = await supabase
    .from('produtos')
    .select('*')

  if(error){
    return res.status(500).json(error)
  }

  res.json(data)

})

// CRIAR PEDIDO
app.post('/pedido', async (req, res) => {

  const pedido = req.body

  console.log('🛒 Pedido recebido:', pedido)

  res.json({
    sucesso: true,
    mensagem: 'Pedido realizado com sucesso!'
  })

})

app.listen(process.env.PORT, () => {
  console.log(`🔥 Servidor rodando em http://localhost:${process.env.PORT}`)
})