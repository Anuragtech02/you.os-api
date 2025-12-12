import cors from '@fastify/cors'
import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { env } from '@/config/env'

async function corsPlugin(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin:
      env.NODE_ENV === 'production'
        ? [
            // Add your production domains here
            /\.youos\.app$/,
            /\.vercel\.app$/,
          ]
        : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400, // 24 hours
  })
}

export default fp(corsPlugin, {
  name: 'cors',
})
