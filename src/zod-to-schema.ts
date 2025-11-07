import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
import type { SchemaObject } from './types'

// Extend Zod with OpenAPI capabilities (we'll reuse this for AsyncAPI)
extendZodWithOpenApi(z)

/**
 * Convert a Zod schema to an AsyncAPI Schema Object
 * We leverage the zod-to-openapi library since AsyncAPI 3.0 uses JSON Schema
 * which is compatible with OpenAPI schemas
 */
export function zodToAsyncAPISchema(schema: z.ZodType): SchemaObject {
  // Use the OpenAPI registry to generate the schema
  const generator = (schema as any)._def?.openapi

  if (generator) {
    return generator as SchemaObject
  }

  // Fallback: basic schema generation
  return generateSchemaFromZod(schema)
}

function generateSchemaFromZod(schema: z.ZodType): SchemaObject {
  const def = (schema as any)._def
  const typeName = def?.typeName

  switch (typeName) {
    case 'ZodString':
      return { type: 'string', ...extractMetadata(def) }

    case 'ZodNumber':
      return { type: 'number', ...extractMetadata(def) }

    case 'ZodBoolean':
      return { type: 'boolean', ...extractMetadata(def) }

    case 'ZodArray':
      return {
        type: 'array',
        items: generateSchemaFromZod(def.type),
        ...extractMetadata(def),
      }

    case 'ZodObject': {
      const shape = def.shape()
      const properties: Record<string, SchemaObject> = {}
      const required: string[] = []

      for (const key in shape) {
        properties[key] = generateSchemaFromZod(shape[key])
        if (!shape[key].isOptional()) {
          required.push(key)
        }
      }

      return {
        type: 'object',
        properties,
        ...(required.length > 0 && { required }),
        ...extractMetadata(def),
      }
    }

    case 'ZodEnum':
      return {
        type: 'string',
        enum: def.values,
        ...extractMetadata(def),
      }

    case 'ZodLiteral':
      return {
        type: typeof def.value,
        enum: [def.value],
        ...extractMetadata(def),
      }

    case 'ZodUnion':
    case 'ZodDiscriminatedUnion':
      // For unions, we'll use oneOf
      return {
        oneOf: def.options?.map((option: z.ZodType) => generateSchemaFromZod(option)) || [],
        ...extractMetadata(def),
      }

    case 'ZodOptional':
      return generateSchemaFromZod(def.innerType)

    case 'ZodNullable':
      const innerSchema = generateSchemaFromZod(def.innerType)
      return {
        ...innerSchema,
        nullable: true,
      }

    case 'ZodDefault':
      return {
        ...generateSchemaFromZod(def.innerType),
        default: def.defaultValue(),
      }

    case 'ZodRecord':
      return {
        type: 'object',
        additionalProperties: generateSchemaFromZod(def.valueType),
        ...extractMetadata(def),
      }

    default:
      return { type: 'object' }
  }
}

function extractMetadata(def: any): Partial<SchemaObject> {
  const metadata: Partial<SchemaObject> = {}

  if (def.description) {
    metadata.description = def.description
  }

  return metadata
}

export { z }
