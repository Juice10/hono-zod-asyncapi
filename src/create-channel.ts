import type { ChannelConfig, MessageConfig } from './types'

/**
 * Create a typed channel configuration for AsyncAPI
 *
 * @example
 * const chatChannel = createChannel({
 *   path: '/chat/:roomId',
 *   description: 'Real-time chat channel',
 *   send: {
 *     payload: z.object({
 *       message: z.string(),
 *       userId: z.string(),
 *     }),
 *     description: 'Send a chat message',
 *   },
 *   receive: {
 *     payload: z.object({
 *       message: z.string(),
 *       userId: z.string(),
 *       timestamp: z.number(),
 *     }),
 *     description: 'Receive chat messages',
 *   },
 * })
 */
export function createChannel<
  TPath extends string,
  TSend extends MessageConfig | undefined = undefined,
  TReceive extends MessageConfig | undefined = undefined
>(
  config: ChannelConfig<TPath, TSend extends MessageConfig ? TSend : never, TReceive extends MessageConfig ? TReceive : never>
): ChannelConfig<TPath, TSend extends MessageConfig ? TSend : never, TReceive extends MessageConfig ? TReceive : never> {
  return config as any
}

/**
 * Create a message configuration
 *
 * @example
 * const message = createMessage({
 *   payload: z.object({
 *     event: z.string(),
 *     data: z.any(),
 *   }),
 *   description: 'Generic event message',
 * })
 */
export function createMessage<T extends MessageConfig>(config: T): T {
  return config
}
