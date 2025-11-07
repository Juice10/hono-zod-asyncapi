/**
 * Example: Unified API with both REST (OpenAPI) and WebSocket (AsyncAPI)
 *
 * This example demonstrates how to create a complete API that combines:
 * - REST endpoints with OpenAPI documentation
 * - WebSocket channels with AsyncAPI documentation
 */

import { OpenAPIHono, createRoute, z as openAPIZ } from '@hono/zod-openapi'
import { createChannel, z, mergeAPIDocs } from '../src/index'
import { AsyncAPIHono } from '../src/asyncapi-hono'

// ===== REST API (OpenAPI) =====

const restAPI = new OpenAPIHono()

// User management endpoints
const getUsersRoute = createRoute({
  method: 'get',
  path: '/api/users',
  tags: ['Users'],
  responses: {
    200: {
      content: {
        'application/json': {
          schema: openAPIZ.object({
            users: openAPIZ.array(
              openAPIZ.object({
                id: openAPIZ.string(),
                username: openAPIZ.string(),
                status: openAPIZ.enum(['online', 'offline']),
              })
            ),
          }),
        },
      },
      description: 'List of users',
    },
  },
})

restAPI.openapi(getUsersRoute, (c) => {
  return c.json({
    users: [
      { id: '1', username: 'alice', status: 'online' },
      { id: '2', username: 'bob', status: 'offline' },
    ],
  })
})

const createUserRoute = createRoute({
  method: 'post',
  path: '/api/users',
  tags: ['Users'],
  request: {
    body: {
      content: {
        'application/json': {
          schema: openAPIZ.object({
            username: openAPIZ.string().min(3).max(20),
            email: openAPIZ.string().email(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: openAPIZ.object({
            id: openAPIZ.string(),
            username: openAPIZ.string(),
            email: openAPIZ.string(),
          }),
        },
      },
      description: 'User created',
    },
  },
})

restAPI.openapi(createUserRoute, (c) => {
  const body = c.req.valid('json')
  return c.json(
    {
      id: '123',
      username: body.username,
      email: body.email,
    },
    201
  )
})

// Message endpoints
const getMessagesRoute = createRoute({
  method: 'get',
  path: '/api/rooms/:roomId/messages',
  tags: ['Messages'],
  request: {
    params: openAPIZ.object({
      roomId: openAPIZ.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: openAPIZ.object({
            messages: openAPIZ.array(
              openAPIZ.object({
                id: openAPIZ.string(),
                userId: openAPIZ.string(),
                content: openAPIZ.string(),
                timestamp: openAPIZ.number(),
              })
            ),
          }),
        },
      },
      description: 'List of messages',
    },
  },
})

restAPI.openapi(getMessagesRoute, (c) => {
  const { roomId } = c.req.valid('param')
  return c.json({
    messages: [
      {
        id: '1',
        userId: '1',
        content: `Message in room ${roomId}`,
        timestamp: Date.now(),
      },
    ],
  })
})

// ===== WebSocket API (AsyncAPI) =====

const wsAPI = new AsyncAPIHono({
  info: {
    title: 'Real-time Communication API',
    version: '1.0.0',
    description: 'WebSocket channels for real-time features',
  },
  servers: {
    production: {
      host: 'api.example.com',
      protocol: 'wss',
      description: 'Production WebSocket server',
    },
    development: {
      host: 'localhost:3000',
      protocol: 'ws',
      description: 'Development server',
    },
  },
})

// Chat room channel
const chatRoomChannel = createChannel({
  path: '/ws/rooms/:roomId',
  description: 'Real-time chat in a specific room',
  send: {
    payload: z.object({
      type: z.literal('message'),
      userId: z.string(),
      username: z.string(),
      content: z.string().min(1).max(500),
      timestamp: z.number(),
    }),
    description: 'Send a chat message',
    summary: 'Chat message',
  },
  receive: {
    payload: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('message'),
        messageId: z.string(),
        userId: z.string(),
        username: z.string(),
        content: z.string(),
        timestamp: z.number(),
      }),
      z.object({
        type: z.literal('user_joined'),
        userId: z.string(),
        username: z.string(),
      }),
      z.object({
        type: z.literal('user_left'),
        userId: z.string(),
        username: z.string(),
      }),
    ]),
    description: 'Receive chat events',
    summary: 'Chat events',
  },
  tags: ['chat', 'real-time'],
})

wsAPI.channel('chatRoom', chatRoomChannel, (ws, message, ctx) => {
  console.log(`Message in room ${ctx.params.roomId}:`, message)

  // Broadcast to all users in the room
  ws.send({
    type: 'message',
    messageId: Math.random().toString(36).substring(7),
    userId: message.userId,
    username: message.username,
    content: message.content,
    timestamp: Date.now(),
  })
})

// User presence channel
const presenceChannel = createChannel({
  path: '/ws/presence/:userId',
  description: 'Track and receive user presence updates',
  send: {
    payload: z.object({
      status: z.enum(['online', 'away', 'offline']),
      message: z.string().optional(),
    }),
    description: 'Update your presence status',
  },
  receive: {
    payload: z.object({
      users: z.array(
        z.object({
          userId: z.string(),
          username: z.string(),
          status: z.enum(['online', 'away', 'offline']),
          lastSeen: z.number(),
        })
      ),
    }),
    description: 'Receive presence updates for all users',
  },
  tags: ['presence', 'real-time'],
})

wsAPI.channel('presence', presenceChannel, (ws, message, ctx) => {
  console.log(`Presence update for user ${ctx.params.userId}:`, message)

  // Send updated presence list
  ws.send({
    users: [
      {
        userId: ctx.params.userId,
        username: 'User',
        status: message.status,
        lastSeen: Date.now(),
      },
    ],
  })
})

