import { useRef, useState } from 'react'
import { zipSync } from 'fflate'
import {
  MAX_FILES, MAX_FILE_SIZE, MAX_TOTAL_SIZE,
  convertSubtitle, outputName,
  type Encoding, type EncodingChoice,
} from './lib/conversion'

type Output = {
  filename: string
  sourceEncoding: Encoding
  content: string
  bytes: Uint8Array<ArrayBuffer>
  unchanged: boolean
}

const ENCODING_LABELS: Record<Encoding, string> = {
  'windows-1256': 'Windows-1256',
  'utf-8': 'UTF-8',
  'utf-16le': 'UTF-16 LE',
  'utf-16be': 'UTF-16 BE',
}

function sizeLabel(size: number) {
  return size >= 1024 * 1024
    ? (size / (1024 * 1024)).toFixed(2) + ' MB'
    : Math.max(1, Math.ceil(size / 1024)) + ' KB'
}

function download(bytes: Uint8Array<ArrayBuffer>, filename: string, mime: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 5000)
}

function uniqueName(name: string, existing: Set<string>): string {
  const stem = name.replace(/\.srt$/i, '')
  let result = name
  let number = 2
  while (existing.has(result.toLowerCase())) {
    result = stem + '_' + number + '.srt'
    number += 1
  }
  existing.add(result.toLowerCase())
  return result
}

