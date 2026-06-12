export interface ExtractionResult {
  vendor_name: string | null
  document_type: string | null
  amount: number | null
  due_date: string | null
  document_date: string | null
  account_number: string | null
  is_overdue: boolean
  is_final_notice: boolean
  has_urgent_language: boolean
  prior_amount: number | null
  raw_text: string
}

export interface DetectedSignal {
  signalType: string
  severity: 'info' | 'warning' | 'critical'
  description: string
}

export function detectExceptions(doc: ExtractionResult): DetectedSignal[] {
  const signals: DetectedSignal[] = []

  const isOverdue =
    doc.is_overdue ||
    (doc.due_date != null && new Date(doc.due_date) < new Date())

  if (isOverdue) {
    const daysOverdue = doc.due_date
      ? Math.floor((Date.now() - new Date(doc.due_date).getTime()) / 86_400_000)
      : null
    signals.push({
      signalType: 'overdue',
      severity: 'critical',
      description: daysOverdue != null
        ? `Payment is ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`
        : 'Payment is overdue',
    })
  }

  if (doc.is_final_notice) {
    signals.push({
      signalType: 'final_notice',
      severity: 'critical',
      description: 'This document is marked as a final notice',
    })
  }

  if (doc.has_urgent_language) {
    signals.push({
      signalType: 'urgent_language',
      severity: 'warning',
      description: 'This document contains urgent action language',
    })
  }

  if (doc.amount != null && doc.prior_amount != null) {
    const changePct = (doc.amount - doc.prior_amount) / doc.prior_amount
    if (Math.abs(changePct) > 0.05) {
      const direction = changePct > 0 ? 'increased' : 'decreased'
      const pct = Math.round(Math.abs(changePct) * 100)
      signals.push({
        signalType: 'rate_change',
        severity: 'warning',
        description: `Amount ${direction} by ${pct}% from $${doc.prior_amount} to $${doc.amount}`,
      })
    }
  }

  return signals
}
