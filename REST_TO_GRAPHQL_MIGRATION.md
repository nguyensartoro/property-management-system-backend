# Migrating from REST to GraphQL API

## Overview

We've transitioned our Property Management System from a dual REST/GraphQL API to a GraphQL-only architecture. This document explains the changes, benefits, and how to interact with the new API.

## Why GraphQL Only?

1. **Consistent Interface**: A single endpoint (`/graphql`) for all operations
2. **Precise Data Fetching**: Clients can request exactly what they need, reducing over/under-fetching
3. **Strongly Typed Schema**: Self-documenting API with built-in type validation
4. **Reduced Endpoints**: No need to maintain multiple REST endpoints for different resources
5. **Better Developer Experience**: Introspection, tooling, and powerful clients

## Changes to Codebase

As part of this migration, we've removed the following components from our codebase:

* **Removed `app.ts`**: The server is now initialized directly in `server.ts`
* **Removed REST-specific directories**:
  * `/routes`: All Express route definitions
  * `/controllers`: REST endpoint handlers
  * `/schemas`: Zod validation schemas for REST requests
  * `/models`: Model-specific code for REST API
  * `/validators`: Request validators for REST endpoints
* **Removed middleware**:
  * `validate.ts`: REST request validation middleware
  * `auth.middleware.ts`: Express-specific authentication middleware
  * `permission.middleware.ts`: Express-specific permission middleware

The authentication and authorization logic previously in the REST middleware is now handled in the GraphQL context and resolvers.

## API Endpoint

All requests now go to a single endpoint:

```
POST /graphql
```

## Authentication

Authentication still works via JWT tokens:

1. Include your JWT in the Authorization header:
   ```
   Authorization: Bearer your_jwt_token
   ```
2. All authenticated operations will be processed through the GraphQL context

## Common Operations

### User Registration

**Before (REST):**
```javascript
// Client-side code
const response = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'SecurePassword123'
  })
});
```

**After (GraphQL):**
```javascript
// Client-side code
const response = await fetch('/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      mutation Register($input: RegisterInput!) {
        register(input: $input) {
          user {
            id
            name
            email
          }
          token
          refreshToken
        }
      }
    `,
    variables: {
      input: {
        name: "John Doe",
        email: "john@example.com",
        password: "SecurePassword123"
      }
    }
  })
});
```

### User Login

**Before (REST):**
```javascript
// Client-side code
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'SecurePassword123'
  })
});
```

**After (GraphQL):**
```javascript
// Client-side code
const response = await fetch('/graphql', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: `
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          user {
            id
            name
            email
          }
          token
          refreshToken
        }
      }
    `,
    variables: {
      email: "john@example.com",
      password: "SecurePassword123"
    }
  })
});
```

### Fetching Data (Rooms Example)

**Before (REST):**
```javascript
// Client-side code
const response = await fetch('/api/v1/rooms?status=Available&page=1&limit=10', {
  method: 'GET',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});
```

**After (GraphQL):**
```javascript
// Client-side code
const response = await fetch('/graphql', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    query: `
      query GetRooms($page: Int, $limit: Int, $status: String) {
        rooms(page: $page, limit: $limit, status: $status) {
          nodes {
            id
            number
            name
            status
            price
            # Only request what you need
          }
          pageInfo {
            totalCount
            totalPages
            currentPage
            hasNextPage
          }
        }
      }
    `,
    variables: {
      page: 1,
      limit: 10,
      status: "Available"
    }
  })
});
```

### Creating Data (Room Example)

**Before (REST):**
```javascript
// Client-side code
const response = await fetch('/api/v1/rooms', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    number: "101",
    name: "Deluxe Suite",
    status: "Available",
    price: 1200,
    floor: "1st",
    type: "Deluxe"
  })
});
```

**After (GraphQL):**
```javascript
// Client-side code
const response = await fetch('/graphql', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    query: `
      mutation CreateRoom($input: CreateRoomInput!) {
        createRoom(input: $input) {
          id
          number
          name
          status
          price
        }
      }
    `,
    variables: {
      input: {
        number: "101",
        name: "Deluxe Suite",
        status: "Available",
        price: 1200,
        floor: "1st",
        type: "Deluxe"
      }
    }
  })
});
```

## Using GraphQL Clients

For frontend applications, we recommend using a GraphQL client like Apollo Client or URQL:

### Apollo Client Setup Example

```javascript
import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Create HTTP link
const httpLink = createHttpLink({
  uri: 'http://yourserver.com/graphql',
});

// Auth link for setting the token
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

// Create Apollo Client
const client = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache()
});

// Then use it in your app
```

## Exploring the API

You can explore our GraphQL API using GraphQL Playground at:

```
http://localhost:5001/graphql
```

This interactive UI allows you to:
- Browse the schema documentation
- Test queries and mutations
- View return types and available fields

## Benefits of the Migration

1. **More Efficient Data Retrieval**: Only fetch the data you need
2. **Fewer HTTP Requests**: Combine multiple resource requests into one query
3. **Type Safety**: Schema validation at API level
4. **Easier API Evolution**: Add fields without breaking existing clients
5. **Better Developer Experience**: Self-documenting API with in-browser exploration

## Questions?

Contact the backend team for any questions or support with transitioning your applications to use GraphQL. 