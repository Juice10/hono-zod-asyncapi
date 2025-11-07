import { describe, it, expect, beforeEach } from 'vitest'
import { AsyncAPIRegistry } from '../registry'
import { createChannel, z } from '../index'

describe('AsyncAPIRegistry', () => {
  let registry: AsyncAPIRegistry

  beforeEach(() => {
    registry = new AsyncAPIRegistry()
  })

  describe('registerChannel', () => {
    it('should register a channel with send operation', () => {
      const channel = createChannel({
        path: '/test',
        send: {
          payload: z.object({ data: z.string() }),
        },
      })

      registry.registerChannel('test', channel)

      const registered = registry.getChannel('test')
      expect(registered).toBeDefined()
      expect(registered!.operations.send).toBeDefined()
      expect(registered!.operations.send!.operationId).toContain('send_test')
    })

    it('should register a channel with receive operation', () => {
      const channel = createChannel({
        path: '/test',
        receive: {
          payload: z.object({ data: z.string() }),
        },
      })

      registry.registerChannel('test', channel)

      const registered = registry.getChannel('test')
      expect(registered).toBeDefined()
      expect(registered!.operations.receive).toBeDefined()
      expect(registered!.operations.receive!.operationId).toContain('receive_test')
    })

    it('should register a channel with both operations', () => {
      const channel = createChannel({
        path: '/test',
        send: {
          payload: z.object({ out: z.string() }),
        },
        receive: {
          payload: z.object({ in: z.string() }),
        },
      })

      registry.registerChannel('test', channel)

      const registered = registry.getChannel('test')
      expect(registered!.operations.send).toBeDefined()
      expect(registered!.operations.receive).toBeDefined()
    })

    it('should include metadata in operations', () => {
      const channel = createChannel({
        path: '/test',
        send: {
          payload: z.object({ data: z.string() }),
          summary: 'Test summary',
          description: 'Test description',
        },
        tags: ['test-tag'],
      })

      registry.registerChannel('test', channel)

      const registered = registry.getChannel('test')
      expect(registered!.operations.send!.summary).toBe('Test summary')
      expect(registered!.operations.send!.description).toBe('Test description')
      expect(registered!.operations.send!.tags).toEqual(['test-tag'])
    })

    it('should generate unique operation IDs', () => {
      const channel1 = createChannel({
        path: '/test1',
        send: { payload: z.object({ data: z.string() }) },
      })

      const channel2 = createChannel({
        path: '/test2',
        send: { payload: z.object({ data: z.string() }) },
      })

      registry.registerChannel('test1', channel1)
      registry.registerChannel('test2', channel2)

      const op1 = registry.getChannel('test1')!.operations.send!.operationId
      const op2 = registry.getChannel('test2')!.operations.send!.operationId

      expect(op1).not.toBe(op2)
    })
  })

  describe('getChannel', () => {
    it('should return undefined for non-existent channel', () => {
      const channel = registry.getChannel('nonexistent')
      expect(channel).toBeUndefined()
    })

    it('should return the registered channel', () => {
      const channelConfig = createChannel({
        path: '/test',
        send: { payload: z.object({ data: z.string() }) },
      })

      registry.registerChannel('test', channelConfig)

      const retrieved = registry.getChannel('test')
      expect(retrieved).toBeDefined()
      expect(retrieved!.config).toBe(channelConfig)
    })
  })

  describe('getAllChannels', () => {
    it('should return empty map initially', () => {
      const channels = registry.getAllChannels()
      expect(channels.size).toBe(0)
    })

    it('should return all registered channels', () => {
      const channel1 = createChannel({
        path: '/test1',
        send: { payload: z.object({ data: z.string() }) },
      })

      const channel2 = createChannel({
        path: '/test2',
        send: { payload: z.object({ data: z.string() }) },
      })

      registry.registerChannel('test1', channel1)
      registry.registerChannel('test2', channel2)

      const channels = registry.getAllChannels()
      expect(channels.size).toBe(2)
      expect(channels.has('test1')).toBe(true)
      expect(channels.has('test2')).toBe(true)
    })
  })

  describe('clear', () => {
    it('should remove all channels', () => {
      const channel = createChannel({
        path: '/test',
        send: { payload: z.object({ data: z.string() }) },
      })

      registry.registerChannel('test', channel)
      expect(registry.getAllChannels().size).toBe(1)

      registry.clear()
      expect(registry.getAllChannels().size).toBe(0)
    })

    it('should reset operation counter', () => {
      const channel = createChannel({
        path: '/test',
        send: { payload: z.object({ data: z.string() }) },
      })

      registry.registerChannel('test1', channel)
      const op1 = registry.getChannel('test1')!.operations.send!.operationId

      registry.clear()
      registry.registerChannel('test2', channel)
      const op2 = registry.getChannel('test2')!.operations.send!.operationId

      // After clear, counter should reset, so IDs should be similar pattern
      expect(op1).toContain('_0')
      expect(op2).toContain('_0')
    })
  })

  describe('merge', () => {
    it('should merge channels from another registry', () => {
      const registry2 = new AsyncAPIRegistry()

      const channel1 = createChannel({
        path: '/test1',
        send: { payload: z.object({ data: z.string() }) },
      })

      const channel2 = createChannel({
        path: '/test2',
        send: { payload: z.object({ data: z.string() }) },
      })

      registry.registerChannel('test1', channel1)
      registry2.registerChannel('test2', channel2)

      registry.merge(registry2)

      expect(registry.getAllChannels().size).toBe(2)
      expect(registry.getChannel('test1')).toBeDefined()
      expect(registry.getChannel('test2')).toBeDefined()
    })

    it('should overwrite existing channels on merge', () => {
      const registry2 = new AsyncAPIRegistry()

      const channel1 = createChannel({
        path: '/test',
        send: { payload: z.object({ data: z.string() }) },
      })

      const channel2 = createChannel({
        path: '/test-updated',
        send: { payload: z.object({ data: z.number() }) },
      })

      registry.registerChannel('test', channel1)
      registry2.registerChannel('test', channel2)

      registry.merge(registry2)

      const merged = registry.getChannel('test')
      expect(merged!.config.path).toBe('/test-updated')
    })
  })
})
