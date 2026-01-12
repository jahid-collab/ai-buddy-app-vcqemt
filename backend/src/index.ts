import { createApplication } from "@specific-dev/framework";
import * as schema from './db/schema.js';
import * as chatRoutes from './routes/chat.js';
import * as conversationsRoutes from './routes/conversations.js';

// Create application with schema for full database type support
export const app = await createApplication(schema);

// Export App type for use in route files
export type App = typeof app;

// Register routes
chatRoutes.register(app, app.fastify);
conversationsRoutes.register(app, app.fastify);

await app.run();
app.logger.info('Application running');
