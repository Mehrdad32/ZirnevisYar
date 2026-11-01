/**
 * Browser-only subtitle encoding converter. The original WPF app decoded
 * Windows-1256 and saved UTF-8; this implementation also preserves UTF-8 input.
 * No subtitle content is transmitted to a server.
 */
export const MAX_FILE_SIZE = 5_000 * 1024
export const MAX_TOTAL_SIZE = 40 * 1024 * 1024
export const MAX_FILES = 50

export type Encoding = 'windows-1256' | 'utf-8' | 'utf-16le' | 'utf-16be'
export type EncodingChoice = 'auto' | Encoding

export interface Conversion {
  sourceEncoding: Encoding
  content: string
  utf8: Uint8Array<ArrayBuffer>
  unchanged: boolean
}

export function detectEncoding(data: Uint8Array): Encoding {
  if (data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf) {
    return 'utf-8'
  }
  if (data.length >= 2 && data[0] === 0xff && data[1] === 0xfe) return 'utf-16le'
  if (data.length >= 2 && data[0] === 0xfe && data[1] === 0xff) return 'utf-16be'

  // UTF-16 files without a BOM can be inferred from alternating zero bytes.
  if (data.length >= 8) {
    const sample = data.subarray(0, Math.min(data.length, 256))
    let evenNulls = 0
    let oddNulls = 0
    for (let i = 0; i < sample.length; i += 1) {
      if (sample[i] === 0) {
        if (i % 2 === 0) evenNulls += 1
        else oddNulls += 1
      }
    }
    const pairs = Math.floor(sample.length / 2)
    if (oddNulls > pairs * 0.35 && evenNulls < pairs * 0.05) return 'utf-16le'
    if (evenNulls > pairs * 0.35 && oddNulls < pairs * 0.05) return 'utf-16be'
  }

  try {
    new TextDecoder('utf-8', { fatal: true }).decode(data)
    return 'utf-8'
  } catch {
    return 'windows-1256'
  }
}

export function convertSubtitle(
  data: Uint8Array,
  choice: EncodingChoice = 'auto',
  addBom = false,
): Conversion {
  if (data.byteLength === 0) throw new Error('فایل زیرنویس خالی است.')
  if (data.byteLength > MAX_FILE_SIZE) throw new Error('حجم هر فایل باید کمتر از ۵۰۰۰ کیلوبایت باشد.')

  const sourceEncoding = choice === 'auto' ? detectEncoding(data) : choice
  const content = new TextDecoder(sourceEncoding, {
    fatal: sourceEncoding === 'utf-8',
  }).decode(data)
  if (content.includes('\u0000')) {
    throw new Error('محتوای فایل متنی معتبر به نظر نمی‌رسد. کدگذاری ورودی را بررسی کنید.')
  }

  const output = new TextEncoder().encode(content)
  const utf8 = addBom ? new Uint8Array(output.length + 3) : output
  if (addBom) {
    utf8.set([0xef, 0xbb, 0xbf], 0)
    utf8.set(output, 3)
  }

  const unchanged = sourceEncoding === 'utf-8' &&
    ((addBom && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf &&
      data.length === utf8.length) ||
      (!addBom && data[0] !== 0xef && data.length === utf8.length)) &&
    data.every((byte, i) => byte === utf8[i])

  return { sourceEncoding, content, utf8, unchanged }
}

export function basename(filename: string): string {
  const last = filename.replace(/\\/g, '/').split('/').pop() || ''
  const name = last.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim()
  return name && !/^\.+$/.test(name) ? name : 'subtitle'
}

export function outputName(subtitleFilename: string, movieFilename?: string): string {
  return (movieFilename ? basename(movieFilename) : basename(subtitleFilename) + '_UTF8') + '.srt'
}
