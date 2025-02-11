import { Hono } from 'hono'
import { env } from 'hono/adapter'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { generateObject } from 'ai'
import { createGroq } from '@ai-sdk/groq'

const app = new Hono()
  .use(logger())
  .use(cors()) // Menambahkan middleware CORS

// input
const requestSchema = z.object({
  topic: z.string(),
  number_question: z.number()
})

// output
const outputSchema = z.object({
  question: z.string(),
  options: z.array(z.string()),
  correctAnswer: z.string(),
})

// Global error handling middleware
app.onError((err, c) => {
  console.error('Error:', err)

  if (err instanceof z.ZodError) {
    return c.json({ error: 'Validation error', details: err.errors }, 400)
  }
  if (err.message.includes('API key')) {
    return c.json({ error: 'API key error', message: 'Invalid or missing GROQ_API_KEY.' }, 401)
  }
  return c.json({ error: 'Internal server error', message: 'Unexpected error occurred.' }, 500)
})

app.get('/', (c) => {
  return c.text('Hello, World!')
})


// API endpoint to generate questions
app.post('/ai/quiz', zValidator('json', requestSchema), async (c) => {
  const { topic, number_question } = c.req.valid('json')

  const { GROQ_API_KEY } = env<{ GROQ_API_KEY: string }>(c)

  const groq = createGroq({ apiKey: GROQ_API_KEY })

  const { object } = await generateObject({
    model: groq("gemma2-9b-it"),
    output: 'array',
    schema: outputSchema,
    prompt: `Buatkan ${number_question} soal pilihan ganda tentang ${topic} berbahasa indonesia. Setiap soal memiliki 4 opsi jawaban, dan satu jawaban yang benar.`,
  })
  return c.json(object)
})

export default app
