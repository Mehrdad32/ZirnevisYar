import { describe, expect, it } from 'vitest'
import { basename, convertSubtitle, detectEncoding, outputName } from './conversion'

const bytes = (value: string) => new TextEncoder().encode(value)

describe('subtitle conversion', () => {
  it('decodes legacy Windows-1256 Persian subtitles', () => {
    // سلام in Windows-1256; includes SRT CRLF lines.
    const source = new Uint8Array([49, 13, 10, 48, 48, 58, 48, 48, 58, 48, 48, 13, 10, 0xd3, 0xe1, 0xc7, 0xe3, 13, 10])
    expect(detectEncoding(source)).toBe('windows-1256')
    const result = convertSubtitle(source)
    expect(result.sourceEncoding).toBe('windows-1256')
    expect(result.content).toContain('سلام')
    expect(result.content).toContain('\r\n')
    expect(new TextDecoder().decode(result.utf8)).toBe(result.content)
  })

  it('keeps valid UTF-8 and Persian text intact', () => {
    const source = bytes('۱\nسلام دنیا\n')
    const result = convertSubtitle(source)
    expect(result.sourceEncoding).toBe('utf-8')
    expect(result.unchanged).toBe(true)
    expect(Array.from(result.utf8)).toEqual(Array.from(source))
  })

  it('converts UTF-8 BOM input without BOM by default', () => {
    const source = new Uint8Array([0xef, 0xbb, 0xbf, ...bytes('سلام')])
    expect(detectEncoding(source)).toBe('utf-8')
    expect(new TextDecoder().decode(convertSubtitle(source).utf8)).toBe('سلام')
    expect(Array.from(convertSubtitle(source, 'auto', true).utf8).slice(0, 3))
      .toEqual([0xef, 0xbb, 0xbf])
  })

  it('decodes UTF-16 LE with a BOM', () => {
    const source = new Uint8Array([0xff, 0xfe, 0x33, 0x00, 0x0a, 0x00])
    expect(detectEncoding(source)).toBe('utf-16le')
    expect(convertSubtitle(source).content).toBe('3\n')
  })

  it('rejects invalid UTF-8 when explicitly selected', () => {
    expect(() => convertSubtitle(new Uint8Array([0xd3, 0xe1]), 'utf-8')).toThrow()
  })

  it('rejects empty or overly large data', () => {
    expect(() => convertSubtitle(new Uint8Array())).toThrow()
    expect(() => convertSubtitle(new Uint8Array(5_000 * 1024 + 1))).toThrow()
  })

  it('sanitizes downloaded subtitle names', () => {
    expect(basename('film.mkv')).toBe('film')
    expect(outputName('abc.srt')).toBe('abc_UTF8.srt')
    expect(outputName('abc.srt', 'movie.mkv')).toBe('movie.srt')
    expect(basename('../unsafe?.srt')).toBe('unsafe_')
  })
})