export default function App() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [encoding, setEncoding] = useState<EncodingChoice>('auto')
  const [withBom, setWithBom] = useState(false)
  const [movieName, setMovieName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [outputs, setOutputs] = useState<Output[]>([])

  function addFiles(candidates: File[]) {
    const valid = candidates.filter((file) => /\.srt$/i.test(file.name))
    if (!valid.length) {
      setError('فقط فایل‌های زیرنویس با پسوند SRT پذیرفته می‌شوند.')
      return
    }
    const tooLarge = valid.find((file) => file.size > MAX_FILE_SIZE)
    if (tooLarge) {
      setError('فایل «' + tooLarge.name + '» بزرگ‌تر از حد مجاز ۵۰۰۰ کیلوبایت است.')
      return
    }
    const currentKeys = new Set(files.map((file) => file.name + ':' + file.size + ':' + file.lastModified))
    const newFiles = valid.filter((file) => {
      const key = file.name + ':' + file.size + ':' + file.lastModified
      if (currentKeys.has(key)) return false
      currentKeys.add(key)
      return true
    })
    const merged = [...files, ...newFiles]
    if (merged.length > MAX_FILES || merged.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_SIZE) {
      setError('حداکثر ۵۰ فایل و مجموعاً ۴۰ مگابایت را می‌توانید هم‌زمان انتخاب کنید.')
      return
    }
    setError(valid.length !== candidates.length ? 'فایل‌های غیر SRT نادیده گرفته شدند.' : '')
    setFiles(merged)
    setOutputs([])
    if (inputRef.current) inputRef.current.value = ''
  }

  function reset() {
    setFiles([])
    setOutputs([])
    setError('')
    setMovieName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  async function convert() {
    if (!files.length || working) return
    setWorking(true)
    setError('')
    try {
      const names = new Set<string>()
      const result: Output[] = []
      for (const file of files) {
        const data = new Uint8Array(await file.arrayBuffer())
        const converted = convertSubtitle(data, encoding, withBom)
        const proposedName = outputName(file.name, files.length === 1 ? movieName.trim() : undefined)
        result.push({
          filename: uniqueName(proposedName, names),
          sourceEncoding: converted.sourceEncoding,
          content: converted.content,
          bytes: converted.utf8,
          unchanged: converted.unchanged,
        })
      }
      setOutputs(result)
      if (result.length === 1) {
        download(result[0].bytes, result[0].filename, 'text/plain;charset=utf-8')
      } else {
        const entries: Record<string, Uint8Array> = {}
        for (const item of result) entries[item.filename] = item.bytes
        const archive = new Uint8Array(zipSync(entries, { level: 6 }))
        download(archive, 'ZirnevisYar_UTF8.zip', 'application/zip')
      }
    } catch (cause) {
      setOutputs([])
      const explanation = cause instanceof Error ? cause.message : 'خطای ناشناخته'
      setError('تبدیل انجام نشد: ' + explanation + ' اگر متن به‌هم‌ریخت، کدگذاری ورودی را دستی انتخاب کنید.')
    } finally {
      setWorking(false)
    }
  }

  function redownload() {
    if (!outputs.length) return
    if (outputs.length === 1) {
      download(outputs[0].bytes, outputs[0].filename, 'text/plain;charset=utf-8')
    } else {
      const entries: Record<string, Uint8Array> = {}
      for (const item of outputs) entries[item.filename] = item.bytes
      download(new Uint8Array(zipSync(entries, { level: 6 })), 'ZirnevisYar_UTF8.zip', 'application/zip')
    }
  }

  return (
    <main className="app-shell">
      <div className="grid-background" aria-hidden="true" />
      <div className="ambient ambient-emerald" aria-hidden="true" />
      <div className="ambient ambient-blue" aria-hidden="true" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">ز</div>
          <div className="brand-copy">
            <span className="brand">زیرنویس‌یار</span>
            <span className="brand-en" dir="ltr">ZIRNEVISYAR</span>
          </div>
        </div>
        <div className="product-status" dir="ltr">
          <span className="status-dot" aria-hidden="true" />
          <span>LOCAL / PRIVATE</span>
          <span className="status-divider">·</span>
          <span>WEB ALPHA 1</span>
        </div>
      </header>

      <section className="hero">
        <div className="eyebrow" dir="ltr"><span className="eyebrow-line" /> PERSIAN SUBTITLE UTILITY</div>
        <h1>زیرنویس فارسی، <span>بدون دردسر.</span></h1>
        <p>مشکل نمایش حروف فارسی در تلویزیون یا پخش‌کننده را برطرف کنید. فایل SRT را انتخاب کنید، به UTF-8 تبدیل کنید و همان لحظه تحویل بگیرید.</p>
      </section>

      <section className="workspace" aria-label="ابزار تبدیل زیرنویس">
        <div className="panel source-panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">مرحله ۰۱ · انتخاب ورودی</span>
              <h2>فایل‌های زیرنویس</h2>
            </div>
            <span className="panel-code">SOURCE / SRT</span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".srt,text/plain"
            multiple
            className="file-input-hidden"
            onChange={(event) => addFiles(Array.from(event.target.files || []))}
            aria-label="انتخاب فایل‌های SRT"
          />
          <div
            className={'dropzone ' + (dragActive ? 'drag-active' : '')}
            onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
            onDragLeave={(event) => { event.preventDefault(); setDragActive(false) }}
            onDrop={(event) => {
              event.preventDefault()
              setDragActive(false)
              addFiles(Array.from(event.dataTransfer.files))
            }}
          >
            <div className="drop-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4m-5 5 5-5 5 5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
              </svg>
            </div>
            <strong>فایل‌ها را اینجا رها کنید</strong>
            <span>یا از دستگاه خودتان انتخاب کنید</span>
            <button type="button" className="secondary-button" onClick={() => inputRef.current?.click()}>
              انتخاب فایل SRT
            </button>
            <small>حداکثر ۵۰۰۰ کیلوبایت برای هر فایل · تا ۵۰ فایل</small>
          </div>

          <div className="file-list">
            {files.length === 0 ? (
              <div className="empty-list">هنوز فایلی انتخاب نشده است.</div>
            ) : (
              <>
                <div className="list-heading"><span>فایل‌های انتخاب‌شده ({files.length})</span><button type="button" className="text-button" onClick={reset}>پاک کردن همه</button></div>
                {files.map((file, index) => (
                  <div className="file-row" key={file.name + file.size + file.lastModified}>
                    <span className="file-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="file-info"><b dir="auto">{file.name}</b><small>{sizeLabel(file.size)}</small></span>
                    <button type="button" className="remove-button" aria-label={'حذف ' + file.name} onClick={() => { setFiles((items) => items.filter((item) => item !== file)); setOutputs([]); }}>×</button>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="panel result-panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">مرحله ۰۲ · تنظیمات خروجی</span>
              <h2>تبدیل به UTF-8</h2>
            </div>
            <span className="panel-code result-code">OUTPUT / UTF-8</span>
          </div>

          <div className="settings-area">
            <label className="field">
              <span>کدگذاری فایل ورودی</span>
              <select value={encoding} onChange={(event) => { setEncoding(event.target.value as EncodingChoice); setOutputs([]); }}>
                <option value="auto">تشخیص خودکار (پیشنهادی)</option>
                <option value="windows-1256">Windows-1256 — زیرنویس‌های قدیمی فارسی</option>
                <option value="utf-8">UTF-8</option>
                <option value="utf-16le">UTF-16 LE</option>
                <option value="utf-16be">UTF-16 BE</option>
              </select>
            </label>
            <label className={'field ' + (files.length > 1 ? 'field-disabled' : '')}>
              <span>نام فایل ویدئو (اختیاری)</span>
              <input
                type="text"
                dir="ltr"
                placeholder="Example.Movie.2026.mkv"
                value={movieName}
                disabled={files.length > 1}
                onChange={(event) => { setMovieName(event.target.value); setOutputs([]) }}
                maxLength={180}
              />
              <small>برای هماهنگی نام زیرنویس با فیلم؛ فقط در حالت تک‌فایل.</small>
            </label>
            <label className="toggle-row">
              <input type="checkbox" checked={withBom} onChange={(event) => { setWithBom(event.target.checked); setOutputs([]) }} />
              <span className="toggle-description"><b>افزودن UTF-8 BOM</b><small>پیش‌فرض خاموش؛ فقط اگر دستگاه شما به BOM نیاز دارد فعال کنید.</small></span>
            </label>
          </div>

          {error && <div className="error-message" role="alert">{error}</div>}

          <div className="action-area">
            <button className="primary-button" type="button" disabled={!files.length || working} onClick={convert}>
              {working ? 'در حال تبدیل…' : files.length > 1 ? 'تبدیل و دانلود فایل ZIP' : 'تبدیل و دانلود زیرنویس'}
              <span aria-hidden="true">←</span>
            </button>
            <div className="action-hint"><span className="status-dot" /> فایل‌های اصلی هرگز حذف یا بازنویسی نمی‌شوند.</div>
          </div>

          <div className="result-area" aria-live="polite">
            {outputs.length ? (
              <>
                <div className="result-heading">
                  <span className="success-mark">✓</span>
                  <div><b>{outputs.length.toLocaleString('fa-IR')} فایل آماده دانلود است</b><small>{outputs.length > 1 ? 'همه فایل‌ها در یک آرشیو ZIP' : outputs[0].filename}</small></div>
                  <button className="text-button" type="button" onClick={redownload}>دانلود دوباره</button>
                </div>
                <div className="result-items">
                  {outputs.map((item) => (
                    <div className="result-item" key={item.filename}>
                      <span dir="auto">{item.filename}</span>
                      <span dir="ltr">{ENCODING_LABELS[item.sourceEncoding]} → UTF-8{item.unchanged ? ' ✓' : ''}</span>
                    </div>
                  ))}
                </div>
                <details className="preview">
                  <summary>پیش‌نمایش متن اولین فایل</summary>
                  <pre dir="auto">{outputs[0].content.slice(0, 800) || '(فایل خالی)'}</pre>
                </details>
              </>
            ) : (
              <div className="empty-result"><div className="result-symbol">UTF-8</div><b>خروجی آماده می‌شود</b><span>پس از انتخاب فایل، دکمه تبدیل را بزنید.</span></div>
            )}
          </div>
        </div>
      </section>

      <section className="trust-bar" aria-label="ویژگی‌ها">
        <div><span className="trust-icon">⌁</span><b>بدون آپلود</b><small>تمام پردازش در مرورگر شما</small></div>
        <div><span className="trust-icon">▤</span><b>تبدیل گروهی</b><small>دانلود یکجای زیرنویس‌ها در ZIP</small></div>
        <div><span className="trust-icon">↔</span><b>سازگار با فارسی</b><small>پشتیبانی از Windows-1256 و Unicode</small></div>
      </section>

      <footer className="footer">
        <span>زیرنویس‌یار · یک ابزار متن‌باز از <a href="https://mehrdad32.ir/" target="_blank" rel="noopener noreferrer">Mehrdad32</a></span>
        <div><a href="https://github.com/Mehrdad32/ZirnevisYar" target="_blank" rel="noopener noreferrer">GitHub / SOURCE</a><span className="footer-separator">·</span><a href="https://tarikhdaar.mehrdad32.ir/" target="_blank" rel="noopener noreferrer">تاریخ‌دار</a></div>
      </footer>
    </main>
  )
}
