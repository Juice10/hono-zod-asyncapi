import type { OpenAPIHono } from '@hono/zod-openapi'
import type { Env } from 'hono'
import { AsyncAPIHono } from './asyncapi-hono'
import type { AsyncAPIHonoOptions } from './asyncapi-hono'
import type { InfoObject, ServerObject } from './types'

/**
 * Create a Hono app that supports both OpenAPI (REST) and AsyncAPI (WebSocket)
 *
 * @example
 * const app = createUnifiedAPIHono({
 *   openapi: {
 *     info: { title: 'My API', version: '1.0.0' }
 *   },
 *   asyncapi: {
 *     info: { title: 'My WebSocket API', version: '1.0.0' }
 *   }
 * })
 *
 * // Use OpenAPI routes
 * app.openapi(route, handler)
 *
 * // Use AsyncAPI channels
 * app.channel(id, config, handler)
 */
export class UnifiedAPIHono<
  E extends Env = Env,
  S extends Record<string, any> = {},
  BasePath extends string = '/'
> extends AsyncAPIHono<E, S, BasePath> {
  constructor(options: {
    openapi?: {
      info?: any
      servers?: any
    }
    asyncapi?: AsyncAPIHonoOptions
  } = {}) {
    super(options.asyncapi || {})
    // Store OpenAPI config if needed for future use
    // Currently these are for future extensibility
    void options.openapi?.info
    void options.openapi?.servers
  }

  /**
   * Serve both OpenAPI and AsyncAPI documentation
   *
   * @example
   * app.doc('/openapi.json', '/asyncapi.json')
   */
  docs(openapiPath: string, asyncapiPath: string): this {
    // Serve AsyncAPI
    this.doc(asyncapiPath)

    // Serve OpenAPI if getOpenAPIDocument exists (when using OpenAPIHono)
    if ('getOpenAPIDocument' in this && typeof (this as any).getOpenAPIDocument === 'function') {
      this.get(openapiPath as any, (c) => {
        const doc = (this as any).getOpenAPIDocument()
        return c.json(doc)
      })
    }

    return this
  }
}

/**
 * Merge AsyncAPI channels with an existing OpenAPIHono app
 *
 * @example
 * const openAPIApp = new OpenAPIHono()
 * // ... define OpenAPI routes
 *
 * const wsChannels = new AsyncAPIHono()
 * wsChannels.channel('chat', chatChannel, handler)
 *
 * const mergedApp = mergeAPIDocs(openAPIApp, wsChannels)
 * mergedApp.doc('/openapi.json')
 * mergedApp.doc('/asyncapi.json')
 */
export function mergeAPIDocs<E extends Env = Env>(
  openAPIApp: OpenAPIHono<E>,
  asyncAPIApp: AsyncAPIHono<E>
): OpenAPIHono<E> & {
  asyncAPIRegistry: typeof asyncAPIApp.asyncAPIRegistry
  getAsyncAPIDocument: typeof asyncAPIApp.getAsyncAPIDocument
} {
  // Merge routes
  const routes = asyncAPIApp.routes
  routes.forEach((route) => {
    ;(openAPIApp as any).addRoute(route.method, route.path, route.handler)
  })

  // Add AsyncAPI methods to OpenAPIHono
  const merged = openAPIApp as any
  merged.asyncAPIRegistry = asyncAPIApp.asyncAPIRegistry
  merged.getAsyncAPIDocument = asyncAPIApp.getAsyncAPIDocument.bind(asyncAPIApp)

  // Add channel method
  merged.channel = function(id: string, config: any, handler?: any) {
    asyncAPIApp.channel(id, config, handler)

    // Also register the route in the OpenAPI app
    if (handler) {
      this.get(config.path, async (c: any) => {
        if (c.req.header('upgrade') !== 'websocket') {
          return c.text('Expected WebSocket connection', 400)
        }
        return c.text('WebSocket endpoint - upgrade required', 426)
      })
    }

    return this
  }

  // Add doc method for AsyncAPI
  merged.asyncapiDoc = function(path: string, options?: any) {
    this.get(path, (c: any) => {
      const doc = this.getAsyncAPIDocument(options)
      return c.json(doc)
    })
    return this
  }

  return merged
}

/**
 * Create configuration for unified API documentation
 */
export function createUnifiedInfo(options: {
  title: string
  version: string
  description?: string
  contact?: {
    name?: string
    email?: string
    url?: string
  }
  license?: {
    name: string
    url?: string
  }
}): { openapi: any; asyncapi: InfoObject } {
  const baseInfo = {
    title: options.title,
    version: options.version,
    description: options.description,
    contact: options.contact,
    license: options.license,
  }

  return {
    openapi: baseInfo,
    asyncapi: baseInfo as InfoObject,
  }
}

/**
 * Create unified server configurations for both OpenAPI and AsyncAPI
 */
export function createUnifiedServers(configs: {
  http?: {
    url: string
    description?: string
  }
  ws?: {
    host: string
    protocol: 'ws' | 'wss'
    description?: string
  }
}): {
  openapi: Record<string, any>
  asyncapi: Record<string, ServerObject>
} {
  const openapi: Record<string, any> = {}
  const asyncapi: Record<string, ServerObject> = {}

  if (configs.http) {
    openapi.default = {
      url: configs.http.url,
      description: configs.http.description || 'HTTP server',
    }
  }

  if (configs.ws) {
    asyncapi.default = {
      host: configs.ws.host,
      protocol: configs.ws.protocol,
      description: configs.ws.description || 'WebSocket server',
    }
  }

  return { openapi, asyncapi }
}
