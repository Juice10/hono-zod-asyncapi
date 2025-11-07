// Main exports
export { AsyncAPIHono } from './asyncapi-hono'
export type { AsyncAPIHonoOptions, ValidationHook } from './asyncapi-hono'

// Channel creation utilities
export { createChannel, createMessage } from './create-channel'

// Registry
export { AsyncAPIRegistry } from './registry'

// Generator utilities
export {
  generateAsyncAPIDocument,
  stringifyAsyncAPI,
  createWebSocketServer,
  createSecureWebSocketServer,
} from './generator'
export type { GeneratorOptions } from './generator'

// Zod integration
export { z, zodToAsyncAPISchema } from './zod-to-schema'

// Integration with @hono/zod-openapi
export {
  UnifiedAPIHono,
  mergeAPIDocs,
  createUnifiedInfo,
  createUnifiedServers,
} from './integration'

// Type exports
export type {
  // AsyncAPI Document types
  AsyncAPIDocument,
  InfoObject,
  ContactObject,
  LicenseObject,
  ServerObject,
  ServerVariableObject,
  ChannelObject,
  MessageObject,
  OperationObject,
  OperationReplyObject,
  ParameterObject,
  TagObject,
  Reference,
  SchemaObject,
  ComponentsObject,

  // Channel configuration types
  ChannelConfig,
  MessageConfig,
  OperationAction,

  // Handler types
  ChannelHandler,
  ChannelContext,
  WebSocketData,

  // Utility types
  InferMessagePayload,
  InferMessageHeaders,
  ExtractParams,

  // Registry types
  RegisteredChannel,
  OperationMetadata,

  // Binding types
  ChannelBindingsObject,
  MessageBindingsObject,
  OperationBindingsObject,
  WebSocketChannelBinding,
  WebSocketMessageBinding,
  WebSocketOperationBinding,
  CorrelationIDObject,
} from './types'
