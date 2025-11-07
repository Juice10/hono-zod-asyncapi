import { Hono } from 'hono'
import type { Context, Env } from 'hono'
import { AsyncAPIRegistry } from './registry'
import {
  generateAsyncAPIDocument,
  type GeneratorOptions,
} from './generator'
import type {
  ChannelConfig,
  ChannelHandler,
  AsyncAPIDocument,
  InfoObject,
  ServerObject,
} from './types'

export interface AsyncAPIHonoOptions {
  info?: InfoObject
  servers?: Record<string, ServerObject>
  defaultHook?: ValidationHook
}

export type ValidationHook = (result: any, c: Context) => Response | void | Promise<Response | void>

/**
 * Extended Hono class with AsyncAPI support for WebSocket routes
 */
export class AsyncAPIHono<
  E extends Env = Env,
  S extends Record<string, any> = {},
  BasePath extends string = '/'
> extends Hono<E, S, BasePath> {
  public asyncAPIRegistry: AsyncAPIRegistry
  private info?: InfoObject
  private servers?: Record<string, ServerObject>
  private defaultHook?: ValidationHook

  constructor(options: AsyncAPIHonoOptions = {}) {
    super()
    this.asyncAPIRegistry = new AsyncAPIRegistry()
    this.info = options.info
    this.servers = options.servers
    this.defaultHook = options.defaultHook
  }

  /**
   * Register a WebSocket channel with AsyncAPI documentation
   *
   * @example
   * app.channel('chatRoom', chatChannelConfig, (ws, message, ctx) => {
   *   console.log('Received message:', message)
   *   ws.send({ reply: 'Hello!' })
   * })
   */
  channel<TConfig extends ChannelConfig>(
    id: string,
    config: TConfig,
    handler?: ChannelHandler<TConfig, TConfig['path']>
  ): this {
    // Register channel in AsyncAPI registry
    this.asyncAPIRegistry.registerChannel(id, config, handler as any)

    // Register the actual WebSocket route in Hono
    if (handler) {
      this.get(config.path as any, async (c) => {
        // Check if this is a WebSocket upgrade request
        if (c.req.header('upgrade') !== 'websocket') {
          return c.text('Expected WebSocket connection', 400)
        }

        // For actual WebSocket handling, we'll need to use Hono's WebSocket support
        // This is a simplified version - actual implementation would depend on the runtime
        return c.text('WebSocket endpoint - upgrade required', 426)
      })
    }

    return this
  }

  /**
   * Get the AsyncAPI document
   */
  getAsyncAPIDocument(options?: Partial<GeneratorOptions>): AsyncAPIDocument {
    const generatorOptions: GeneratorOptions = {
      info: options?.info || this.info || {
        title: 'API Documentation',
        version: '1.0.0',
      },
      servers: options?.servers || this.servers,
      components: options?.components,
    }

    return generateAsyncAPIDocument(this.asyncAPIRegistry, generatorOptions)
  }

  /**
   * Create a route handler that serves the AsyncAPI document
   *
   * @example
   * app.doc('/asyncapi.json')
   */
  doc(path: string, options?: Partial<GeneratorOptions>): this {
    this.get(path as any, (c) => {
      const doc = this.getAsyncAPIDocument(options)
      return c.json(doc)
    })
    return this
  }

  /**
   * Create a route handler that serves the AsyncAPI document as YAML
   * Note: Requires a YAML library to be installed
   */
  docYAML(path: string, options?: Partial<GeneratorOptions>): this {
    this.get(path as any, (c) => {
      const doc = this.getAsyncAPIDocument(options)
      const yaml = convertToYAML(doc)
      return c.text(yaml, 200, {
        'Content-Type': 'application/yaml',
      })
    })
    return this
  }

  /**
   * Merge routes from another AsyncAPIHono instance
   */
  route<
    SubPath extends string,
    SubEnv extends Env,
    SubSchema extends Record<string, any>,
    SubBasePath extends string
  >(
    path: SubPath,
    app: AsyncAPIHono<SubEnv, SubSchema, SubBasePath>
  ): AsyncAPIHono<E, S, BasePath> {
    // Merge AsyncAPI registries
    this.asyncAPIRegistry.merge(app.asyncAPIRegistry)

    // Call parent route method
    super.route(path, app as any)

    return this
  }

  /**
   * Create a new instance with a base path
   */
  basePath<SubPath extends string>(_path: SubPath): AsyncAPIHono<E, S, SubPath> {
    const app = new AsyncAPIHono<E, S, SubPath>({
      info: this.info,
      servers: this.servers,
      defaultHook: this.defaultHook,
    })

    // Share the same registry
    app.asyncAPIRegistry = this.asyncAPIRegistry

    return app
  }
}

/**
 * Simple YAML converter for AsyncAPI documents
 * For production use, consider using a proper YAML library
 */
function convertToYAML(obj: any, indent = 0): string {
  const spaces = '  '.repeat(indent)
  let yaml = ''

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === 'object' && item !== null) {
        yaml += `${spaces}-\n${convertToYAML(item, indent + 1)}`
      } else {
        yaml += `${spaces}- ${item}\n`
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) continue

      if (typeof value === 'object' && value !== null) {
        yaml += `${spaces}${key}:\n${convertToYAML(value, indent + 1)}`
      } else if (typeof value === 'string') {
        yaml += `${spaces}${key}: "${value}"\n`
      } else {
        yaml += `${spaces}${key}: ${value}\n`
      }
    }
  }

  return yaml
}
