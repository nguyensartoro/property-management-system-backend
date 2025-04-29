import { gql } from 'graphql-tag';

// Define GraphQL schema using SDL (Schema Definition Language)
export const typeDefs = gql`
  # Custom scalars
  scalar DateTime
  scalar JSON

  # Base types
  type Query {
    # Auth queries
    me: User
    
    # Room queries
    room(id: ID!): Room
    rooms(
      page: Int
      limit: Int
      status: String
      sortBy: String
      sortOrder: String
    ): RoomConnection

    # Renter queries
    renter(id: ID!): Renter
    renters(
      page: Int
      limit: Int
      searchText: String
      sortBy: String
      sortOrder: String
    ): RenterConnection

    # Document queries
    document(id: ID!): Document
    documents(
      page: Int
      limit: Int
      renterId: ID
    ): DocumentConnection

    # Other entity queries
    # Add when implementing those features
  }

  type Mutation {
    # Auth mutations
    login(email: String!, password: String!): AuthPayload
    register(input: RegisterInput!): AuthPayload
    refreshToken(refreshToken: String!): TokenPayload
    changePassword(currentPassword: String!, newPassword: String!): Boolean
    
    # Room mutations
    createRoom(input: CreateRoomInput!): Room
    updateRoom(id: ID!, input: UpdateRoomInput!): Room
    deleteRoom(id: ID!): Boolean

    # Renter mutations
    createRenter(input: CreateRenterInput!): Renter
    updateRenter(id: ID!, input: UpdateRenterInput!): Renter
    deleteRenter(id: ID!): Boolean

    # Document mutations
    createDocument(input: CreateDocumentInput!): Document
    updateDocument(id: ID!, input: UpdateDocumentInput!): Document
    deleteDocument(id: ID!): Boolean

    # Other entity mutations
    # Add when implementing those features
  }

  # Auth types
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AuthPayload {
    user: User!
    token: String!
    refreshToken: String!
  }

  type TokenPayload {
    token: String!
    refreshToken: String!
  }

  input RegisterInput {
    name: String!
    email: String!
    password: String!
  }

  # Connection types for pagination
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    totalPages: Int!
    totalCount: Int!
    currentPage: Int!
  }

  type RoomConnection {
    nodes: [Room!]!
    pageInfo: PageInfo!
  }

  type RenterConnection {
    nodes: [Renter!]!
    pageInfo: PageInfo!
  }

  type DocumentConnection {
    nodes: [Document!]!
    pageInfo: PageInfo!
  }

  # Room type and inputs
  type Room {
    id: ID!
    number: String!
    name: String
    description: String
    floor: String
    status: String!
    price: Float!
    size: Float
    type: String
    facilities: [String]
    images: [String]
    createdAt: DateTime!
    updatedAt: DateTime!
    renters: [Renter]
    contracts: [Contract]
  }

  input CreateRoomInput {
    number: String!
    name: String
    description: String
    floor: String
    status: String!
    price: Float!
    size: Float
    type: String
    facilities: [String]
    images: [String]
  }

  input UpdateRoomInput {
    number: String
    name: String
    description: String
    floor: String
    status: String
    price: Float
    size: Float
    type: String
    facilities: [String]
    images: [String]
  }

  # Renter type and inputs
  type Renter {
    id: ID!
    name: String!
    email: String
    phone: String!
    emergencyContact: String
    identityNumber: String
    roomId: ID
    createdAt: DateTime!
    updatedAt: DateTime!
    room: Room
    documents: [Document]
    contracts: [Contract]
    payments: [Payment]
  }

  input CreateRenterInput {
    name: String!
    email: String
    phone: String!
    emergencyContact: String
    identityNumber: String
    roomId: ID
  }

  input UpdateRenterInput {
    name: String
    email: String
    phone: String
    emergencyContact: String
    identityNumber: String
    roomId: ID
  }

  # Document type and inputs
  type Document {
    id: ID!
    name: String!
    type: String!
    fileUrl: String!
    description: String
    renterId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    renter: Renter
  }

  input CreateDocumentInput {
    name: String!
    type: String!
    fileUrl: String!
    description: String
    renterId: ID!
  }

  input UpdateDocumentInput {
    name: String
    type: String
    fileUrl: String
    description: String
  }

  # Contract type (placeholder)
  type Contract {
    id: ID!
    renterId: ID!
    roomId: ID!
    startDate: DateTime!
    endDate: DateTime!
    contractType: String!
    amount: Float!
    status: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # Payment type (placeholder)
  type Payment {
    id: ID!
    renterId: ID!
    contractId: ID
    amount: Float!
    status: String!
    paymentDate: DateTime!
    dueDate: DateTime!
    method: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }
`;