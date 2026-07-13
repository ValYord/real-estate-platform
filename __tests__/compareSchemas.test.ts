import { describe, it, expect } from 'vitest'
import { parseCompareIds, MAX_COMPARE } from '../lib/compare/schemas'

describe('parseCompareIds', () => {
  it('returns [] for null/undefined/empty input', () => {
    expect(parseCompareIds(null)).toEqual([])
    expect(parseCompareIds(undefined)).toEqual([])
    expect(parseCompareIds('')).toEqual([])
  })

  it('parses a valid comma-separated list in order', () => {
    expect(parseCompareIds('1,2,3')).toEqual(['1', '2', '3'])
  })

  it('dedupes duplicate ids', () => {
    expect(parseCompareIds('1,2,1,2,3')).toEqual(['1', '2', '3'])
  })

  it('drops malformed tokens without throwing', () => {
    expect(parseCompareIds('1,,2, ,3')).toEqual(['1', '2', '3'])
    expect(() => parseCompareIds('<script>,1')).not.toThrow()
    expect(parseCompareIds('<script>,1')).toEqual(['1'])
  })

  it('drops a way-too-long token', () => {
    const longToken = 'a'.repeat(100)
    expect(parseCompareIds(`1,${longToken},2`)).toEqual(['1', '2'])
  })

  it('truncates to MAX_COMPARE valid ids without throwing', () => {
    const ids = ['1', '2', '3', '4', '5', '6'].join(',')
    const result = parseCompareIds(ids)
    expect(result).toHaveLength(MAX_COMPARE)
    expect(result).toEqual(['1', '2', '3', '4'])
  })

  it('accepts UUID-shaped ids as well as short mock ids', () => {
    const uuid = '8423e5a0-1234-4abc-9def-000000000001'
    expect(parseCompareIds(`${uuid},1`)).toEqual([uuid, '1'])
  })
})
