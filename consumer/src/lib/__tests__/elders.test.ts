import { describe, it, expect } from 'vitest'
import { generateUniqueEmail } from '../elders'

describe('generateUniqueEmail', () => {
  it('generates an email with the correct domain', () => {
    const email = generateUniqueEmail('Mom')
    expect(email).toMatch(/@docs\.intakedata\.com$/)
  })

  it('slugifies the name', () => {
    const email = generateUniqueEmail('Grandma Rose')
    expect(email).toMatch(/^grandma-rose-/)
  })

  it('falls back to "elder" if name is empty', () => {
    const email = generateUniqueEmail('')
    expect(email).toMatch(/^elder-/)
  })

  it('two calls produce different emails', () => {
    const a = generateUniqueEmail('Mom')
    const b = generateUniqueEmail('Mom')
    expect(a).not.toBe(b)
  })
})
