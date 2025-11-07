import { describe, it, expect, beforeEach } from 'vitest'
import { OpenAPIHono, createRoute, z as openAPIZ } from '@hono/zod-openapi'
import {
  AsyncAPIHono,
  createChannel,
  z,
  mergeAPIDocs,
  UnifiedAPIHono,
  createUnifiedInfo,
  createUnifiedServers,
} from '../index'

describe('Integration with @hono/zod-openapi', () => {
  describe('UnifiedAPIHono', () => {
    it('should create a unified app supporting both OpenAPI and AsyncAPI', () => {
      const app = new UnifiedAPIHono({
        openapi: {
          info: {
            title: 'Unified API',
            version: '1.0.0',
          },
        },
        asyncapi: {
          info: {
            title: 'WebSocket API',
            version: '1.0.0',
          },
        },
      })

      // Add AsyncAPI channel
      const channel = createChannel({
        path: '/ws/chat',
        send: {
          payload: z.object({ message: z.string() }),
        },
      })

      app.channel('chat', channel)

      // Verify channel was registered
      const registered = app.asyncAPIRegistry.getChannel('chat')
      expect(registered).toBeDefined()
      expect(registered!.config.path).toBe('/ws/chat')
    })

    it('should generate AsyncAPI document', () => {
      const app = new UnifiedAPIHono({
        asyncapi: {
          info: {
            title: 'Test API',
            version: '1.0.0',
          },
        },
      })

      const channel = createChannel({
        path: '/notifications',
        send: {
          payload: z.object({ type: z.string(), data: z.any() }),
        },
      })

      app.channel('notifications', channel)

      const doc = app.getAsyncAPIDocument()

      expect(doc.asyncapi).toBe('3.0.0')
      expect(doc.info.title).toBe('Test API')
      expect(doc.channels.notifications).toBeDefined()
    })

    it('should support docs method for serving both specs', () => {
      const app = new UnifiedAPIHono({
        openapi: {
          info: { title: 'REST API', version: '1.0.0' },
        },
        asyncapi: {
          info: { title: 'WS API', version: '1.0.0' },
        },
      })

      // This should register both endpoints
      expect(() => app.docs('/openapi.json', '/asyncapi.json')).not.toThrow()
    })
  })

  describe('mergeAPIDocs', () => {
    it('should merge OpenAPIHono and AsyncAPIHono apps', () => {
      // Create OpenAPI app with REST routes
      const openAPIApp = new OpenAPIHono()

      const restRoute = createRoute({
        method: 'get',
        path: '/users',
        request: {},
        responses: {
          200: {
            content: {
              'application/json': {
                schema: openAPIZ.object({
                  users: openAPIZ.array(openAPIZ.string()),
                }),
              },
            },
            description: 'List of users',
          },
        },
      })

      openAPIApp.openapi(restRoute, (c) => {
        return c.json({ users: ['Alice', 'Bob'] })
      })

      // Create AsyncAPI app with WebSocket channels
      const asyncAPIApp = new AsyncAPIHono()

      const wsChannel = createChannel({
        path: '/ws/events',
        send: {
          payload: z.object({ event: z.string(), data: z.any() }),
        },
      })

      asyncAPIApp.channel('events', wsChannel)

      // Merge them
      const mergedApp = mergeAPIDocs(openAPIApp, asyncAPIApp)

      // Verify OpenAPI functionality still works
      expect(mergedApp.getOpenAPIDocument).toBeDefined()
      // getOpenAPIDocument should be callable without errors
      expect(() => mergedApp.getOpenAPIDocument()).not.toThrow()

      // Verify AsyncAPI functionality was added
      expect(mergedApp.asyncAPIRegistry).toBeDefined()
      expect(mergedApp.getAsyncAPIDocument).toBeDefined()
      const asyncapiDoc = mergedApp.getAsyncAPIDocument()
      expect(asyncapiDoc.asyncapi).toBe('3.0.0')
      expect(asyncapiDoc.channels.events).toBeDefined()
    })

    it('should allow adding more channels after merging', () => {
      const openAPIApp = new OpenAPIHono()
      const asyncAPIApp = new AsyncAPIHono()

      const channel1 = createChannel({
        path: '/ws/chat',
        send: { payload: z.object({ msg: z.string() }) },
      })

      asyncAPIApp.channel('chat', channel1)

      const mergedApp = mergeAPIDocs(openAPIApp, asyncAPIApp)

      // Add another channel through the merged app
      const channel2 = createChannel({
        path: '/ws/notifications',
        send: { payload: z.object({ notification: z.string() }) },
      })

      mergedApp.channel('notifications', channel2)

      // Both channels should be present
      const doc = mergedApp.getAsyncAPIDocument()
      expect(doc.channels.chat).toBeDefined()
      expect(doc.channels.notifications).toBeDefined()
    })

    it('should support serving both API docs', () => {
      const openAPIApp = new OpenAPIHono()
      const asyncAPIApp = new AsyncAPIHono({
        info: {
          title: 'WebSocket API',
          version: '1.0.0',
        },
      })

      const channel = createChannel({
        path: '/ws/stream',
        send: { payload: z.object({ data: z.string() }) },
      })

      asyncAPIApp.channel('stream', channel)

      const mergedApp = mergeAPIDocs(openAPIApp, asyncAPIApp)

      // Should be able to add both doc endpoints
      expect(() => {
        mergedApp.doc('/openapi.json')
        mergedApp.asyncapiDoc('/asyncapi.json')
      }).not.toThrow()
    })
  })

  describe('createUnifiedInfo', () => {
    it('should create info objects for both OpenAPI and AsyncAPI', () => {
      const info = createUnifiedInfo({
        title: 'My API',
        version: '2.0.0',
        description: 'A unified API with REST and WebSocket support',
        contact: {
          name: 'API Team',
          email: 'api@example.com',
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT',
        },
      })

      expect(info.openapi).toBeDefined()
      expect(info.asyncapi).toBeDefined()

      expect(info.openapi.title).toBe('My API')
      expect(info.asyncapi.title).toBe('My API')

      expect(info.openapi.version).toBe('2.0.0')
      expect(info.asyncapi.version).toBe('2.0.0')

      expect(info.openapi.contact.email).toBe('api@example.com')
      expect(info.asyncapi.contact?.email).toBe('api@example.com')
    })

    it('should work with minimal configuration', () => {
      const info = createUnifiedInfo({
        title: 'Simple API',
        version: '1.0.0',
      })

      expect(info.openapi.title).toBe('Simple API')
      expect(info.asyncapi.title).toBe('Simple API')
    })
  })

  describe('createUnifiedServers', () => {
    it('should create server configs for both HTTP and WebSocket', () => {
      const servers = createUnifiedServers({
        http: {
          url: 'https://api.example.com',
          description: 'Production HTTP server',
        },
        ws: {
          host: 'ws.example.com',
          protocol: 'wss',
          description: 'Production WebSocket server',
        },
      })

      expect(servers.openapi).toBeDefined()
      expect(servers.asyncapi).toBeDefined()

      expect(servers.openapi.default.url).toBe('https://api.example.com')
      expect(servers.asyncapi.default.host).toBe('ws.example.com')
      expect(servers.asyncapi.default.protocol).toBe('wss')
    })

    it('should work with HTTP only', () => {
      const servers = createUnifiedServers({
        http: {
          url: 'http://localhost:3000',
        },
      })

      expect(servers.openapi.default).toBeDefined()
      expect(Object.keys(servers.asyncapi)).toHaveLength(0)
    })

    it('should work with WebSocket only', () => {
      const servers = createUnifiedServers({
        ws: {
          host: 'localhost:3000',
          protocol: 'ws',
        },
      })

      expect(Object.keys(servers.openapi)).toHaveLength(0)
      expect(servers.asyncapi.default).toBeDefined()
    })
  })

  describe('Real-world integration scenario', () => {
    it('should support a complete API with REST and WebSocket', () => {
      // Create OpenAPI routes
      const openAPIApp = new OpenAPIHono()

      const getUserRoute = createRoute({
        method: 'get',
        path: '/api/users/:id',
        request: {
          params: openAPIZ.object({
            id: openAPIZ.string(),
          }),
        },
        responses: {
          200: {
            content: {
              'application/json': {
                schema: openAPIZ.object({
                  id: openAPIZ.string(),
                  name: openAPIZ.string(),
                }),
              },
            },
            description: 'User details',
          },
        },
      })

      openAPIApp.openapi(getUserRoute, (c) => {
        const { id } = c.req.valid('param')
        return c.json({ id, name: 'Test User' })
      })

      // Create AsyncAPI channels
      const asyncAPIApp = new AsyncAPIHono({
        info: {
          title: 'Real-time Events API',
          version: '1.0.0',
        },
      })

      const userEventsChannel = createChannel({
        path: '/ws/users/:userId/events',
        description: 'Real-time user events',
        send: {
          payload: z.object({
            type: z.enum(['login', 'logout', 'update']),
            userId: z.string(),
            timestamp: z.number(),
          }),
          description: 'User event notifications',
        },
      })

      asyncAPIApp.channel('userEvents', userEventsChannel)

      // Merge both
      const app = mergeAPIDocs(openAPIApp, asyncAPIApp)

      // Verify OpenAPI document can be generated
      expect(app.getOpenAPIDocument).toBeDefined()
      expect(() => app.getOpenAPIDocument()).not.toThrow()

      // Verify AsyncAPI
      const asyncapiDoc = app.getAsyncAPIDocument()
      expect(asyncapiDoc.channels.userEvents).toBeDefined()
      expect(asyncapiDoc.channels.userEvents.address).toBe('/ws/users/:userId/events')

      // AsyncAPI channels should not contain REST routes
      expect(asyncapiDoc.channels['/api/users/:id']).toBeUndefined()
    })

    it('should allow serving complete API documentation', () => {
      const openAPIApp = new OpenAPIHono()
      const asyncAPIApp = new AsyncAPIHono()

      // Add a REST endpoint
      const healthRoute = createRoute({
        method: 'get',
        path: '/health',
        responses: {
          200: {
            content: {
              'application/json': {
                schema: openAPIZ.object({ status: openAPIZ.string() }),
              },
            },
            description: 'Health check',
          },
        },
      })

      openAPIApp.openapi(healthRoute, (c) => c.json({ status: 'ok' }))

      // Add a WebSocket channel
      const pingChannel = createChannel({
        path: '/ws/ping',
        receive: { payload: z.object({ ping: z.string() }) },
        send: { payload: z.object({ pong: z.string() }) },
      })

      asyncAPIApp.channel('ping', pingChannel)

      // Merge and serve docs
      const app = mergeAPIDocs(openAPIApp, asyncAPIApp)
      app.doc('/api/docs')
      app.asyncapiDoc('/ws/docs')

      // Both doc methods should work
      expect(app.getOpenAPIDocument()).toBeDefined()
      expect(app.getAsyncAPIDocument()).toBeDefined()
    })
  })
})
