import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('ignores falsy values', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('deduplicates conflicting tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})

describe('formatCurrency', () => {
  it('formats positive euros', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('€')
    expect(result).toMatch(/1.?234[,.]56/)
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0,00')
  })

  it('supports other currencies', () => {
    expect(formatCurrency(100, 'USD')).toContain('$')
  })
})

describe('formatDate', () => {
  it('returns dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('returns dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  it('formats ISO date string to es-ES format', () => {
    expect(formatDate('2024-01-15')).toBe('15/01/2024')
  })
})
