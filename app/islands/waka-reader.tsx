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
      <h1>和歌リーダー</h1>
      <p class="waka-subtitle">画像をアップロードすると、AIがその情景を読み取り、美しい和歌を詠み上げます</p>

      <div
        class="upload-area"
        onClick={() => document.getElementById('wakaFileInput')?.click()}
        onDragOver={(e: DragEvent) => {
          e.preventDefault()
          ;(e.currentTarget as HTMLDivElement).classList.add('dragover')
        }}
        onDragLeave={(e: DragEvent) =>
          (e.currentTarget as HTMLDivElement).classList.remove('dragover')
        }
        onDrop={(e: DragEvent) => {
          e.preventDefault()
          ;(e.currentTarget as HTMLDivElement).classList.remove('dragover')
          const files = e.dataTransfer?.files
          if (files && files.length > 0) handleFile(files[0])
        }}
      >
        <div class="upload-icon">📷</div>
        <div class="upload-text">画像をドラッグ＆ドロップ</div>
        <div class="upload-hint">または、クリックしてファイルを選択</div>
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
        <br />
        <button class="analyze-btn" type="button" disabled={loading} onClick={analyze}>
          和歌を詠む
        </button>
      </div>

      <div class={`loading ${loading ? '' : 'hidden'}`}>
        <div class="spinner" />
        <p>AIが画像を解析し、和歌を詠んでいます...</p>
      </div>

      <div class={`result-container ${resultVisible ? '' : 'hidden'}`}>
        <div class="waka-text">{waka}</div>
        <div class="audio-controls">
          <button class="audio-btn" type="button" disabled={audioDisabled} onClick={playAudio}>
            🔊 読み上げる
          </button>
          <button class="audio-btn" type="button" disabled={audioDisabled} onClick={downloadAudio}>
            💾 音声をダウンロード
          </button>
        </div>
      </div>

      <div class={`error-message ${errorVisible ? '' : 'hidden'}`}>{error ?? ''}</div>
    </div>
  )
}
