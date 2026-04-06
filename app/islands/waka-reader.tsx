import { useState } from 'hono/jsx'

export default function WakaReader() {
  const [currentImageData, setCurrentImageData] = useState<string | null>(null)
  const [previewVisible, setPreviewVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resultVisible, setResultVisible] = useState(false)
  const [waka, setWaka] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorVisible, setErrorVisible] = useState(false)
  const [audioDisabled, setAudioDisabled] = useState(true)
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null)

  const showError = (message: string) => {
    setError(message)
    setErrorVisible(true)
    setTimeout(() => setErrorVisible(false), 5000)
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showError('画像ファイルを選択してください。')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      showError('ファイルサイズが大きすぎます。10MB以下の画像を選択してください。')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = ev.target?.result
      if (typeof data === 'string') {
        if (currentAudioUrl) {
          URL.revokeObjectURL(currentAudioUrl)
          setCurrentAudioUrl(null)
        }
        setCurrentImageData(data)
        setPreviewVisible(true)
        setResultVisible(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const generateSpeech = async (text: string) => {
    try {
      setAudioDisabled(true)
      const response = await fetch('/api/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'ash' })
      })
      if (!response.ok) throw new Error('音声生成に失敗しました。')
      const audioBlob = await response.blob()
      const url = URL.createObjectURL(audioBlob)
      if (currentAudioUrl) URL.revokeObjectURL(currentAudioUrl)
      setCurrentAudioUrl(url)
      setAudioDisabled(false)
    } catch {
      showError('音声生成に失敗しました。')
    }
  }

  const analyze = async () => {
    if (!currentImageData) {
      showError('画像を選択してください。')
      return
    }
    setLoading(true)
    setResultVisible(false)
    setErrorVisible(false)
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: currentImageData })
      })
      const data = (await response.json()) as {
        error?: string
        success?: boolean
        waka?: string
        hiragana?: string
      }
      if (!response.ok) throw new Error(data.error || 'サーバーエラーが発生しました。')
      if (data.success && data.waka) {
        setWaka(data.waka)
        setResultVisible(true)
        if (data.hiragana) await generateSpeech(data.hiragana)
      } else {
        throw new Error('和歌の生成に失敗しました。')
      }
    } catch (e) {
      console.error(e)
      showError(e instanceof Error ? e.message : '処理中にエラーが発生しました。')
    } finally {
      setLoading(false)
    }
  }

  const playAudio = () => {
    if (!currentAudioUrl) return
    const audio = new Audio(currentAudioUrl)
    audio.play().catch(() => showError('音声の再生に失敗しました。'))
  }

  const downloadAudio = () => {
    if (!currentAudioUrl) return
    const a = document.createElement('a')
    a.href = currentAudioUrl
    a.download = 'waka_reading.wav'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div class="waka-container">
      <header class="waka-header">
        <p class="waka-kicker" aria-hidden="true">
          情景を詠む
        </p>
        <h1>和歌リーダー</h1>
        <div class="waka-title-rule" aria-hidden="true" />
        <p class="waka-subtitle">
          画像をお預かりし、その趣を読み取って短歌を一首。静かにお楽しみください。
        </p>
      </header>

      <div
        class="upload-area"
        onClick={() => document.getElementById('wakaFileInput')?.click()}
        onDragOver={(e: DragEvent) => {
          e.preventDefault()
            ; (e.currentTarget as HTMLDivElement).classList.add('dragover')
        }}
        onDragLeave={(e: DragEvent) =>
          (e.currentTarget as HTMLDivElement).classList.remove('dragover')
        }
        onDrop={(e: DragEvent) => {
          e.preventDefault()
            ; (e.currentTarget as HTMLDivElement).classList.remove('dragover')
          const files = e.dataTransfer?.files
          if (files && files.length > 0) handleFile(files[0])
        }}
      >
        <div class="upload-icon" aria-hidden="true">
          <svg class="upload-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008H12V8.25Z"
            />
          </svg>
        </div>
        <div class="upload-text">画像をドラッグ＆ドロップ</div>
        <div class="upload-hint">または、ここをクリックして選択</div>
        <input
          id="wakaFileInput"
          class="waka-file-input"
          type="file"
          accept="image/*"
          onChange={(e: Event) => {
            const target = e.currentTarget as HTMLInputElement
            const f = target.files?.[0]
            if (f) handleFile(f)
          }}
        />
      </div>

      <div class={`preview-container ${previewVisible ? '' : 'hidden'}`}>
        <img
          class="preview-image"
          src={currentImageData ?? ''}
          alt="プレビュー"
          style={previewVisible ? {} : { display: 'none' }}
        />
        <button class="analyze-btn" type="button" disabled={loading} onClick={analyze}>
          和歌を詠む
        </button>
      </div>

      <div class={`loading ${loading ? '' : 'hidden'}`} aria-live="polite">
        <div class="spinner" role="status" />
        <p class="loading-text">情景を味わい、歌を綴っています…</p>
      </div>

      <div class={`result-container ${resultVisible ? '' : 'hidden'}`}>
        <p class="result-label">一首</p>
        <div class="waka-text">{waka}</div>
        <div class="audio-controls">
          <button class="audio-btn audio-btn--primary" type="button" disabled={audioDisabled} onClick={playAudio}>
            <svg class="audio-btn-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7-11-7z" />
            </svg>
            詠み上げる
          </button>
          <button class="audio-btn audio-btn--ghost" type="button" disabled={audioDisabled} onClick={downloadAudio}>
            <svg class="audio-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1m-4-4-4 4m0 0-4-4m4 4V4" />
            </svg>
            音声を保存
          </button>
        </div>
      </div>

      <div class={`error-message ${errorVisible ? '' : 'hidden'}`}>{error ?? ''}</div>
    </div>
  )
}
