import { Hono } from 'hono'
import { env } from 'hono/adapter'
import { logger } from 'hono/logger'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { generateObject } from 'ai'
import { createGroq } from '@ai-sdk/groq'

const app = new Hono().use(logger())

// Validate request body
const requestSchema = z.object({
  topik: z.string(),
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

// API endpoint to generate questions
app.post('/api/chat', zValidator('json', requestSchema), async (c) => {
  const { topik } = c.req.valid('json')
  const { GROQ_API_KEY } = env<{ GROQ_API_KEY: string }>(c)

  if (!GROQ_API_KEY) throw new Error('API key missing')

  const groq = createGroq({ apiKey: GROQ_API_KEY })

  const { object } = await generateObject({
    model: groq("gemma2-9b-it"),
    output: 'array',
    schema: z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctAnswer: z.string(),
    }),
    prompt: `Buatkan soal pilihan ganda tentang ${topik}. 
             Setiap soal memiliki 4 opsi jawaban, dan satu jawaban yang benar.`,
  })

  return c.json(object)
})

export default app