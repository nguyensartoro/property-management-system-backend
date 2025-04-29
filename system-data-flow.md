# Property Management System - Data Flow Diagram

## Core System Data Flows

```mermaid
flowchart TD
    %% External entities
    User((User))
    Renter((Renter))
    Payment((Payment Provider))

    %% Processes
    A[Authentication & Authorization]
    B[Property Management]
    C[Room Management]
    D[Renter Management]
    E[Contract Processing]
    F[Payment Processing]
    G[Service Management]
    H[Reporting & Analytics]
    I[Notification System]

    %% Data stores
    DB1[(User Data)]
    DB2[(Property Data)]
    DB3[(Room Data)]
    DB4[(Renter Data)]
    DB5[(Contract Data)]
    DB6[(Payment Data)]
    DB7[(Service Data)]
    DB8[(Maintenance Data)]

    %% User flows
    User -->|Login/Register| A
    A -->|Authenticates| User
    A -->|Stores credentials| DB1

    User -->|Create/Manage Properties| B
    B -->|Property details| DB2
    B -->|Create/Edit Rooms| C

    User -->|Manage Rooms| C
    C -->|Room details| DB3
    C -->|Room Status Updates| I

    User -->|Add/Manage Renters| D
    D -->|Renter details| DB4
    D -->|Add Documents| DB4

    User -->|Create Contracts| E
    E -->|Contract details| DB5
    E -->|Creates Payment Schedule| F

    User -->|Record/Process Payments| F
    F -->|Payment details| DB6
    F <-->|Payment Processing| Payment

    User -->|Manage Services| G
    G -->|Service details| DB7
    G -->|Assign to Rooms| DB3

    User -->|View Reports| H
    H -->|Retrieves data from| DB2
    H -->|Retrieves data from| DB3
    H -->|Retrieves data from| DB5
    H -->|Retrieves data from| DB6

    %% Renter flows
    Renter -->|Makes Payment| Payment
    Renter -->|Requests Maintenance| C
    C -->|Creates Maintenance Request| DB8

    %% Notification flows
    I -->|Sends notifications| User
    I -->|Sends notifications| Renter
    F -->|Payment notifications| I
    E -->|Contract expiry notifications| I
    DB8 -->|Maintenance updates| I
```

## Key Data Flow Descriptions

### User Management Flow
1. User registers/logs in to the system
2. Authentication process validates credentials
3. User data is stored in the database
4. User accesses system features based on role and permissions

### Property & Room Management Flow
1. User creates and manages properties
2. Properties contain multiple rooms
3. Room status changes trigger notifications
4. Maintenance events are tracked for rooms

### Renter Management Flow
1. User adds renters to the system
2. Renters are assigned to rooms
3. Renter documents are stored and managed
4. Renter information links to contracts and payments

### Contract & Payment Flow
1. User creates contracts linking renters to rooms
2. Contracts generate payment schedules
3. Payments are processed and recorded
4. Payment status updates trigger notifications

### Service Management Flow
1. User defines available services
2. Services are assigned to specific rooms
3. Service charges generate payments
4. Service status changes are tracked

### Reporting Flow
1. System collects data from all modules
2. Analytics processes generate insights
3. User views dashboards and reports
4. Financial summaries are calculated

## System Notifications
- Contract expiration alerts
- Payment due/received notifications
- Maintenance request updates
- Occupancy status changes
- Subscription plan alerts

## Integration Points
- Payment gateway for online payments
- Email/SMS notification services
- Document storage systems
- Calendar integrations for scheduling