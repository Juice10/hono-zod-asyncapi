import { describe, it, expect } from 'vitest'
import {
  generateAsyncAPIDocument,
  createWebSocketServer,
  createSecureWebSocketServer,
  stringifyAsyncAPI,
} from '../generator'
import { AsyncAPIRegistry } from '../registry'
import { createChannel, z } from '../index'

describe('generator', () => {
  describe('generateAsyncAPIDocument', () => {
    it('should generate a valid AsyncAPI document', () => {
      const registry = new AsyncAPIRegistry()
      const channel = createChannel({
        path: '/test',
        send: {
          payload: z.object({ message: z.string() }),
        },
      })

      registry.registerChannel('test', channel)

      const doc = generateAsyncAPIDocument(registry, {
        info: {
          title: 'Test API',
          version: '1.0.0',
        },
      })

      expect(doc.asyncapi).toBe('3.0.0')
      expect(doc.info.title).toBe('Test API')
      expect(doc.info.version).toBe('1.0.0')
      expect(doc.channels).toBeDefined()
      expect(doc.operations).toBeDefined()
      expect(doc.components).toBeDefined()
    })

    it('should include servers in the document', () => {
      const registry = new AsyncAPIRegistry()
      const channel = createChannel({
        path: '/test',
        send: { payload: z.object({ data: z.string() }) },
      })

      registry.registerChannel('test', channel)

      const doc = generateAsyncAPIDocument(registry, {
        info: { title: 'Test', version: '1.0.0' },
        servers: {
          dev: {
            host: 'localhost:3000',
            protocol: 'ws',
          },
        },
      })

      expect(doc.servers).toBeDefined()
      expect(doc.servers!.dev).toBeDefined()
      expect(doc.servers!.dev.host).toBe('localhost:3000')
    })

    it('should generate channel objects correctly', () => {
      const registry = new AsyncAPIRegistry()
      const channel = createChannel({
        path: '/chat/:roomId',
        description: 'Chat room',
        send: {
          payload: z.object({ message: z.string() }),
        },
      })

      registry.registerChannel('chat', channel)

      const doc = generateAsyncAPIDocument(registry, {
        info: { title: 'Test', version: '1.0.0' },
      })

      expect(doc.channels.chat).toBeDefined()
      expect(doc.channels.chat.address).toBe('/chat/:roomId')
      expect(doc.channels.chat.description).toBe('Chat room')
    })

    it('should generate operations correctly', () => {
      const registry = new AsyncAPIRegistry()
      const channel = createChannel({
        path: '/events',
        send: {
          payload: z.object({ event: z.string() }),
          summary: 'Send event',
        },
        receive: {
          payload: z.object({ event: z.string() }),
          summary: 'Receive event',
        },
      })

      registry.registerChannel('events', channel)

      const doc = generateAsyncAPIDocument(registry, {
        info: { title: 'Test', version: '1.0.0' },
      })

      const operations = Object.values(doc.operations!)
      expect(operations).toHaveLength(2)

      const sendOp = operations.find((op) => op.action === 'send')
      const receiveOp = operations.find((op) => op.action === 'receive')

      expect(sendOp).toBeDefined()
      expect(sendOp!.summary).toBe('Send event')
      expect(receiveOp).toBeDefined()
      expect(receiveOp!.summary).toBe('Receive event')
    })

    it('should add schemas to components', () => {
      const registry = new AsyncAPIRegistry()
      const channel = createChannel({
        path: '/data',
        send: {
          payload: z.object({
            id: z.string(),
            value: z.number(),
          }),
        },
      })

      registry.registerChannel('data', channel)

      const doc = generateAsyncAPIDocument(registry, {
        info: { title: 'Test', version: '1.0.0' },
      })

      expect(doc.components!.schemas).toBeDefined()
      expect(Object.keys(doc.components!.schemas!).length).toBeGreaterThan(0)
    })

    it('should add messages to components', () => {
      const registry = new AsyncAPIRegistry()
      const channel = createChannel({
        path: '/messages',
        send: {
          payload: z.object({ text: z.string() }),
          name: 'TextMessage',
        },
      })

      registry.registerChannel('messages', channel)

      const doc = generateAsyncAPIDocument(registry, {
        info: { title: 'Test', version: '1.0.0' },
      })

      expect(doc.components!.messages).toBeDefined()
      expect(Object.keys(doc.components!.messages!).length).toBeGreaterThan(0)
    })

    it('should handle channels with tags', () => {
      const registry = new AsyncAPIRegistry()
      const channel = createChannel({
        path: '/tagged',
        tags: ['tag1', 'tag2'],
        send: {
          payload: z.object({ data: z.string() }),
        },
      })

      registry.registerChannel('tagged', channel)

      const doc = generateAsyncAPIDocument(registry, {
        info: { title: 'Test', version: '1.0.0' },
      })

      expect(doc.channels.tagged.tags).toBeDefined()
      expect(doc.channels.tagged.tags).toHaveLength(2)
      expect(doc.channels.tagged.tags![0].name).toBe('tag1')
    })

    it('should handle multiple channels', () => {
      const registry = new AsyncAPIRegistry()

      const channel1 = createChannel({
        path: '/channel1',
        send: { payload: z.object({ data: z.string() }) },
      })

      const channel2 = createChannel({
        path: '/channel2',
        receive: { payload: z.object({ data: z.number() }) },
      })

      registry.registerChannel('channel1', channel1)
      registry.registerChannel('channel2', channel2)

      const doc = generateAsyncAPIDocument(registry, {
        info: { title: 'Test', version: '1.0.0' },
      })

      expect(Object.keys(doc.channels)).toHaveLength(2)
      expect(doc.channels.channel1).toBeDefined()
      expect(doc.channels.channel2).toBeDefined()
    })

    it('should handle message headers', () => {
      const registry = new AsyncAPIRegistry()
      const channel = createChannel({
        path: '/with-headers',
        send: {
          payload: z.object({ data: z.string() }),
          headers: z.object({
            'content-type': z.string(),
            authorization: z.string(),
          }),
        },
      })

      registry.registerChannel('withHeaders', channel)

      const doc = generateAsyncAPIDocument(registry, {
        info: { title: 'Test', version: '1.0.0' },
      })

      const messages = doc.components!.messages!
      const messageKey = Object.keys(messages)[0]
      const message = messages[messageKey]

      expect(message.headers).toBeDefined()
    })
  })

  describe('createWebSocketServer', () => {
    it('should create a WebSocket server config', () => {
      const server = createWebSocketServer('localhost:3000', 'Dev server')

      expect(server.host).toBe('localhost:3000')
      expect(server.protocol).toBe('ws')
      expect(server.description).toBe('Dev server')
    })

    it('should use default description', () => {
      const server = createWebSocketServer('localhost:3000')

      expect(server.description).toBe('WebSocket server')
    })
  })

  describe('createSecureWebSocketServer', () => {
    it('should create a secure WebSocket server config', () => {
      const server = createSecureWebSocketServer('example.com', 'Production')

      expect(server.host).toBe('example.com')
      expect(server.protocol).toBe('wss')
      expect(server.description).toBe('Production')
    })

    it('should use default description', () => {
      const server = createSecureWebSocketServer('example.com')

      expect(server.description).toBe('Secure WebSocket server')
    })
  })

  describe('stringifyAsyncAPI', () => {
    it('should stringify AsyncAPI document', () => {
      const registry = new AsyncAPIRegistry()
      const channel = createChannel({
        path: '/test',
        send: { payload: z.object({ data: z.string() }) },
      })

      registry.registerChannel('test', channel)

      const doc = generateAsyncAPIDocument(registry, {
        info: { title: 'Test', version: '1.0.0' },
      })

      const json = stringifyAsyncAPI(doc)

      expect(typeof json).toBe('string')
      expect(json).toContain('"asyncapi"')
      expect(json).toContain('"3.0.0"')
    })

    it('should stringify with pretty formatting by default', () => {
      const registry = new AsyncAPIRegistry()
      const channel = createChannel({
        path: '/test',
        send: { payload: z.object({ data: z.string() }) },
      })

      registry.registerChannel('test', channel)

      const doc = generateAsyncAPIDocument(registry, {
        info: { title: 'Test', version: '1.0.0' },
      })

      const json = stringifyAsyncAPI(doc)

      expect(json).toContain('\n')
      expect(json).toContain('  ')
    })

    it('should stringify without formatting when pretty is false', () => {
      const registry = new AsyncAPIRegistry()
      const channel = createChannel({
        path: '/test',
        send: { payload: z.object({ data: z.string() }) },
      })

      registry.registerChannel('test', channel)

      const doc = generateAsyncAPIDocument(registry, {
        info: { title: 'Test', version: '1.0.0' },
      })

      const json = stringifyAsyncAPI(doc, false)

      expect(json).not.toContain('\n  ')
    })
  })
})
