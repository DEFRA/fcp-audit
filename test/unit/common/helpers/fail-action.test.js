import { describe, test, expect } from 'vitest'
import { failAction } from '../../../../src/common/helpers/fail-action.js'

describe('fail-action', () => {
  test('Should throw expected error', () => {
    const mockRequest = {}
    const mockToolkit = {}
    const mockError = new Error('Something terrible has happened!')

    expect(() => failAction(mockRequest, mockToolkit, mockError)).toThrow(
      'Something terrible has happened!'
    )
  })
})
