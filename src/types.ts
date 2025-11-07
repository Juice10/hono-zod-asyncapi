import type { z } from 'zod'

// AsyncAPI 3.0 Specification Types

export interface AsyncAPIDocument {
  asyncapi: '3.0.0'
  info: InfoObject
  servers?: Record<string, ServerObject>
  channels: Record<string, ChannelObject>
  operations?: Record<string, OperationObject>
  components?: ComponentsObject
}

export interface InfoObject {
  title: string
  version: string
  description?: string
  termsOfService?: string
  contact?: ContactObject
  license?: LicenseObject
}

export interface ContactObject {
  name?: string
  url?: string
  email?: string
}

export interface LicenseObject {
  name: string
  url?: string
}

export interface ServerObject {
  host: string
  protocol: string
  description?: string
  variables?: Record<string, ServerVariableObject>
}

export interface ServerVariableObject {
  enum?: string[]
  default?: string
  description?: string
}

export interface ChannelObject {
  address: string
  messages?: Record<string, MessageObject | Reference>
  description?: string
  servers?: Reference[]
  parameters?: Record<string, ParameterObject | Reference>
  tags?: TagObject[]
  bindings?: ChannelBindingsObject
}

export interface MessageObject {
  headers?: SchemaObject | Reference
  payload?: SchemaObject | Reference
  correlationId?: CorrelationIDObject | Reference
  contentType?: string
  name?: string
  title?: string
  summary?: string
  description?: string
  tags?: TagObject[]
  bindings?: MessageBindingsObject
}

export interface OperationObject {
  action: 'send' | 'receive'
  channel: Reference
  title?: string
  summary?: string
  description?: string
  messages?: Reference[]
  reply?: OperationReplyObject
  tags?: TagObject[]
  bindings?: OperationBindingsObject
}

export interface OperationReplyObject {
  address?: {
    location?: string
    description?: string
  }
  channel?: Reference
  messages?: Reference[]
}

export interface ParameterObject {
  enum?: string[]
  default?: string
  description?: string
  location?: string
}

export interface TagObject {
  name: string
  description?: string
}

export interface Reference {
  $ref: string
}

export interface SchemaObject {
  type?: string | string[]
  properties?: Record<string, SchemaObject | Reference>
  required?: string[]
  items?: SchemaObject | Reference
  enum?: unknown[]
  format?: string
  description?: string
  title?: string
  default?: unknown
  additionalProperties?: boolean | SchemaObject | Reference
  [key: string]: unknown
}

export interface ComponentsObject {
  schemas?: Record<string, SchemaObject | Reference>
  messages?: Record<string, MessageObject | Reference>
  parameters?: Record<string, ParameterObject | Reference>
  channels?: Record<string, ChannelObject | Reference>
  operations?: Record<string, OperationObject | Reference>
  replies?: Record<string, OperationReplyObject | Reference>
}

export interface ChannelBindingsObject {
  ws?: WebSocketChannelBinding
  [key: string]: unknown
}

export interface MessageBindingsObject {
  ws?: WebSocketMessageBinding
  [key: string]: unknown
}

export interface OperationBindingsObject {
  ws?: WebSocketOperationBinding
  [key: string]: unknown
}

export interface WebSocketChannelBinding {
  method?: string
  query?: SchemaObject | Reference
  headers?: SchemaObject | Reference
  bindingVersion?: string
}

export interface WebSocketMessageBinding {
  bindingVersion?: string
}

export interface WebSocketOperationBinding {
  bindingVersion?: string
}

export interface CorrelationIDObject {
  description?: string
  location: string
}

// Channel Configuration Types for Hono Integration

export type OperationAction = 'send' | 'receive'

export interface MessageConfig<T extends z.ZodType = z.ZodType> {
  payload?: T
  headers?: z.ZodType
  contentType?: string
  description?: string
  summary?: string
  name?: string
}

export interface ChannelConfig<
  TPath extends string = string,
  TSendMessage extends MessageConfig = MessageConfig,
  TReceiveMessage extends MessageConfig = MessageConfig
> {
  path: TPath
  description?: string
  send?: TSendMessage
  receive?: TReceiveMessage
  parameters?: Record<string, z.ZodType>
  servers?: string[]
  tags?: string[]
}

export type InferMessagePayload<T extends MessageConfig> = T['payload'] extends z.ZodType
  ? z.infer<T['payload']>
  : unknown

export type InferMessageHeaders<T extends MessageConfig> = T['headers'] extends z.ZodType
  ? z.infer<T['headers']>
  : unknown

// Channel Handler Types

export interface WebSocketData<
  TSend extends MessageConfig = MessageConfig,
  _TReceive extends MessageConfig = MessageConfig
> {
  send: (data: InferMessagePayload<TSend>) => void | Promise<void>
  close: (code?: number, reason?: string) => void
}

export type ChannelHandler<
  TConfig extends ChannelConfig = ChannelConfig,
  TPath extends string = string
> = TConfig extends ChannelConfig<infer _P, infer TSend, infer TReceive>
  ? (
      ws: WebSocketData<TSend, TReceive>,
      message: InferMessagePayload<TReceive>,
      context: ChannelContext<TPath>
    ) => void | Promise<void>
  : never

export interface ChannelContext<TPath extends string = string> {
  params: ExtractParams<TPath>
  headers: Record<string, string>
}

// Path parameter extraction utility type
export type ExtractParams<T extends string> = T extends `${infer _Start}:${infer Param}/${infer Rest}`
  ? { [K in Param | keyof ExtractParams<Rest>]: string }
  : T extends `${infer _Start}:${infer Param}`
    ? { [K in Param]: string }
    : {}

// Registry Types

export interface RegisteredChannel {
  config: ChannelConfig
  handler?: ChannelHandler
  operations: {
    send?: OperationMetadata
    receive?: OperationMetadata
  }
}

export interface OperationMetadata {
  operationId: string
  summary?: string
  description?: string
  tags?: string[]
}