// Notifications channel
const notificationsChannel = createChannel({
  path: '/ws/notifications/:userId',
  description: 'Receive real-time notifications',
  send: {
    payload: z.object({
      type: z.enum(['info', 'success', 'warning', 'error']),
      title: z.string(),
      message: z.string(),
      data: z.any().optional(),
    }),
    description: 'Send a notification',
  },
  tags: ['notifications'],
})

wsAPI.channel('notifications', notificationsChannel, (ws, message, ctx) => {
  console.log(`Notification for user ${ctx.params.userId}:`, message)
})

// Live data stream channel
const dataStreamChannel = createChannel({
  path: '/ws/stream/:dataType',
  description: 'Stream real-time data updates',
  receive: {
    payload: z.object({
      dataType: z.string(),
      timestamp: z.number(),
      value: z.number(),
      metadata: z.record(z.any()).optional(),
    }),
    description: 'Receive data stream updates',
  },
  tags: ['streaming', 'data'],
})

wsAPI.channel('dataStream', dataStreamChannel, (ws, message, ctx) => {
  console.log(`Data stream ${ctx.params.dataType}:`, message)
})

// ===== Merge REST and WebSocket APIs =====

const app = mergeAPIDocs(restAPI, wsAPI)

// Serve API documentation
app.doc('/api/openapi.json') // OpenAPI spec for REST endpoints
app.asyncapiDoc('/api/asyncapi.json') // AsyncAPI spec for WebSocket channels

// Serve a homepage with links to documentation
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Unified API - REST + WebSocket</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
          }
          .container {
            max-width: 1200px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            color: white;
            margin-bottom: 3rem;
          }
          .header h1 {
            font-size: 3rem;
            margin-bottom: 0.5rem;
          }
          .header p {
            font-size: 1.2rem;
            opacity: 0.9;
          }
          .cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
            margin-bottom: 2rem;
          }
          .card {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          }
          .card h2 {
            color: #667eea;
            margin-bottom: 1rem;
            font-size: 1.5rem;
          }
          .card p {
            color: #666;
            margin-bottom: 1.5rem;
            line-height: 1.6;
          }
          .card ul {
            list-style: none;
            margin-bottom: 1.5rem;
          }
          .card li {
            padding: 0.5rem 0;
            color: #555;
            border-bottom: 1px solid #eee;
          }
          .card li:last-child {
            border-bottom: none;
          }
          .btn {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s, background 0.2s;
          }
          .btn:hover {
            background: #5568d3;
            transform: translateY(-2px);
          }
          .endpoints {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          }
          .endpoints h2 {
            color: #667eea;
            margin-bottom: 1.5rem;
          }
          .endpoint-group {
            margin-bottom: 2rem;
          }
          .endpoint-group h3 {
            color: #764ba2;
            margin-bottom: 1rem;
            font-size: 1.2rem;
          }
          .endpoint {
            display: flex;
            align-items: center;
            padding: 0.75rem;
            background: #f8f9fa;
            border-radius: 6px;
            margin-bottom: 0.5rem;
          }
          .method {
            font-weight: 700;
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            margin-right: 1rem;
            font-size: 0.85rem;
          }
          .method.get { background: #10b981; color: white; }
          .method.post { background: #3b82f6; color: white; }
          .method.ws { background: #f59e0b; color: white; }
          .path {
            font-family: monospace;
            color: #555;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Unified API</h1>
            <p>REST endpoints + WebSocket channels with complete documentation</p>
          </div>

          <div class="cards">
            <div class="card">
              <h2>📖 OpenAPI Documentation</h2>
              <p>REST API endpoints with full OpenAPI 3.0 specification</p>
              <ul>
                <li>User management</li>
                <li>Message retrieval</li>
                <li>Standard HTTP methods</li>
              </ul>
              <a href="/api/openapi.json" class="btn">View OpenAPI Spec</a>
            </div>

            <div class="card">
              <h2>⚡ AsyncAPI Documentation</h2>
              <p>WebSocket channels with AsyncAPI 3.0 specification</p>
              <ul>
                <li>Real-time chat</li>
                <li>User presence</li>
                <li>Notifications</li>
                <li>Data streaming</li>
              </ul>
              <a href="/api/asyncapi.json" class="btn">View AsyncAPI Spec</a>
            </div>
          </div>

          <div class="endpoints">
            <h2>Available Endpoints</h2>

            <div class="endpoint-group">
              <h3>REST API (HTTP)</h3>
              <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/users</span>
              </div>
              <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/users</span>
              </div>
              <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/rooms/:roomId/messages</span>
              </div>
            </div>

            <div class="endpoint-group">
              <h3>WebSocket Channels</h3>
              <div class="endpoint">
                <span class="method ws">WS</span>
                <span class="path">/ws/rooms/:roomId</span>
              </div>
              <div class="endpoint">
                <span class="method ws">WS</span>
                <span class="path">/ws/presence/:userId</span>
              </div>
              <div class="endpoint">
                <span class="method ws">WS</span>
                <span class="path">/ws/notifications/:userId</span>
              </div>
              <div class="endpoint">
                <span class="method ws">WS</span>
                <span class="path">/ws/stream/:dataType</span>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `)
})

export default app

// If running directly
if (import.meta.main) {
  console.log('🚀 Starting unified API server...')
  console.log('📖 OpenAPI docs: http://localhost:3000/api/openapi.json')
  console.log('⚡ AsyncAPI docs: http://localhost:3000/api/asyncapi.json')
  console.log('🏠 Homepage: http://localhost:3000/')
}
