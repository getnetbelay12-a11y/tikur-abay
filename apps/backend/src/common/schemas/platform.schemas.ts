import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { AgreementStatus } from '../enums/agreement-status.enum';
import { DocumentApprovalStatus } from '../enums/document-approval-status.enum';
import { DocumentCategory } from '../enums/document-category.enum';
import { PlatformRole } from '../enums/platform-role.enum';
import { ShipmentStatus } from '../enums/shipment-status.enum';
import { BaseEntitySchema } from './base.schema';

@Schema({ collection: 'roles', timestamps: true, versionKey: false })
export class Role extends BaseEntitySchema {
  @Prop({ required: true, enum: PlatformRole, unique: true, index: true })
  name!: PlatformRole;

  @Prop({ type: [String], default: [] })
  permissions!: string[];
}
export type RoleDocument = HydratedDocument<Role>;
export const RoleSchema = SchemaFactory.createForClass(Role);

@Schema({ collection: 'users', timestamps: true, versionKey: false })
export class User extends BaseEntitySchema {
  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, unique: true, trim: true, index: true })
  email!: string;

  @Prop({ trim: true })
  phoneNumber?: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true, index: true })
  roleId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Branch', index: true })
  branchId?: Types.ObjectId;

  @Prop({ default: true, index: true })
  isActive!: boolean;
}
export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);

@Schema({ collection: 'branches', timestamps: true, versionKey: false })
export class Branch extends BaseEntitySchema {
  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ required: true, trim: true, index: true })
  city!: string;

  @Prop({ required: true, trim: true, index: true })
  region!: string;

  @Prop({ trim: true })
  code?: string;

  @Prop({ type: { lat: Number, lng: Number } })
  geoLocation?: { lat: number; lng: number };
}
export type BranchDocument = HydratedDocument<Branch>;
export const BranchSchema = SchemaFactory.createForClass(Branch);

@Schema({ collection: 'customers', timestamps: true, versionKey: false })
export class Customer extends BaseEntitySchema {
  @Prop({ required: true, trim: true })
  organizationName!: string;

  @Prop({ required: true, trim: true })
  contactPerson!: string;

  @Prop({ required: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true, trim: true })
  phoneNumber!: string;

  @Prop({ trim: true })
  taxId?: string;
}
export type CustomerDocument = HydratedDocument<Customer>;
export const CustomerSchema = SchemaFactory.createForClass(Customer);

@Schema({ collection: 'drivers', timestamps: true, versionKey: false })
export class Driver extends BaseEntitySchema {
  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, unique: true, trim: true })
  licenseNumber!: string;

  @Prop({ trim: true })
  phoneNumber?: string;

  @Prop({ type: Types.ObjectId, ref: 'Branch', index: true })
  branchId?: Types.ObjectId;

  @Prop({ default: true })
  isAvailable!: boolean;
}
export type DriverDocument = HydratedDocument<Driver>;
export const DriverSchema = SchemaFactory.createForClass(Driver);

@Schema({ collection: 'vehicles', timestamps: true, versionKey: false })
export class Vehicle extends BaseEntitySchema {
  @Prop({ required: true, unique: true, trim: true, index: true })
  plateNumber!: string;

  @Prop({ required: true, trim: true })
  type!: string;

  @Prop({ default: 'idle', index: true })
  status!: string;

  @Prop({ type: Types.ObjectId, ref: 'Branch', index: true })
  branchId?: Types.ObjectId;
}
export type VehicleDocument = HydratedDocument<Vehicle>;
export const VehicleSchema = SchemaFactory.createForClass(Vehicle);

@Schema({ collection: 'trailers', timestamps: true, versionKey: false })
export class Trailer extends BaseEntitySchema {
  @Prop({ required: true, unique: true, trim: true })
  plateNumber!: string;

  @Prop({ trim: true })
  type?: string;
}
export type TrailerDocument = HydratedDocument<Trailer>;
export const TrailerSchema = SchemaFactory.createForClass(Trailer);

@Schema({ collection: 'jobs', timestamps: true, versionKey: false })
export class Job extends BaseEntitySchema {
  @Prop({ required: true, unique: true, trim: true, index: true })
  jobNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  origin!: string;

  @Prop({ required: true, trim: true })
  destination!: string;

  @Prop({ required: true, min: 0 })
  quotedAmount!: number;

  @Prop({ default: 'draft', index: true })
  status!: string;
}
export type JobDocument = HydratedDocument<Job>;
export const JobSchema = SchemaFactory.createForClass(Job);

@Schema({ collection: 'shipments', timestamps: true, versionKey: false })
export class Shipment extends BaseEntitySchema {
  @Prop({ required: true, unique: true, trim: true, index: true })
  shipmentNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Job', required: true, index: true })
  jobId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ required: true, enum: ShipmentStatus, index: true })
  status!: ShipmentStatus;

  @Prop({ required: true, trim: true })
  cargoDescription!: string;

  @Prop({ required: true, min: 0 })
  weightKg!: number;

  @Prop({ required: true, trim: true })
  origin!: string;

  @Prop({ required: true, trim: true })
  destination!: string;

  @Prop({ type: [String], default: [] })
  activeTripIds!: string[];
}
export type ShipmentDocument = HydratedDocument<Shipment>;
export const ShipmentSchema = SchemaFactory.createForClass(Shipment);

@Schema({ collection: 'trip_events', timestamps: true, versionKey: false })
export class TripEvent extends BaseEntitySchema {
  @Prop({ required: true, index: true })
  tripId!: string;

