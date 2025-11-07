import type { ChannelConfig, RegisteredChannel, ChannelHandler } from './types'

/**
 * Registry for storing channel configurations and metadata
 */
export class AsyncAPIRegistry {
  private channels: Map<string, RegisteredChannel> = new Map()
  private operationCounter = 0

  /**
   * Register a channel with its configuration
   */
  registerChannel(id: string, config: ChannelConfig, handler?: ChannelHandler): void {
    const operations: RegisteredChannel['operations'] = {}

    if (config.send) {
      operations.send = {
        operationId: `send_${id}_${this.operationCounter++}`,
        summary: config.send.summary,
        description: config.send.description,
        tags: config.tags,
      }
    }

    if (config.receive) {
      operations.receive = {
        operationId: `receive_${id}_${this.operationCounter++}`,
        summary: config.receive.summary,
        description: config.receive.description,
        tags: config.tags,
      }
    }

    this.channels.set(id, {
      config,
      handler,
      operations,
    })
  }

  /**
   * Get a registered channel by ID
   */
  getChannel(id: string): RegisteredChannel | undefined {
    return this.channels.get(id)
  }

  /**
   * Get all registered channels
   */
  getAllChannels(): Map<string, RegisteredChannel> {
    return this.channels
  }

  /**
   * Clear all registered channels
   */
  clear(): void {
    this.channels.clear()
    this.operationCounter = 0
  }

  /**
   * Merge another registry into this one
   */
  merge(other: AsyncAPIRegistry): void {
    for (const [id, channel] of other.getAllChannels()) {
      this.channels.set(id, channel)
    }
  }
}
