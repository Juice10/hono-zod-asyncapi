import { describe, it, expect } from 'vitest'
import { createChannel, createMessage, z } from '../index'

describe('createChannel', () => {
  it('should create a channel with send message', () => {
    const channel = createChannel({
      path: '/test',
      send: {
        payload: z.object({ data: z.string() }),
      },
    })

    expect(channel.path).toBe('/test')
    expect(channel.send).toBeDefined()
    expect(channel.send!.payload).toBeDefined()
  })

  it('should create a channel with receive message', () => {
    const channel = createChannel({
      path: '/test',
      receive: {
        payload: z.object({ data: z.string() }),
      },
    })

    expect(channel.path).toBe('/test')
    expect(channel.receive).toBeDefined()
    expect(channel.receive!.payload).toBeDefined()
  })

  it('should create a bidirectional channel', () => {
    const channel = createChannel({
      path: '/bidirectional',
      send: {
        payload: z.object({ out: z.string() }),
      },
      receive: {
        payload: z.object({ in: z.string() }),
      },
    })

    expect(channel.send).toBeDefined()
    expect(channel.receive).toBeDefined()
  })

  it('should include description', () => {
    const channel = createChannel({
      path: '/described',
      description: 'A described channel',
      send: {
        payload: z.object({ data: z.string() }),
      },
    })

    expect(channel.description).toBe('A described channel')
  })

  it('should include tags', () => {
    const channel = createChannel({
      path: '/tagged',
      tags: ['tag1', 'tag2'],
      send: {
        payload: z.object({ data: z.string() }),
      },
    })

    expect(channel.tags).toEqual(['tag1', 'tag2'])
  })

  it('should include parameters', () => {
    const channel = createChannel({
      path: '/users/:userId',
      parameters: {
        userId: z.string().uuid(),
      },
      send: {
        payload: z.object({ data: z.string() }),
      },
    })

    expect(channel.parameters).toBeDefined()
    expect(channel.parameters!.userId).toBeDefined()
  })

  it('should include servers', () => {
    const channel = createChannel({
      path: '/test',
      servers: ['production', 'staging'],
      send: {
        payload: z.object({ data: z.string() }),
      },
    })

    expect(channel.servers).toEqual(['production', 'staging'])
  })

  it('should include message metadata', () => {
    const channel = createChannel({
      path: '/test',
      send: {
        payload: z.object({ data: z.string() }),
        description: 'Send description',
        summary: 'Send summary',
        name: 'SendMessage',
        contentType: 'application/json',
      },
    })

    expect(channel.send!.description).toBe('Send description')
    expect(channel.send!.summary).toBe('Send summary')
    expect(channel.send!.name).toBe('SendMessage')
    expect(channel.send!.contentType).toBe('application/json')
  })

  it('should support message headers', () => {
    const channel = createChannel({
      path: '/test',
      send: {
        payload: z.object({ data: z.string() }),
        headers: z.object({
          authorization: z.string(),
        }),
      },
    })

    expect(channel.send!.headers).toBeDefined()
  })

  it('should create channels with path parameters', () => {
    const channel = createChannel({
      path: '/rooms/:roomId/users/:userId',
      send: {
        payload: z.object({ message: z.string() }),
      },
    })

    expect(channel.path).toBe('/rooms/:roomId/users/:userId')
  })

  it('should support complex payload schemas', () => {
    const channel = createChannel({
      path: '/complex',
      send: {
        payload: z.object({
          id: z.string().uuid(),
          data: z.array(
            z.object({
              name: z.string(),
              value: z.number(),
            })
          ),
          metadata: z.record(z.any()),
          status: z.enum(['active', 'inactive']),
        }),
      },
    })

    expect(channel.send!.payload).toBeDefined()
  })
})

describe('createMessage', () => {
  it('should create a message config', () => {
    const message = createMessage({
      payload: z.object({ data: z.string() }),
      description: 'Test message',
    })

    expect(message.payload).toBeDefined()
    expect(message.description).toBe('Test message')
  })

  it('should include all message properties', () => {
    const message = createMessage({
      payload: z.object({ data: z.string() }),
      headers: z.object({ auth: z.string() }),
      contentType: 'application/json',
      description: 'Description',
      summary: 'Summary',
      name: 'TestMessage',
    })

    expect(message.payload).toBeDefined()
    expect(message.headers).toBeDefined()
    expect(message.contentType).toBe('application/json')
    expect(message.description).toBe('Description')
    expect(message.summary).toBe('Summary')
    expect(message.name).toBe('TestMessage')
  })

  it('should create messages without payload', () => {
    const message = createMessage({
      description: 'No payload message',
    })

    expect(message.description).toBe('No payload message')
    expect(message.payload).toBeUndefined()
  })
})
