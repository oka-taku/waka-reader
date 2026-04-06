import { createRoute } from 'honox/factory'
import { chatCompletionWaka } from '../../lib/openai-rest'

export const POST = createRoute(async (c) => {
  try {
    const body = await c.req.json<{ image?: string }>()
    if (!body?.image) {
      return c.json({ error: '画像データが提供されていません' }, 400)
    }

    let imageData = body.image
    if (imageData.startsWith('data:image')) {
      imageData = imageData.split(',')[1] ?? imageData
    }

    try {
      const decoded = Buffer.from(imageData, 'base64')
      if (decoded.length < 10) throw new Error('Invalid image data')
    } catch {
      return c.json({ error: '無効な画像形式です' }, 400)
    }

    const content = await chatCompletionWaka(imageData)

    let waka: string
    let hiragana: string
    try {
      const jsonObj = JSON.parse(content) as { original?: string; hiragana?: string }
      waka = jsonObj.original ?? content
      hiragana = jsonObj.hiragana ?? content
    } catch {
      waka = content
      hiragana = content
    }

    return c.json({ waka, hiragana, success: true })
  } catch (e) {
    console.error(e)
    const message = e instanceof Error ? e.message : '処理中にエラーが発生しました'
    return c.json({ error: `処理中にエラーが発生しました: ${message}` }, 500)
  }
})
