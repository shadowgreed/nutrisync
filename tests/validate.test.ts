import { describe, it, expect } from 'vitest'
import { parseJson, boundedNumber, boundedString, boundedUrlList } from '@/lib/validate'

describe('parseJson', () => {
  it('returns the object for a valid body', async () => {
    const req = { json: async () => ({ a: 1 }) }
    expect(await parseJson(req)).toEqual({ a: 1 })
  })
  it('returns null when json() throws (malformed body)', async () => {
    const req = { json: async () => { throw new Error('bad') } }
    expect(await parseJson(req)).toBeNull()
  })
  it('returns null for a non-object body', async () => {
    const req = { json: async () => 'nope' }
    expect(await parseJson(req)).toBeNull()
  })
})

describe('boundedNumber', () => {
  it('clamps to [min, max]', () => {
    expect(boundedNumber(5, 0, 10)).toBe(5)
    expect(boundedNumber(-3, 0, 10)).toBe(0)
    expect(boundedNumber(99, 0, 10)).toBe(10)
  })
  it('coerces numeric strings and rejects junk', () => {
    expect(boundedNumber('7', 0, 10)).toBe(7)
    expect(boundedNumber('abc', 0, 10)).toBeNull()
    expect(boundedNumber(NaN, 0, 10)).toBeNull()
    expect(boundedNumber(Infinity, 0, 10)).toBeNull()
    expect(boundedNumber(undefined, 0, 10)).toBeNull()
  })
})

describe('boundedString', () => {
  it('trims and caps length', () => {
    expect(boundedString('  hi  ', 10)).toBe('hi')
    expect(boundedString('abcdef', 3)).toBe('abc')
  })
  it('returns null for empty or non-strings', () => {
    expect(boundedString('   ', 10)).toBeNull()
    expect(boundedString(42, 10)).toBeNull()
    expect(boundedString(undefined, 10)).toBeNull()
  })
})

describe('boundedUrlList', () => {
  it('keeps only https(s) urls and caps the count', () => {
    const urls = ['https://a.com/1', 'http://b.com/2', 'ftp://c.com', 'not-a-url', 'https://d.com/4']
    expect(boundedUrlList(urls, 2)).toEqual(['https://a.com/1', 'http://b.com/2'])
  })
  it('returns [] for non-arrays', () => {
    expect(boundedUrlList('x', 5)).toEqual([])
    expect(boundedUrlList(undefined, 5)).toEqual([])
  })
})
