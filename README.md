# @hono/zod-asyncapi

A Hono package for generating AsyncAPI specifications for WebSocket routes with Zod validation.

## Features

- 🚀 **AsyncAPI 3.0 Support** - Generate AsyncAPI 3.0 compliant specifications
- 🔌 **WebSocket Integration** - Built specifically for WebSocket channels
- ✅ **Zod Validation** - Use Zod schemas for message validation and type safety
- 📝 **Type Safety** - Full TypeScript support with automatic type inference
- 🎯 **Easy to Use** - Simple API similar to `@hono/zod-openapi`
- 📚 **Documentation Generation** - Auto-generate API documentation from your code

## Installation

```bash
npm install @hono/zod-asyncapi hono zod
```

## Quick Start

```typescript
import { AsyncAPIHono, createChannel, z } from '@hono/zod-asyncapi'

// Create an AsyncAPI-enabled Hono app
const app = new AsyncAPIHono({
  info: {
    title: 'Chat API',
    version: '1.0.0',
    description: 'Real-time chat API using WebSockets',
  },
  servers: {
    development: {
      host: 'localhost:3000',
      protocol: 'ws',
      description: 'Development server',
    },
  },
})

// Define a channel with Zod schemas
const chatChannel = createChannel({
  path: '/chat/:roomId',
  description: 'Real-time chat room',
  send: {
    payload: z.object({
      message: z.string(),
      userId: z.string(),
      timestamp: z.number(),
    }),
    description: 'Send a chat message to the room',
  },
  receive: {
    payload: z.object({
      message: z.string(),
      userId: z.string(),
      timestamp: z.number(),
    }),
    description: 'Receive chat messages from the room',
  },
  tags: ['chat'],
})

// Register the channel with a handler
app.channel('chatRoom', chatChannel, (ws, message, ctx) => {
  console.log(`Message in room ${ctx.params.roomId}:`, message)

  // Send a response
  ws.send({
    message: `Echo: ${message.message}`,
    userId: 'system',
    timestamp: Date.now(),
  })
})

// Serve the AsyncAPI documentation
app.doc('/asyncapi.json')

export default app
```

## API Reference

### AsyncAPIHono

The main class that extends Hono with AsyncAPI support.

```typescript
const app = new AsyncAPIHono({
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'API description',
  },
  servers: {
    production: {
      host: 'api.example.com',
      protocol: 'wss',
      description: 'Production server',
    },
  },
})
```

#### Methods

- **`channel(id, config, handler?)`** - Register a WebSocket channel
- **`doc(path, options?)`** - Serve AsyncAPI document as JSON
- **`docYAML(path, options?)`** - Serve AsyncAPI document as YAML
- **`getAsyncAPIDocument(options?)`** - Get the AsyncAPI document object
- **`route(path, app)`** - Merge routes from another AsyncAPIHono instance
- **`basePath(path)`** - Create a new instance with a base path

### createChannel

Factory function for creating type-safe channel configurations.

```typescript
const channel = createChannel({
  path: '/events/:eventId',
  description: 'Event stream',
  send: {
    payload: z.object({ type: z.string(), data: z.any() }),
    description: 'Send event data',
  },
  receive: {
    payload: z.object({ type: z.string(), data: z.any() }),
    description: 'Receive event updates',
  },
  parameters: {
    eventId: z.string().uuid(),
  },
  tags: ['events'],
})
```

### Channel Handler

Type-safe handler for WebSocket messages:

```typescript
type ChannelHandler = (
  ws: WebSocketData,
  message: InferredMessagePayload,
  context: ChannelContext
) => void | Promise<void>
```

#### WebSocketData

- **`send(data)`** - Send a message (validated against send schema)
- **`close(code?, reason?)`** - Close the WebSocket connection

#### ChannelContext

- **`params`** - Path parameters (typed based on channel path)
- **`headers`** - Request headers

## Examples

### Basic WebSocket Channel

```typescript
import { AsyncAPIHono, createChannel, z } from '@hono/zod-asyncapi'

const app = new AsyncAPIHono()

const pingChannel = createChannel({
  path: '/ping',
  description: 'Ping-pong channel',
  receive: {
    payload: z.object({ ping: z.string() }),
  },
  send: {
    payload: z.object({ pong: z.string() }),
  },
})

app.channel('ping', pingChannel, (ws, message) => {
  ws.send({ pong: message.ping })
})
```

### Channel with Path Parameters

