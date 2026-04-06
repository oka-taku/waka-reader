import OpenAI from 'openai'

function getBaseUrl(): string | undefined {
  const base = process.env.OPENAI_API_BASE?.replace(/\/$/, '')
  return base || undefined
}

function requireApiKey(): string {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')
  return key
}

function getClient(): OpenAI {
  return new OpenAI({
    apiKey: requireApiKey(),
    baseURL: getBaseUrl()
  })
}

export async function chatCompletionWaka(imageBase64Raw: string): Promise<string> {
  const openai = getClient()

  const userPrompt =
    'この画像を見て、その情景や雰囲気を表現した美しい和歌を一首詠んでください。\n' +
    '和歌は5-7-5-7-7の音律に従い、季節感や自然の美しさ、感情を込めて作成してください。\n' +
    'JSON形式でオリジナルの和歌と全てひらがなに変換した和歌を返してください。\n' +
    '出力フォーマット:\n' +
    '{\n' +
    '  "original": "オリジナルの和歌",\n' +
    '  "hiragana": "すべてひらがなに変換した和歌"\n' +
    '}\n'

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'あなたは和歌を詠む日本の歌人です。' },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${imageBase64Raw}` }
          }
        ]
      }
    ],
    response_format: { type: 'json_object' },
    max_tokens: 300
  })

  const content = completion.choices[0]?.message?.content
  if (!content) throw new Error('AIからの応答がありません')
  return content
}

export async function createSpeechWav(text: string, voice: string): Promise<ArrayBuffer> {
  const openai = getClient()

  const response = await openai.audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice,
    input: text,
    response_format: 'wav',
    instructions:
      'Ghost of Tsushimaの主人公のように、落ち着いた上品な口調で、ゆっくり読んでください。'
  })

  return response.arrayBuffer()
}
