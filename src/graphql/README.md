# GraphQL API for Property Management System

This directory contains the GraphQL API implementation for the Property Management System.

## Structure

```
/graphql
├── /context         # GraphQL context creation and types
├── /resolvers       # GraphQL resolvers for each type
├── /scalars         # Custom scalar types (DateTime, JSON)
├── /types           # GraphQL type definitions using code-first approach
├── schema.ts        # Main schema definition
├── typeDefs.ts      # SDL type definitions
```

## Getting Started

The GraphQL API is available at `/graphql` endpoint when the server is running. You can use GraphQL Playground in development mode to explore the API.

## Available Types

- `Room`: Room/unit information
- `Renter`: Renter details
- `Document`: Renter documents/attachments
- `Contract`: Rental agreements
- `Payment`: Payment records

## Schema

The GraphQL schema uses a code-first approach with Apollo Server. Type definitions are available in both SDL format (`typeDefs.ts`) and as code-first types in the `/types` directory.

## Queries and Mutations

Each entity (Room, Renter, Document, etc.) has the following standard queries and mutations:

### Queries

- Get single entity by ID: `room(id: ID!): Room`
- Get list with pagination: `rooms(page: Int, limit: Int, ...): RoomConnection`

### Mutations

- Create: `createRoom(input: CreateRoomInput!): Room`
- Update: `updateRoom(id: ID!, input: UpdateRoomInput!): Room`
- Delete: `deleteRoom(id: ID!): Boolean`

### Pagination

All list queries return a Connection type with pagination information:

```graphql
type RoomConnection {
  nodes: [Room!]!
  pageInfo: PageInfo!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  totalPages: Int!
  totalCount: Int!
  currentPage: Int!
}
```

## Authentication

Authentication is handled through JWT tokens. Pass your auth token in the Authorization header:

```
Authorization: Bearer YOUR_TOKEN_HERE
```

## Development

To add a new entity to the GraphQL API:

1. Create type definition in `/types`
2. Add resolvers in `/resolvers`
3. Update schema in `typeDefs.ts`
4. Add to the resolver index

## Example Queries

### Get a room by ID

```graphql
query {
  room(id: "room-id-here") {
    id
    number
    name
    status
    price
    renters {
      id
      name
    }
  }
}
```

### Get paginated renters

```graphql
query {
  renters(page: 1, limit: 10, sortBy: "name", sortOrder: "asc") {
    nodes {
      id
      name
      email
      phone
      room {
        id
        number
      }
    }
    pageInfo {
      totalCount
      totalPages
      currentPage
      hasNextPage
      hasPreviousPage
    }
  }
}
```