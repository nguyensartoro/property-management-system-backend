import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { ApolloServerPluginLandingPageLocalDefault, ApolloServerPluginLandingPageProductionDefault } from '@apollo/server/plugin/landingPage/default';
import http from 'http';
import { graphqlSchema } from './graphql/schema';
import { createContext, GraphQLContext } from './graphql/context';
// Use require for non-TypeScript modules
const depthLimit = require('graphql-depth-limit');

// Load environment variables
dotenv.config();

// Log all environment variables for debugging
console.log('Environment variables:', {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV
});

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize Express app
const app = express();
const httpServer = http.createServer(app);
const port = process.env.PORT || 5001;

// Apply basic middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Root route
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to Property Management System GraphQL API',
    graphql: '/graphql',
    version: '1.0.0',
  });
});

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Start the Apollo Server with Express
async function startApolloServer() {
  // Create Apollo Server
  const server = new ApolloServer<GraphQLContext>({
    schema: graphqlSchema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      // Install a landing page plugin based on NODE_ENV
      process.env.NODE_ENV === 'production'
        ? ApolloServerPluginLandingPageProductionDefault({
            graphRef: 'property-management-system-api',
            footer: false,
          })
        : ApolloServerPluginLandingPageLocalDefault({ footer: false })
    ],
    introspection: true
  });

  // Start the Apollo Server
  await server.start();
  console.log('Apollo Server started successfully');

  // Apply middleware AFTER Apollo Server is started
  app.use(
    '/graphql',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => createContext({ req })
    })
  );

  // Route handlers must be defined BEFORE the 404 handler

  // 404 handler for non-matched routes
  app.use((req: Request, res: Response) => {
    console.log(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({
      status: 'error',
      message: `Cannot ${req.method} ${req.url}`,
    });
  });

  // Global error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
  });

  // Start the server
  await new Promise<void>((resolve) => httpServer.listen({ port }, resolve));
  console.log(`Server running at http://localhost:${port}`);
  console.log(`GraphQL endpoint and playground ready at http://localhost:${port}/graphql`);
}

// Start the server
startApolloServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err);

  // Close server & exit process
  httpServer.close(() => {
    process.exit(1);
  });
});

// Graceful shutdown for SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  httpServer.close(() => {
    console.log('💥 Process terminated!');
  });
});

export default app;