```typescript
const userChannel = createChannel({
  path: '/users/:userId/notifications',
  description: 'User-specific notification channel',
  send: {
    payload: z.object({
      type: z.enum(['info', 'warning', 'error']),
      message: z.string(),
    }),
  },
})

app.channel('userNotifications', userChannel, (ws, message, ctx) => {
  console.log(`Notification for user ${ctx.params.userId}`)
  // Handler logic
})
```

### Complex Message Schemas

```typescript
const gameChannel = createChannel({
  path: '/game/:gameId',
  description: 'Real-time game state updates',
  send: {
    payload: z.discriminatedUnion('type', [
      z.object({
        type: z.literal('move'),
        playerId: z.string(),
        position: z.object({ x: z.number(), y: z.number() }),
      }),
      z.object({
        type: z.literal('chat'),
        playerId: z.string(),
        message: z.string(),
      }),
    ]),
  },
  receive: {
    payload: z.object({
      gameState: z.object({
        players: z.array(z.any()),
        status: z.enum(['waiting', 'playing', 'finished']),
      }),
    }),
  },
})
```

### Modular Architecture

```typescript
// channels/chat.ts
export const chatRoutes = new AsyncAPIHono()

chatRoutes.channel('publicChat', publicChatChannel, handler1)
chatRoutes.channel('privateChat', privateChatChannel, handler2)

// channels/notifications.ts
export const notificationRoutes = new AsyncAPIHono()

notificationRoutes.channel('userNotifications', notificationChannel, handler)

// main.ts
const app = new AsyncAPIHono({
  info: {
    title: 'My API',
    version: '1.0.0',
  },
})

app.route('/chat', chatRoutes)
app.route('/notifications', notificationRoutes)
app.doc('/asyncapi.json')
```

### Custom Server Configuration

```typescript
import { createWebSocketServer, createSecureWebSocketServer } from '@hono/zod-asyncapi'

const app = new AsyncAPIHono({
  info: {
    title: 'Multi-Environment API',
    version: '1.0.0',
  },
  servers: {
    development: createWebSocketServer('localhost:3000', 'Development server'),
    staging: createSecureWebSocketServer('staging.api.example.com', 'Staging server'),
    production: createSecureWebSocketServer('api.example.com', 'Production server'),
  },
})
```

## AsyncAPI Specification

This package generates AsyncAPI 3.0 compliant specifications. The generated document includes:

- **Channels** - WebSocket endpoints with their addresses
- **Operations** - Send and receive operations for each channel
- **Messages** - Message schemas with Zod-validated payloads
- **Components** - Reusable schemas and message definitions

### Example Generated Spec

```json
{
  "asyncapi": "3.0.0",
  "info": {
    "title": "Chat API",
    "version": "1.0.0"
  },
  "servers": {
    "development": {
      "host": "localhost:3000",
      "protocol": "ws"
    }
  },
  "channels": {
    "chatRoom": {
      "address": "/chat/{roomId}",
      "messages": {
        "chatRoom_send_message": {
          "$ref": "#/components/messages/chatRoom_send_message"
        }
      }
    }
  },
  "operations": {
    "send_chatRoom_0": {
      "action": "send",
      "channel": {
        "$ref": "#/channels/chatRoom"
      },
      "messages": [
        {
          "$ref": "#/components/messages/chatRoom_send_message"
        }
      ]
    }
  },
  "components": {
    "messages": {
      "chatRoom_send_message": {
        "payload": {
          "$ref": "#/components/schemas/schema_0"
        }
      }
    },
    "schemas": {
      "schema_0": {
        "type": "object",
        "properties": {
          "message": { "type": "string" },
          "userId": { "type": "string" }
        },
        "required": ["message", "userId"]
      }
    }
  }
}
```

## TypeScript Support

Full TypeScript support with automatic type inference:

```typescript
// Types are automatically inferred from Zod schemas
const channel = createChannel({
  path: '/data',
  send: {
    payload: z.object({
      value: z.number(),
      label: z.string(),
    }),
  },
})

app.channel('data', channel, (ws, message, ctx) => {
  // message is typed as { value: number; label: string }
  const num: number = message.value
  const str: string = message.label

  // ws.send() expects the correct type
  ws.send({ value: 42, label: 'Answer' }) // ✓ Valid
  ws.send({ value: '42', label: 'Answer' }) // ✗ Type error
})
```

## Runtime Support

This package is designed to work with any JavaScript runtime that supports Hono. However, actual WebSocket handling depends on the runtime:

- **Bun** - Native WebSocket support
- **Cloudflare Workers** - WebSocket support via Durable Objects
- **Node.js** - Requires WebSocket library (ws, uWebSockets.js, etc.)
- **Deno** - Native WebSocket support

## License

MIT

## Credits

Inspired by [@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi) by the Hono team.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
