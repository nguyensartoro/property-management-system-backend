# Property Management System Database Relationships

## Core User Management

- **User**
  - 1:1 → UserPreference (user settings)
  - 1:1 → Subscription (active plan)
  - 1:N → Property (owned properties)

- **UserPreference**
  - 1:1 ← User
  - *Stores*: dark mode, font size, color theme

- **Subscription**
  - 1:1 ← User
  - N:1 → SubscriptionPlan
  - *Status*: ACTIVE, INACTIVE, CANCELLED, PENDING

- **SubscriptionPlan**
  - 1:N ← Subscription
  - *Billing Cycle*: MONTHLY, YEARLY
  - *Features*: room limits, plan features

## Property Management

- **Property**
  - N:1 ← User (owner)
  - 1:N → Room (contained rooms)

- **Room**
  - N:1 ← Property
  - 1:N → Renter (who lives there)
  - 1:N → Contract (rental agreements)
  - 1:N → MaintenanceEvent (repairs, issues)
  - 1:N → RoomService (services assigned to room)
  - *Status*: AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE

## Renter Management

- **Renter**
  - N:1 → Room (optional - where they live)
  - 1:N → Document (ID, passport, etc.)
  - 1:N → Contract (agreements with property)
  - 1:N → Payment (rent payments)

- **Document**
  - N:1 ← Renter
  - *Types*: ID_CARD, PASSPORT, CONTRACT, OTHER

## Contract & Payment

- **Contract**
  - N:1 ← Renter (who signed it)
  - N:1 ← Room (which room it applies to)
  - 1:N → Payment (payments for this contract)
  - *Status*: PENDING, ACTIVE, EXPIRED, TERMINATED
  - *Type*: Long-term (isLongTerm=true) or Short-term (isLongTerm=false)

- **Payment**
  - N:1 ← Renter (who paid)
  - N:1 ← Contract (optional - which contract it's for)
  - N:1 ← RoomService (optional - which service it's for)
  - *Status*: PENDING, PAID, OVERDUE, CANCELLED
  - *Type*: RENT, DEPOSIT, SERVICE, MAINTENANCE, OTHER

## Services & Maintenance

- **Service**
  - 1:N → RoomService (service assignments to rooms)
  - *Fee Type*: ONE_TIME, MONTHLY, YEARLY

- **RoomService**
  - N:1 ← Room (which room it's assigned to)
  - N:1 ← Service (which service is provided)
  - 1:N → Payment (payments for this service)
  - *Status*: ACTIVE, INACTIVE, TERMINATED

- **MaintenanceEvent**
  - N:1 ← Room (which room needs maintenance)
  - *Status*: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  - *Priority*: LOW, MEDIUM, HIGH, URGENT

## Financial Management

- **Expense**
  - *Categories*: MAINTENANCE, UTILITIES, TAXES, INSURANCE, SALARY, SUPPLIES, MARKETING, OTHER
  - *Note*: Independent entity not directly related to other tables

## Relationship Cardinality Legend

- **1:1** - One-to-one relationship (each record in Table A relates to exactly one record in Table B)
- **1:N** - One-to-many relationship (each record in Table A relates to multiple records in Table B)
- **N:1** - Many-to-one relationship (multiple records in Table A relate to one record in Table B)

## Database Schema Visualization

```
User ───────┬─────── UserPreference
            │
            ├─────── Subscription ─────── SubscriptionPlan
            │
            └─────── Property
                       │
                       └─────── Room ───────┬─────── Renter ─────┬─────── Document
                                  │         │                    │
                                  │         │                    └─────── Payment
                                  │         │                              ▲
                                  │         └─────── Contract ─────────────┘
                                  │                     │
                                  │                     │
                                  ├─────── MaintenanceEvent
                                  │
                                  └─────── RoomService ────┬───── Service
                                                           │
                                                           └───── Payment
                                                             
Expense (independent)
```

## Key Business Rules

1. A user can have multiple properties
2. A property can have multiple rooms
3. A room can have multiple renters (e.g., roommates)
4. A renter can have multiple contracts (current and past)
5. A contract is tied to one specific room and renter
6. Payments can be for contracts (rent) or services
7. Room services connect specific services to specific rooms
8. Expenses are tracked independently of other entities
9. Maintenance events are tracked per room

This database design supports the complete property management workflow from managing properties, rooms, and renters to handling contracts, payments, services, and maintenance events. 