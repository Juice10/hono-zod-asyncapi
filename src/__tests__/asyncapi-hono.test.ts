import { describe, it, expect, beforeEach } from 'vitest'
import { AsyncAPIHono, createChannel, z } from '../index'

describe('AsyncAPIHono', () => {
  let app: AsyncAPIHono

  beforeEach(() => {
    app = new AsyncAPIHono({
      info: {
        title: 'Test API',
        version: '1.0.0',
      },
    })
  })

  describe('channel registration', () => {
    it('should register a channel', () => {
      const channel = createChannel({
        path: '/test',
        send: {
          payload: z.object({ message: z.string() }),
        },
      })

      app.channel('test', channel)

      const registered = app.asyncAPIRegistry.getChannel('test')
      expect(registered).toBeDefined()
      expect(registered?.config.path).toBe('/test')
    })

    it('should register multiple channels', () => {
      const channel1 = createChannel({
        path: '/test1',
        send: { payload: z.object({ data: z.string() }) },
      })

      const channel2 = createChannel({
        path: '/test2',
        receive: { payload: z.object({ data: z.number() }) },
      })

      app.channel('test1', channel1)
      app.channel('test2', channel2)

      expect(app.asyncAPIRegistry.getChannel('test1')).toBeDefined()
      expect(app.asyncAPIRegistry.getChannel('test2')).toBeDefined()
    })
  })

  describe('AsyncAPI document generation', () => {
    it('should generate a valid AsyncAPI document', () => {
      const channel = createChannel({
        path: '/chat',
        description: 'Chat channel',
        send: {
          payload: z.object({ message: z.string() }),
          description: 'Send a message',
        },
      })

      app.channel('chat', channel)

      const doc = app.getAsyncAPIDocument()

      expect(doc.asyncapi).toBe('3.0.0')
      expect(doc.info.title).toBe('Test API')
      expect(doc.channels).toBeDefined()
      expect(doc.channels.chat).toBeDefined()
      expect(doc.channels.chat.address).toBe('/chat')
      expect(doc.channels.chat.description).toBe('Chat channel')
    })

    it('should include operations in the document', () => {
      const channel = createChannel({
        path: '/events',
        send: {
          payload: z.object({ event: z.string() }),
        },
        receive: {
          payload: z.object({ event: z.string() }),
        },
      })

      app.channel('events', channel)

      const doc = app.getAsyncAPIDocument()

      expect(doc.operations).toBeDefined()
      expect(Object.keys(doc.operations!)).toHaveLength(2)

      const operations = Object.values(doc.operations!)
      const sendOp = operations.find((op) => op.action === 'send')
      const receiveOp = operations.find((op) => op.action === 'receive')

      expect(sendOp).toBeDefined()
      expect(receiveOp).toBeDefined()
    })

    it('should include schemas in components', () => {
      const channel = createChannel({
        path: '/data',
        send: {
          payload: z.object({
            id: z.string(),
            value: z.number(),
          }),
        },
      })

      app.channel('data', channel)

      const doc = app.getAsyncAPIDocument()

      expect(doc.components).toBeDefined()
      expect(doc.components!.schemas).toBeDefined()
      expect(Object.keys(doc.components!.schemas!).length).toBeGreaterThan(0)
    })
  })

  describe('channel merging', () => {
    it('should merge channels from another app', () => {
      const app1 = new AsyncAPIHono()
      const app2 = new AsyncAPIHono()

      const channel1 = createChannel({
        path: '/channel1',
        send: { payload: z.object({ data: z.string() }) },
      })

      const channel2 = createChannel({
        path: '/channel2',
        send: { payload: z.object({ data: z.string() }) },
      })

      app1.channel('channel1', channel1)
      app2.channel('channel2', channel2)

      app1.route('/sub', app2)

      expect(app1.asyncAPIRegistry.getChannel('channel1')).toBeDefined()
      expect(app1.asyncAPIRegistry.getChannel('channel2')).toBeDefined()
    })
  })

  describe('type inference', () => {
    it('should provide type-safe channel definitions', () => {
      const channel = createChannel({
        path: '/typed/:id',
        send: {
          payload: z.object({
            message: z.string(),
            count: z.number(),
          }),
        },
      })

      // TypeScript should enforce correct types
      type SendPayload = typeof channel.send extends { payload: infer P }
        ? P extends z.ZodType<infer T>
          ? T
          : never
        : never

      const validPayload: SendPayload = {
        message: 'test',
        count: 42,
      }

      expect(validPayload).toBeDefined()
    })
  })
})

describe('createChannel', () => {
  it('should create a channel configuration', () => {
    const channel = createChannel({
      path: '/test',
      description: 'Test channel',
      send: {
        payload: z.object({ data: z.string() }),
      },
    })

    expect(channel.path).toBe('/test')
    expect(channel.description).toBe('Test channel')
    expect(channel.send).toBeDefined()
  })

  it('should support bidirectional channels', () => {
    const channel = createChannel({
      path: '/bidirectional',
      send: {
        payload: z.object({ outgoing: z.string() }),
      },
      receive: {
        payload: z.object({ incoming: z.string() }),
      },
    })

    expect(channel.send).toBeDefined()
    expect(channel.receive).toBeDefined()
  })

  it('should support tags and parameters', () => {
    const channel = createChannel({
      path: '/tagged/:param',
      tags: ['tag1', 'tag2'],
      parameters: {
        param: z.string(),
      },
      send: {
        payload: z.object({ data: z.string() }),
      },
    })

    expect(channel.tags).toEqual(['tag1', 'tag2'])
    expect(channel.parameters).toBeDefined()
  })
})
