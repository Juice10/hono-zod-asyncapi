/**
 * Example: Basic WebSocket Channel
 *
 * The simplest possible example of using @hono/zod-asyncapi
 */

import { AsyncAPIHono, createChannel, z } from '../src/index'

// Create app
const app = new AsyncAPIHono({
  info: {
    title: 'Basic WebSocket API',
    version: '1.0.0',
  },
})

// Define a simple ping-pong channel
const pingChannel = createChannel({
  path: '/ping',
  description: 'Simple ping-pong WebSocket channel',
  receive: {
    payload: z.object({
      ping: z.string(),
    }),
    description: 'Send a ping message',
  },
  send: {
    payload: z.object({
      pong: z.string(),
      timestamp: z.number(),
    }),
    description: 'Receive a pong response',
  },
})

// Register the channel
app.channel('ping', pingChannel, (ws, message) => {
  console.log('Received ping:', message.ping)

  // Send pong response
  ws.send({
    pong: message.ping,
    timestamp: Date.now(),
  })
})

// Serve documentation
app.doc('/asyncapi.json')

// Root route
app.get('/', (c) => {
  return c.json({
    message: 'Basic WebSocket API',
    docs: '/asyncapi.json',
  })
})

export default app
