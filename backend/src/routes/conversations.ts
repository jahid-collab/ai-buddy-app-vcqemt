import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

interface ConversationResponse {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: string;
}

interface MessageResponse {
  id: string;
  role: string;
  content: string;
  createdAt: Date;
}

interface DeleteResponse {
  success: boolean;
}

export function register(app: App, fastify: FastifyInstance) {
  // GET /api/conversations - Returns array of conversations
  fastify.get<{ Reply: ConversationResponse[] }>(
    '/api/conversations',
    {
      schema: {
        description: 'Get all conversations',
        tags: ['conversations'],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
                lastMessage: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async () => {
      const conversations = await app.db
        .select()
        .from(schema.conversations)
        .orderBy(desc(schema.conversations.updatedAt));

      // Get last message for each conversation
      const results = await Promise.all(
        conversations.map(async (conv) => {
          const lastMessage = await app.db
            .select()
            .from(schema.messages)
            .where(eq(schema.messages.conversationId, conv.id))
            .orderBy(desc(schema.messages.createdAt))
            .limit(1);

          return {
            id: conv.id,
            title: conv.title,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt,
            lastMessage: lastMessage[0]?.content,
          };
        })
      );

      return results;
    }
  );

  // GET /api/conversations/:id/messages - Returns messages for a conversation
  fastify.get<{ Params: { id: string }; Reply: MessageResponse[] }>(
    '/api/conversations/:id/messages',
    {
      schema: {
        description: 'Get messages for a conversation',
        tags: ['conversations'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                role: { type: 'string' },
                content: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      const { id } = request.params;

      const messages = await app.db
        .select({
          id: schema.messages.id,
          role: schema.messages.role,
          content: schema.messages.content,
          createdAt: schema.messages.createdAt,
        })
        .from(schema.messages)
        .where(eq(schema.messages.conversationId, id))
        .orderBy(schema.messages.createdAt);

      return messages;
    }
  );

  // DELETE /api/conversations/:id - Deletes a conversation and all its messages
  fastify.delete<{ Params: { id: string }; Reply: DeleteResponse }>(
    '/api/conversations/:id',
    {
      schema: {
        description: 'Delete a conversation and all its messages',
        tags: ['conversations'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>) => {
      const { id } = request.params;

      // Messages will be deleted automatically due to cascade delete
      await app.db
        .delete(schema.conversations)
        .where(eq(schema.conversations.id, id));

      return { success: true };
    }
  );
}
