import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { eq } from 'drizzle-orm';
import { gateway } from '@specific-dev/framework';
import { streamText } from 'ai';
import * as schema from '../db/schema.js';
import type { App } from '../index.js';

interface ChatBody {
  message: string;
  conversationId?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function register(app: App, fastify: FastifyInstance) {
  fastify.post<{ Body: ChatBody }>(
    '/api/chat/stream',
    {
      schema: {
        description: 'Stream chat response from AI buddy',
        tags: ['chat'],
        body: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            conversationId: { type: 'string' },
          },
          required: ['message'],
        },
      },
    },
    async (request: FastifyRequest<{ Body: ChatBody }>, reply: FastifyReply) => {
      const { message, conversationId } = request.body;

      let convId = conversationId;

      // Load conversation history if provided, otherwise create new conversation
      let conversationMessages: ChatMessage[] = [];

      if (convId) {
        // Load existing conversation
        const existingMessages = await app.db
          .select()
          .from(schema.messages)
          .where(eq(schema.messages.conversationId, convId));

        conversationMessages = existingMessages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));
      } else {
        // Create new conversation
        const newConversation = await app.db
          .insert(schema.conversations)
          .values({
            title: message.substring(0, 100), // Use first 100 chars of message as title
          })
          .returning();

        convId = newConversation[0].id;
      }

      // Add user message to history
      conversationMessages.push({
        role: 'user',
        content: message,
      });

      // Store user message in database
      await app.db.insert(schema.messages).values({
        conversationId: convId,
        role: 'user',
        content: message,
      });

      // Stream response from AI
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      });

      let assistantResponse = '';

      try {
        const result = streamText({
          model: gateway('openai/gpt-5.2'),
          system:
            'You are a friendly and supportive buddy. Be conversational, empathetic, and helpful. Keep responses natural and engaging.',
          messages: conversationMessages,
        });

        for await (const textPart of result.textStream) {
          assistantResponse += textPart;
          reply.raw.write(
            `data: ${JSON.stringify({ chunk: textPart, conversationId: convId })}\n\n`
          );
        }

        // Store assistant response in database
        await app.db.insert(schema.messages).values({
          conversationId: convId,
          role: 'assistant',
          content: assistantResponse,
        });

        // Update conversation updatedAt timestamp
        await app.db
          .update(schema.conversations)
          .set({ updatedAt: new Date() })
          .where(eq(schema.conversations.id, convId));

        // Send final message
        reply.raw.write(
          `data: ${JSON.stringify({ done: true, conversationId: convId })}\n\n`
        );
      } catch (error) {
        app.logger.error(error, 'Failed to stream chat response');
        reply.raw.write(
          `data: ${JSON.stringify({ error: 'Failed to generate response', conversationId: convId })}\n\n`
        );
      }

      reply.raw.end();
    }
  );
}
