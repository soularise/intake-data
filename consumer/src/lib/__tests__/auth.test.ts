import { describe, it, expect } from 'vitest'
import { auth } from '../auth'

describe('auth config', () => {
  it('exports auth object', () => {
    expect(auth).toBeDefined()
  })

  it('auth has handler function', () => {
    expect(typeof auth.handler).toBe('function')
  })
})
