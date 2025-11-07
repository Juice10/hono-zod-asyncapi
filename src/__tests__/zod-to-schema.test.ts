import { describe, it, expect } from 'vitest'
import { zodToAsyncAPISchema, z } from '../zod-to-schema'

describe('zodToAsyncAPISchema', () => {
  it('should convert zod schemas to schema objects', () => {
    const schema = z.string()
    const result = zodToAsyncAPISchema(schema)

    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  it('should handle object schemas', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    })
    const result = zodToAsyncAPISchema(schema)

    expect(result).toBeDefined()
    expect(result.type).toBeDefined()
  })

  it('should handle array schemas', () => {
    const schema = z.array(z.string())
    const result = zodToAsyncAPISchema(schema)

    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  it('should handle enum schemas', () => {
    const schema = z.enum(['red', 'green', 'blue'])
    const result = zodToAsyncAPISchema(schema)

    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  it('should handle complex nested schemas', () => {
    const schema = z.object({
      id: z.string(),
      data: z.array(
        z.object({
          value: z.number(),
          label: z.string(),
        })
      ),
      metadata: z.record(z.string()),
    })
    const result = zodToAsyncAPISchema(schema)

    expect(result).toBeDefined()
    expect(result.type).toBeDefined()
  })

  it('should handle optional fields', () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    })
    const result = zodToAsyncAPISchema(schema)

    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  it('should handle nullable schemas', () => {
    const schema = z.string().nullable()
    const result = zodToAsyncAPISchema(schema)

    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  it('should handle default values', () => {
    const schema = z.string().default('default-value')
    const result = zodToAsyncAPISchema(schema)

    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  it('should handle discriminated unions', () => {
    const schema = z.discriminatedUnion('type', [
      z.object({ type: z.literal('success'), data: z.string() }),
      z.object({ type: z.literal('error'), message: z.string() }),
    ])
    const result = zodToAsyncAPISchema(schema)

    expect(result).toBeDefined()
    expect(typeof result).toBe('object')
  })

  it('should not throw errors on any valid zod schema', () => {
    const schemas = [
      z.string(),
      z.number(),
      z.boolean(),
      z.null(),
      z.undefined(),
      z.object({}),
      z.array(z.any()),
      z.tuple([z.string(), z.number()]),
      z.record(z.string()),
      z.map(z.string(), z.number()),
      z.set(z.string()),
      z.union([z.string(), z.number()]),
      z.literal('test'),
    ]

    schemas.forEach((schema) => {
      expect(() => zodToAsyncAPISchema(schema)).not.toThrow()
      const result = zodToAsyncAPISchema(schema)
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })
  })
})
