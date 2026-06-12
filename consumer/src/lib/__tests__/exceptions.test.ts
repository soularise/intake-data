import { describe, it, expect } from 'vitest'
import { detectExceptions, type ExtractionResult } from '../exceptions'

const base: ExtractionResult = {
  vendor_name: 'Pacific Gas & Electric',
  document_type: 'utility_bill',
  amount: 147.50,
  due_date: null,
  document_date: '2026-05-01',
  account_number: '12345',
  is_overdue: false,
  is_final_notice: false,
  has_urgent_language: false,
  prior_amount: null,
  raw_text: 'Your bill is due.',
}

describe('detectExceptions', () => {
  it('returns no exceptions for a clean document', () => {
    expect(detectExceptions(base)).toHaveLength(0)
  })

  it('detects overdue from extraction flag', () => {
    const result = detectExceptions({ ...base, is_overdue: true })
    expect(result).toContainEqual(
      expect.objectContaining({ signalType: 'overdue', severity: 'critical' })
    )
  })

  it('detects overdue from past due date', () => {
    const pastDue = new Date()
    pastDue.setDate(pastDue.getDate() - 5)
    const result = detectExceptions({
      ...base,
      due_date: pastDue.toISOString().split('T')[0],
    })
    expect(result).toContainEqual(
      expect.objectContaining({ signalType: 'overdue', severity: 'critical' })
    )
  })

  it('detects final_notice', () => {
    const result = detectExceptions({ ...base, is_final_notice: true })
    expect(result).toContainEqual(
      expect.objectContaining({ signalType: 'final_notice', severity: 'critical' })
    )
  })

  it('detects urgent_language', () => {
    const result = detectExceptions({ ...base, has_urgent_language: true })
    expect(result).toContainEqual(
      expect.objectContaining({ signalType: 'urgent_language', severity: 'warning' })
    )
  })

  it('detects rate_change when increase is more than 5%', () => {
    const result = detectExceptions({ ...base, amount: 120, prior_amount: 100 })
    expect(result).toContainEqual(
      expect.objectContaining({ signalType: 'rate_change', severity: 'warning' })
    )
  })

  it('ignores rate_change when increase is within 5%', () => {
    const result = detectExceptions({ ...base, amount: 103, prior_amount: 100 })
    expect(result).not.toContainEqual(
      expect.objectContaining({ signalType: 'rate_change' })
    )
  })
})
