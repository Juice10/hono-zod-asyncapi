/**
 * Example: Real-time Chat Application with AsyncAPI
 *
 * This example demonstrates how to use @hono/zod-asyncapi to create
 * a WebSocket-based chat application with automatic AsyncAPI documentation.
 */

import { AsyncAPIHono, createChannel, z } from '../src/index'

// Create the AsyncAPI-enabled Hono app
const app = new AsyncAPIHono({
  info: {
    title: 'Chat Application API',
    version: '1.0.0',
    description: 'A real-time chat application using WebSockets with AsyncAPI documentation',
    contact: {
      name: 'API Support',
      email: 'support@example.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: {
    development: {
      host: 'localhost:3000',
      protocol: 'ws',
      description: 'Local development server',
    },
    production: {
      host: 'chat.example.com',
      protocol: 'wss',
      description: 'Production server with TLS',
    },
  },
})

// Define message schemas
const ChatMessageSchema = z.object({
  message: z.string().min(1).max(500),
  userId: z.string().uuid(),
  username: z.string().min(1).max(50),
  timestamp: z.number(),
})

const ChatEventSchema = z.object({
  type: z.enum(['join', 'leave', 'message']),
  userId: z.string().uuid(),
  username: z.string(),
  message: z.string().optional(),
  timestamp: z.number(),
})

// Define the chat room channel
const chatRoomChannel = createChannel({
  path: '/chat/:roomId',
  description: 'Real-time chat room where users can send and receive messages',
  send: {
    payload: ChatMessageSchema,
    description: 'Send a chat message to the room',
    summary: 'Send message',
    name: 'ChatMessage',
  },
  receive: {
    payload: ChatEventSchema,
    description: 'Receive chat events (messages, joins, leaves)',
    summary: 'Receive events',
    name: 'ChatEvent',
  },
  tags: ['chat', 'messaging'],
})

// In-memory storage for demonstration (use a real database in production)
const rooms = new Map<string, Set<{ userId: string; username: string }>>()

// Register the chat room channel
app.channel('chatRoom', chatRoomChannel, (ws, message, ctx) => {
  const roomId = ctx.params.roomId
  console.log(`Message in room ${roomId}:`, message)

  // Get or create room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set())
  }

  const room = rooms.get(roomId)!

  // Add user to room
  room.add({ userId: message.userId, username: message.username })

  // Broadcast message to all users in the room
  // In a real application, you would iterate over all connected WebSockets
  ws.send({
    type: 'message',
    userId: message.userId,
    username: message.username,
    message: message.message,
    timestamp: Date.now(),
  })
})

// Define a private messaging channel
const privateMessageChannel = createChannel({
  path: '/messages/:userId',
  description: 'Private direct messages between users',
  send: {
    payload: z.object({
      to: z.string().uuid(),
      from: z.string().uuid(),
      message: z.string().min(1).max(1000),
      timestamp: z.number(),
    }),
    description: 'Send a private message',
  },
  receive: {
    payload: z.object({
      from: z.string().uuid(),
      fromUsername: z.string(),
      message: z.string(),
      timestamp: z.number(),
    }),
    description: 'Receive private messages',
  },
  tags: ['messaging', 'private'],
})

app.channel('privateMessage', privateMessageChannel, (ws, message, ctx) => {
  const userId = ctx.params.userId
  console.log(`Private message for ${userId}:`, message)

  // In a real app, deliver the message to the recipient
  ws.send({
    from: message.from,
    fromUsername: 'User', // Look up from database
    message: message.message,
    timestamp: Date.now(),
  })
})

// Define a notification channel
const notificationChannel = createChannel({
  path: '/notifications/:userId',
  description: 'Real-time notifications for users',
  send: {
    payload: z.object({
      type: z.enum(['info', 'warning', 'error', 'success']),
      title: z.string(),
      message: z.string(),
      data: z.any().optional(),
    }),
    description: 'Send a notification to the user',
  },
  tags: ['notifications'],
})

app.channel('notifications', notificationChannel, (ws, message, ctx) => {
  const userId = ctx.params.userId
  console.log(`Notification for ${userId}:`, message)

  // Process notification
})

// Define a presence channel
const presenceChannel = createChannel({
  path: '/presence/:roomId',
  description: 'Track user presence in a room',
  send: {
    payload: z.object({
      status: z.enum(['online', 'away', 'offline']),
      userId: z.string().uuid(),
    }),
    description: 'Update user presence status',
  },
  receive: {
    payload: z.object({
      users: z.array(
        z.object({
          userId: z.string().uuid(),
          username: z.string(),
          status: z.enum(['online', 'away', 'offline']),
        })
      ),
    }),
    description: 'Receive list of users and their presence status',
  },
  tags: ['presence'],
})

app.channel('presence', presenceChannel, (ws, message, ctx) => {
  const roomId = ctx.params.roomId
  console.log(`Presence update in room ${roomId}:`, message)

  // Update presence and broadcast to room
  ws.send({
    users: [
      {
        userId: message.userId,
        username: 'User',
        status: message.status,
      },
    ],
  })
})

// Serve AsyncAPI documentation
app.doc('/asyncapi.json')
app.docYAML('/asyncapi.yaml')

// Add a simple HTML page to view the documentation
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Chat Application - AsyncAPI</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #f5f5f5;
          }
          h1 { color: #333; }
          .card {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 1rem;
          }
          a {
            color: #0066cc;
            text-decoration: none;
          }
          a:hover { text-decoration: underline; }
          pre {
            background: #f0f0f0;
            padding: 1rem;
            border-radius: 4px;
            overflow-x: auto;
          }
          .channels {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1rem;
          }
          .channel {
            background: #f9f9f9;
            padding: 1rem;
            border-radius: 4px;
            border-left: 4px solid #0066cc;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🚀 Chat Application API</h1>
          <p>Real-time chat with WebSocket support and AsyncAPI documentation</p>
        </div>

        <div class="card">
          <h2>📚 Documentation</h2>
          <ul>
            <li><a href="/asyncapi.json" target="_blank">AsyncAPI Specification (JSON)</a></li>
            <li><a href="/asyncapi.yaml" target="_blank">AsyncAPI Specification (YAML)</a></li>
          </ul>
        </div>

        <div class="card">
          <h2>🔌 Available Channels</h2>
          <div class="channels">
            <div class="channel">
              <h3>/chat/:roomId</h3>
              <p>Real-time chat rooms</p>
            </div>
            <div class="channel">
              <h3>/messages/:userId</h3>
              <p>Private direct messages</p>
            </div>
            <div class="channel">
              <h3>/notifications/:userId</h3>
              <p>User notifications</p>
            </div>
            <div class="channel">
              <h3>/presence/:roomId</h3>
              <p>User presence tracking</p>
            </div>
          </div>
        </div>

        <div class="card">
          <h2>📝 Example Usage</h2>
          <pre>const ws = new WebSocket('ws://localhost:3000/chat/room-123')

ws.onopen = () => {
  ws.send(JSON.stringify({
    message: 'Hello, World!',
    userId: '123e4567-e89b-12d3-a456-426614174000',
    username: 'Alice',
    timestamp: Date.now()
  }))
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Received:', data)
}</pre>
        </div>
      </body>
    </html>
  `)
})

// Export the app
export default app

// If running directly, start the server
if (import.meta.main) {
  const port = 3000
  console.log(`🚀 Server starting on http://localhost:${port}`)
  console.log(`📚 AsyncAPI docs at http://localhost:${port}/asyncapi.json`)
}
