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
    users: UserRenterList

    # Property queries
    property(id: ID!): Property
    properties(
      page: Int
      limit: Int
      search: String
      userId: ID
      sortBy: String
      sortOrder: String
    ): PropertyConnection

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

    # Contract queries
    contract(id: ID!): Contract
    contracts(
      page: Int
      limit: Int
      roomId: ID
      renterId: ID
      status: String
      sortBy: String
      sortOrder: String
    ): ContractConnection

    # Service queries
    service(id: ID!): Service
    services(
      page: Int
      limit: Int
      active: Boolean
      feeType: String
      sortBy: String
      sortOrder: String
    ): ServiceConnection

    # Payment queries
    payment(id: ID!): Payment
    payments(
      page: Int
      limit: Int
      renterId: ID
      contractId: ID
      status: String
      type: String
      fromDate: String
      toDate: String
      sortBy: String
      sortOrder: String
    ): PaymentConnection

    # Maintenance queries
    maintenanceEvent(id: ID!): MaintenanceEvent
    maintenanceEvents(
      page: Int
      limit: Int
      roomId: ID
      status: String
      priority: String
      fromDate: String
      toDate: String
      sortBy: String
      sortOrder: String
    ): MaintenanceEventConnection
  }

  type Mutation {
    # Auth mutations
    login(email: String!, password: String!): AuthPayload
    register(input: RegisterInput!): AuthPayload
    refreshToken(refreshToken: String!): TokenPayload
    changePassword(currentPassword: String!, newPassword: String!): Boolean

    # Property mutations
    createProperty(input: CreatePropertyInput!): Property
    updateProperty(id: ID!, input: UpdatePropertyInput!): Property
    deleteProperty(id: ID!): Boolean

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

    # Contract mutations
    createContract(input: CreateContractInput!): Contract
    updateContract(id: ID!, input: UpdateContractInput!): Contract
    terminateContract(id: ID!, reason: String!, terminationDate: DateTime): Contract
    deleteContract(id: ID!): Boolean

    # Service mutations
    createService(input: CreateServiceInput!): Service
    updateService(id: ID!, input: UpdateServiceInput!): Service
    deleteService(id: ID!): Boolean

    # Payment mutations
    createPayment(input: CreatePaymentInput!): Payment
    updatePayment(id: ID!, input: UpdatePaymentInput!): Payment
    deletePayment(id: ID!): Boolean
    markPaymentAsPaid(id: ID!, paidDate: DateTime, reference: String): Payment

    # Maintenance mutations
    createMaintenanceEvent(input: CreateMaintenanceEventInput!): MaintenanceEvent
    updateMaintenanceEvent(id: ID!, input: UpdateMaintenanceEventInput!): MaintenanceEvent
    deleteMaintenanceEvent(id: ID!): Boolean
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

  # Types for user query
  type UserRenterList {
    users: [UserWithRole!]!
    renters: [RenterBasic!]!
  }

  type UserWithRole {
    id: ID!
    name: String!
    email: String!
    roles: [String!]!
    type: String!
  }

  type RenterBasic {
    id: ID!
    name: String!
    email: String
    phone: String!
    type: String!
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

  type PropertyConnection {
    nodes: [Property!]!
    pageInfo: PageInfo!
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

  type ContractConnection {
    nodes: [Contract!]!
    pageInfo: PageInfo!
  }

  type ServiceConnection {
    nodes: [Service!]!
    pageInfo: PageInfo!
  }

  type PaymentConnection {
    nodes: [Payment!]!
    pageInfo: PageInfo!
  }

  type MaintenanceEventConnection {
    nodes: [MaintenanceEvent!]!
    pageInfo: PageInfo!
  }

  # Property type and inputs
  type Property {
    id: ID!
    name: String!
    address: String!
    userId: ID!
    user: User
    createdAt: DateTime!
    updatedAt: DateTime!
    rooms: [Room]
    roomCount: Int
    vacantRoomCount: Int
    occupiedRoomCount: Int
  }

  input CreatePropertyInput {
    name: String!
    address: String!
    userId: ID
  }

  input UpdatePropertyInput {
    name: String
    address: String
  }

  # Room type and inputs
  type Room {
    id: ID!
    number: String!
    name: String
    description: String
    floor: Int
    status: String!
    price: Float!
    size: Float
    images: [String]
    propertyId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    renters: [Renter]
    contracts: [Contract]
    maintenanceEvents: [MaintenanceEvent]
    roomServices: [RoomService]
  }

  input CreateRoomInput {
    number: String!
    name: String
    description: String
    floor: Int
    status: String!
    price: Float!
    size: Float
    images: [String]
    propertyId: ID!
  }

  input UpdateRoomInput {
    number: String
    name: String
    description: String
    floor: Int
    status: String
    price: Float
    size: Float
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
    path: String!
    renterId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    renter: Renter
  }

  input CreateDocumentInput {
    name: String!
    type: String!
    path: String!
    renterId: ID!
  }

  input UpdateDocumentInput {
    name: String
    type: String
    path: String
  }

  # Contract type and inputs
  type Contract {
    id: ID!
    name: String!
    renterId: ID!
    roomId: ID!
    startDate: DateTime!
    endDate: DateTime!
    amount: Float!
    securityDeposit: Float
    contractType: String!
    status: String!
    terminationReason: String
    terminationDate: DateTime
    document: String
    createdAt: DateTime!
    updatedAt: DateTime!
    renter: Renter
    room: Room
    payments: [Payment]
    documents: [Document]
  }

  input CreateContractInput {
    name: String!
    renterId: ID!
    roomId: ID!
    startDate: DateTime!
    endDate: DateTime!
    amount: Float!
    securityDeposit: Float
    contractType: String
    status: String
    document: String
  }

  input UpdateContractInput {
    name: String
    startDate: DateTime
    endDate: DateTime
    amount: Float
    securityDeposit: Float
    contractType: String
    status: String
    terminationReason: String
    terminationDate: DateTime
    document: String
  }

  # Service type and inputs
  type Service {
    id: ID!
    name: String!
    description: String
    fee: Float!
    feeType: String!
    icon: String
    active: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    roomServices: [RoomService]
  }

  input CreateServiceInput {
    name: String!
    description: String
    fee: Float!
    feeType: String!
    icon: String
    active: Boolean
  }

  input UpdateServiceInput {
    name: String
    description: String
    fee: Float
    feeType: String
    icon: String
    active: Boolean
  }

  # RoomService type and inputs
  type RoomService {
    id: ID!
    roomId: ID!
    serviceId: ID!
    startDate: DateTime!
    endDate: DateTime
    status: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    room: Room
    service: Service
    payments: [Payment]
  }

  input CreateRoomServiceInput {
    roomId: ID!
    serviceId: ID!
    startDate: DateTime!
    endDate: DateTime
    status: String
  }

  input UpdateRoomServiceInput {
    startDate: DateTime
    endDate: DateTime
    status: String
  }

  # Payment type and inputs
  type Payment {
    id: ID!
    amount: Float!
    status: String!
    type: String!
    dueDate: DateTime!
    paidDate: DateTime
    description: String
    renterId: ID!
    contractId: ID
    roomServiceId: ID
    createdAt: DateTime!
    updatedAt: DateTime!
    renter: Renter
    contract: Contract
    roomService: RoomService
  }

  input CreatePaymentInput {
    amount: Float!
    status: String
    type: String!
    dueDate: DateTime!
    paidDate: DateTime
    description: String
    renterId: ID!
    contractId: ID
    roomServiceId: ID
  }

  input UpdatePaymentInput {
    amount: Float
    status: String
    type: String
    dueDate: DateTime
    paidDate: DateTime
    description: String
  }

  # MaintenanceEvent type and inputs
  type MaintenanceEvent {
    id: ID!
    title: String!
    description: String!
    status: String!
    priority: String!
    roomId: ID!
    scheduledDate: DateTime
    completedDate: DateTime
    cost: Float
    notes: String
    createdAt: DateTime!
    updatedAt: DateTime!
    room: Room
  }

  input CreateMaintenanceEventInput {
    title: String!
    description: String!
    status: String
    priority: String
    roomId: ID!
    scheduledDate: DateTime
    cost: Float
    notes: String
  }

  input UpdateMaintenanceEventInput {
    title: String
    description: String
    status: String
    priority: String
    scheduledDate: DateTime
    completedDate: DateTime
    cost: Float
    notes: String
  }
`;