  @Prop({ type: Types.ObjectId, ref: 'Shipment', required: true, index: true })
  shipmentId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  eventType!: string;

  @Prop({ trim: true })
  message?: string;

  @Prop({ default: Date.now })
  occurredAt!: Date;
}
export type TripEventDocument = HydratedDocument<TripEvent>;
export const TripEventSchema = SchemaFactory.createForClass(TripEvent);

@Schema({ collection: 'gps_points', timestamps: true, versionKey: false })
export class GpsPoint extends BaseEntitySchema {
  @Prop({ required: true, index: true })
  tripId!: string;

  @Prop({ required: true })
  lat!: number;

  @Prop({ required: true })
  lng!: number;

  @Prop()
  speedKph?: number;

  @Prop({ default: Date.now, index: true })
  pingedAt!: Date;
}
export type GpsPointDocument = HydratedDocument<GpsPoint>;
export const GpsPointSchema = SchemaFactory.createForClass(GpsPoint);

@Schema({ collection: 'documents', timestamps: true, versionKey: false })
export class DocumentRecord extends BaseEntitySchema {
  @Prop({ required: true, trim: true, index: true })
  entityType!: string;

  @Prop({ required: true, index: true })
  entityId!: string;

  @Prop({ required: true, enum: DocumentCategory, index: true })
  category!: DocumentCategory;

  @Prop({ required: true, trim: true })
  fileName!: string;

  @Prop({ required: true, trim: true })
  storageKey!: string;

  @Prop()
  expiryDate?: Date;

  @Prop({ required: true, enum: DocumentApprovalStatus, default: DocumentApprovalStatus.PENDING })
  approvalStatus!: DocumentApprovalStatus;

  @Prop({ type: [String], default: [] })
  comments!: string[];

  @Prop({ type: [String], default: [] })
  versions!: string[];

  @Prop({ type: Map, of: String, default: {} })
  searchableMetadata!: Record<string, string>;
}
export type DocumentRecordDocument = HydratedDocument<DocumentRecord>;
export const DocumentRecordSchema = SchemaFactory.createForClass(DocumentRecord);

@Schema({ collection: 'agreements', timestamps: true, versionKey: false })
export class Agreement extends BaseEntitySchema {
  @Prop({ required: true, unique: true, trim: true, index: true })
  agreementNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ required: true, enum: AgreementStatus, index: true })
  status!: AgreementStatus;

  @Prop({ required: true, min: 1 })
  versionNumber!: number;

  @Prop()
  signedAt?: Date;

  @Prop({ trim: true })
  signerName?: string;

  @Prop({ trim: true })
  signerRole?: string;

  @Prop({ trim: true })
  customerOrganization?: string;

  @Prop({ trim: true })
  ipAddress?: string;

  @Prop({ trim: true })
  deviceInfo?: string;

  @Prop({ trim: true })
  pdfHash?: string;
}
export type AgreementDocument = HydratedDocument<Agreement>;
export const AgreementSchema = SchemaFactory.createForClass(Agreement);

@Schema({ collection: 'notifications', timestamps: true, versionKey: false })
export class Notification extends BaseEntitySchema {
  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  message!: string;

  @Prop({ required: true, trim: true, index: true })
  userType!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ default: 'unread', index: true })
  status!: string;
}
export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);

@Schema({ collection: 'incidents', timestamps: true, versionKey: false })
export class Incident extends BaseEntitySchema {
  @Prop({ required: true, index: true })
  tripId!: string;

  @Prop({ required: true, trim: true })
  incidentType!: string;

  @Prop({ required: true, trim: true })
  description!: string;

  @Prop({ default: 'open', index: true })
  status!: string;
}
export type IncidentDocument = HydratedDocument<Incident>;
export const IncidentSchema = SchemaFactory.createForClass(Incident);

@Schema({ collection: 'compliance_items', timestamps: true, versionKey: false })
export class ComplianceItem extends BaseEntitySchema {
  @Prop({ required: true, trim: true })
  itemType!: string;

  @Prop({ required: true, trim: true })
  entityType!: string;

  @Prop({ required: true, trim: true })
  entityId!: string;

  @Prop({ default: 'active', index: true })
  status!: string;

  @Prop()
  expiresAt?: Date;
}
export type ComplianceItemDocument = HydratedDocument<ComplianceItem>;
export const ComplianceItemSchema = SchemaFactory.createForClass(ComplianceItem);

@Schema({ collection: 'integration_refs', timestamps: true, versionKey: false })
export class IntegrationRef extends BaseEntitySchema {
  @Prop({ required: true, trim: true })
  system!: string;

  @Prop({ required: true, trim: true })
  externalId!: string;

  @Prop({ required: true, trim: true })
  entityType!: string;

  @Prop({ required: true, trim: true })
  entityId!: string;
}
export type IntegrationRefDocument = HydratedDocument<IntegrationRef>;
export const IntegrationRefSchema = SchemaFactory.createForClass(IntegrationRef);

@Schema({ collection: 'audit_logs', timestamps: true, versionKey: false })
export class AuditLog extends BaseEntitySchema {
  @Prop({ required: true, trim: true })
  action!: string;

  @Prop({ required: true, trim: true })
  entityType!: string;

  @Prop({ required: true, trim: true })
  entityId!: string;

  @Prop({ trim: true })
  actorId?: string;

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;
}
export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

