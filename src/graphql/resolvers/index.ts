import { GraphQLResolveInfo } from 'graphql';
import { GraphQLContext } from '../context';
import { scalars } from '../scalars';
import { roomResolvers } from './room.resolvers';
import { renterResolvers } from './renter.resolvers';
import { documentResolvers } from './document.resolvers';
import { authResolvers } from './auth.resolvers';
import { contractResolvers } from './contract.resolvers';
import { serviceResolvers } from './service.resolvers';
import { paymentResolvers } from './payment.resolvers';
import { maintenanceResolvers } from './maintenance.resolvers';
import { propertyResolvers } from './property.resolvers';
import { themeSettingsResolvers } from './themeSettings.resolvers';
import { merge } from 'lodash';

// Create base resolver object with scalars
const baseResolvers = {
  ...scalars,
  
  Query: {},
  Mutation: {},
  
  // Type resolvers
  Room: roomResolvers.Room,
  Renter: renterResolvers.Renter,
  Document: documentResolvers.Document,
  Contract: contractResolvers.Contract,
  Service: serviceResolvers.Service,
  Payment: paymentResolvers.Payment,
  MaintenanceEvent: maintenanceResolvers.MaintenanceEvent,
};

// Combine all resolvers using merge to avoid overwriting
export const resolvers = merge(
  baseResolvers,
  { Query: authResolvers.Query, Mutation: authResolvers.Mutation },
  { Query: roomResolvers.Query, Mutation: roomResolvers.Mutation },
  { Query: renterResolvers.Query, Mutation: renterResolvers.Mutation },
  { Query: documentResolvers.Query, Mutation: documentResolvers.Mutation },
  { Query: contractResolvers.Query, Mutation: contractResolvers.Mutation },
  { Query: serviceResolvers.Query, Mutation: serviceResolvers.Mutation },
  { Query: paymentResolvers.Query, Mutation: paymentResolvers.Mutation },
  { Query: maintenanceResolvers.Query, Mutation: maintenanceResolvers.Mutation },
  propertyResolvers,
  { Query: themeSettingsResolvers.Query, Mutation: themeSettingsResolvers.Mutation },
  { User: themeSettingsResolvers.User }
); 