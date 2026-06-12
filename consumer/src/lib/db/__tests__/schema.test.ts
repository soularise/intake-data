import { describe, it, expect } from 'vitest'
import { userProfiles, elders, consumerDocuments, consumerExceptions } from '../schema'

describe('schema', () => {
  it('elders table has uniqueEmail column', () => {
    expect(elders.uniqueEmail).toBeDefined()
  })

  it('consumer_documents table has exceptionFlags column', () => {
    expect(consumerDocuments.exceptionFlags).toBeDefined()
  })

  it('consumer_exceptions table has signalType column', () => {
    expect(consumerExceptions.signalType).toBeDefined()
  })

  it('userProfiles has subscriptionStatus column', () => {
    expect(userProfiles.subscriptionStatus).toBeDefined()
  })
})
