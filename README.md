# Property Management System - Backend API

This is the backend API for the Property Management System, built with Node.js, Express, TypeScript, and Prisma with PostgreSQL.

## Features

- Complete GraphQL API for a property management system
- User authentication with JWT
- CRUD operations for rooms, renters, contracts, payments, and more
- Subscription plan management
- File uploads for documents and images
- Email notifications
- Advanced filtering, sorting, and pagination

## Tech Stack

- **Node.js & Express**: For API development
- **TypeScript**: For type safety
- **Prisma**: ORM for database operations
- **PostgreSQL**: Primary database
- **JWT**: For authentication
- **GraphQL**: For data querying
- **Apollo Server**: GraphQL server implementation
- **Zod**: For validation
- **Multer**: For file uploads
- **Nodemailer**: For email functionality
- **Winston**: For logging
- **Jest & Supertest**: For testing

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd property-management-system/backend
   ```

2. Install dependencies:
   ```bash
   # Install core dependencies
   npm install

   # Install GraphQL dependencies if needed
   npm install graphql apollo-server-express @graphql-tools/schema graphql-depth-limit

   # Install TypeScript type definitions if needed
   npm install --save-dev @types/graphql @types/node
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   # Environment variables
   NODE_ENV=development
   PORT=5001

   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/property_management_system"

   # JWT
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRES_IN=1d
   JWT_REFRESH_SECRET=your_refresh_token_secret_here
   JWT_REFRESH_EXPIRES_IN=7d

   # File Storage
   UPLOAD_DIR=uploads
   MAX_FILE_SIZE=5242880

   # Email Configuration
   EMAIL_HOST=smtp.example.com
   EMAIL_PORT=587
   EMAIL_USER=user@example.com
   EMAIL_PASS=your_email_password
   EMAIL_FROM=noreply@propertymanagementsystem.com

   # Logging
   LOG_LEVEL=info
   ```

4. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

5. Seed the database with initial data:
   ```bash
   npm run seed
   ```

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## API Documentation

When the server is running, you can access the GraphQL Playground at:
```
http://localhost:5000/playground
```

## GraphQL API

The GraphQL API is available at the `/graphql` endpoint and provides a flexible way to query and mutate data.

With GraphQL, you can:
- Query multiple related resources in a single request
- Get precisely the fields you need for each resource
- Reduce over-fetching and under-fetching of data
- Explore the API using GraphQL Playground in development

### Main GraphQL Types

- **Room**: Property rooms/units
- **Renter**: Tenants who rent rooms
- **Document**: Files and documents related to renters
- **Contract**: Rental agreements
- **Payment**: Payment records
- **Service**: Services offered for rooms
- **Expense**: Property expenses
- **MaintenanceEvent**: Maintenance records

### Example GraphQL Queries

```graphql
# Get a renter with their room and documents
query GetRenterWithDetails {
  renter(id: "renter-id") {
    id
    name
    email
    phone
    room {
      id
      number
      status
    }
    documents {
      id
      name
      type
      fileUrl
    }
  }
}

# Get a list of rooms with pagination
query GetRoomsWithPagination {
  rooms(page: 1, limit: 10, status: "Available", sortBy: "price") {
    nodes {
      id
      number
      name
      status
      price
    }
    pageInfo {
      totalCount
      currentPage
      totalPages
    }
  }
}
```

### Example GraphQL Mutations

```graphql
# Create a new document
mutation CreateDocument {
  createDocument(input: {
    name: "Rental Agreement",
    type: "CONTRACT",
    fileUrl: "/uploads/documents/agreement.pdf",
    renterId: "renter-id",
    description: "Signed rental agreement"
  }) {
    id
    name
    type
    createdAt
  }
}

# Update a renter's information
mutation UpdateRenter {
  updateRenter(
    id: "renter-id",
    input: {
      phone: "+1234567890",
      email: "renter@example.com"
    }
  ) {
    id
    name
    phone
    email
    updatedAt
  }
}
```

## Project Structure

```
/backend
│
├── /prisma                 # Prisma schema and migrations
│
├── /src
│   ├── /graphql            # GraphQL API implementation
│   │   ├── /context        # GraphQL context
│   │   ├── /resolvers      # GraphQL resolvers
│   │   ├── /scalars        # Custom GraphQL scalars
│   │   ├── /types          # GraphQL type definitions
│   │   ├── schema.ts       # GraphQL schema
│   │   └── typeDefs.ts     # GraphQL SDL definitions
│   │
│   ├── /config             # Configuration files
│   ├── /constants          # Constants and enums
│   ├── /middlewares        # Express middlewares
│   ├── /services           # Reusable services
│   ├── /types              # TypeScript type definitions
│   ├── /utils              # Utility functions
│   ├── /validators         # Request/response validators
│   │
│   └── server.ts           # Main server file
│
├── /tests                  # Test files
│
├── /scripts                # Utility scripts
│
└── package.json            # Dependencies and scripts
```

## Testing

Run tests with:

```bash
npm test
```

## License

[MIT](LICENSE)