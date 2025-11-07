import type {
  AsyncAPIDocument,
  InfoObject,
  ServerObject,
  ChannelObject,
  MessageObject,
  OperationObject,
  ComponentsObject,
} from './types'
import type { AsyncAPIRegistry } from './registry'
import { zodToAsyncAPISchema } from './zod-to-schema'

export interface GeneratorOptions {
  info: InfoObject
  servers?: Record<string, ServerObject>
  components?: ComponentsObject
}

/**
 * Generate an AsyncAPI 3.0 document from the registry
 */
export function generateAsyncAPIDocument(
  registry: AsyncAPIRegistry,
  options: GeneratorOptions
): AsyncAPIDocument {
  const channels: Record<string, ChannelObject> = {}
  const operations: Record<string, OperationObject> = {}
  const components: ComponentsObject = {
    schemas: {},
    messages: {},
    ...(options.components || {}),
  }

  let schemaCounter = 0
  let messageCounter = 0

  for (const [channelId, registered] of registry.getAllChannels()) {
    const { config, operations: ops } = registered

    // Create message objects
    const channelMessages: Record<string, MessageObject> = {}

    if (config.send && ops.send) {
      const messageKey = `${channelId}_send_message`
      const message = createMessageObject(
        config.send,
        components,
        schemaCounter
      )

      components.messages![messageKey] = message
      channelMessages[messageKey] = message

      // Create send operation
      operations[ops.send.operationId] = {
        action: 'send',
        channel: { $ref: `#/channels/${channelId}` },
        summary: ops.send.summary,
        description: ops.send.description,
        messages: [{ $ref: `#/components/messages/${messageKey}` }],
        ...(ops.send.tags && ops.send.tags.length > 0 && {
          tags: ops.send.tags.map(name => ({ name })),
        }),
      }

      schemaCounter++
      messageCounter++
    }

    if (config.receive && ops.receive) {
      const messageKey = `${channelId}_receive_message`
      const message = createMessageObject(
        config.receive,
        components,
        schemaCounter
      )

      components.messages![messageKey] = message
      channelMessages[messageKey] = message

      // Create receive operation
      operations[ops.receive.operationId] = {
        action: 'receive',
        channel: { $ref: `#/channels/${channelId}` },
        summary: ops.receive.summary,
        description: ops.receive.description,
        messages: [{ $ref: `#/components/messages/${messageKey}` }],
        ...(ops.receive.tags && ops.receive.tags.length > 0 && {
          tags: ops.receive.tags.map(name => ({ name })),
        }),
      }

      schemaCounter++
      messageCounter++
    }

    // Create channel object
    channels[channelId] = {
      address: config.path,
      description: config.description,
      messages: Object.keys(channelMessages).reduce(
        (acc, key) => {
          acc[key] = { $ref: `#/components/messages/${key}` }
          return acc
        },
        {} as Record<string, any>
      ),
      ...(config.servers && { servers: config.servers.map(s => ({ $ref: `#/servers/${s}` })) }),
      ...(config.tags && config.tags.length > 0 && {
        tags: config.tags.map(name => ({ name })),
      }),
    }
  }

  return {
    asyncapi: '3.0.0',
    info: options.info,
    ...(options.servers && { servers: options.servers }),
    channels,
    operations,
    components,
  }
}

/**
 * Create a message object from message configuration
 */
function createMessageObject(
  messageConfig: any,
  components: ComponentsObject,
  counter: number
): MessageObject {
  const message: MessageObject = {
    contentType: messageConfig.contentType || 'application/json',
    name: messageConfig.name,
    summary: messageConfig.summary,
    description: messageConfig.description,
  }

  if (messageConfig.payload) {
    const schemaKey = `schema_${counter}`
    const schema = zodToAsyncAPISchema(messageConfig.payload)

    components.schemas![schemaKey] = schema
    message.payload = { $ref: `#/components/schemas/${schemaKey}` }
  }

  if (messageConfig.headers) {
    const headersKey = `headers_${counter}`
    const headersSchema = zodToAsyncAPISchema(messageConfig.headers)

    components.schemas![headersKey] = headersSchema
    message.headers = { $ref: `#/components/schemas/${headersKey}` }
  }

  return message
}

/**
 * Convert AsyncAPI document to JSON string
 */
export function stringifyAsyncAPI(document: AsyncAPIDocument, pretty = true): string {
  return JSON.stringify(document, null, pretty ? 2 : 0)
}

/**
 * Default server configuration for WebSocket
 */
export function createWebSocketServer(
  host: string,
  description?: string
): ServerObject {
  return {
    host,
    protocol: 'ws',
    description: description || 'WebSocket server',
  }
}

/**
 * Create secure WebSocket server configuration
 */
export function createSecureWebSocketServer(
  host: string,
  description?: string
): ServerObject {
  return {
    host,
    protocol: 'wss',
    description: description || 'Secure WebSocket server',
  }
}
