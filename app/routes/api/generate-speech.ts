import { createRoute } from 'honox/factory'
import { createSpeechWav } from '../../lib/openai-rest'

export const POST = createRoute(async (c) => {
  try {
    const body = await c.req.json<{ text?: string; voice?: string }>()
    if (!body?.text) {
      return c.json({ error: 'テキストが提供されていません' }, 400)
    }

    const { text, voice = 'alloy' } = body
    if (text.length > 4096) {
      return c.json({ error: 'テキストが長すぎます（4096文字以下にしてください）' }, 400)
    }

    const buf = await createSpeechWav(text, voice)
    return new Response(buf, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store'
      }
    })
  } catch (e) {
    console.error(e)
    const message = e instanceof Error ? e.message : String(e)
    return c.json({ error: `音声生成中にエラーが発生しました: ${message}` }, 500)
  }
})
