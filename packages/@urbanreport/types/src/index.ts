// ─── Report Status ────────────────────────────────────────────────────────────

export enum ReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
  DUPLICATE = 'DUPLICATE',
}

// ─── Priority Level ───────────────────────────────────────────────────────────

export enum PriorityLevel {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW',
}

// ─── Location ─────────────────────────────────────────────────────────────────

export interface Location {
  latitude: number;
  longitude: number;
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  description: string | null;
  weight: number;
  iconName: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Municipality ─────────────────────────────────────────────────────────────

export interface Municipality {
  id: string;
  name: string;
  code: string;
  timezone: string;
  contactEmail: string | null;
  adapterType: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────

export enum UserRole {
  CITIZEN = 'citizen',
  MODERATOR = 'moderator',
  MUNICIPALITY_OFFICER = 'municipality_officer',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  keycloakId: string;
  email: string;
  displayName: string | null;
  roles: UserRole[];
  municipalityId: string | null;
  isAnonymous: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Media Item ───────────────────────────────────────────────────────────────

export type MediaVariant = 'thumb' | 'web' | 'full';

export interface MediaItem {
  id: string;
  reportId: string | null;
  uploaderId: string;
  key: string;
  contentType: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED';
  variants: Record<MediaVariant, string> | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Report Status History ────────────────────────────────────────────────────

export interface ReportStatusHistory {
  id: string;
  reportId: string;
  fromStatus: ReportStatus | null;
  toStatus: ReportStatus;
  actorId: string;
  comment: string | null;
  createdAt: string;
}

// ─── Report ───────────────────────────────────────────────────────────────────

export interface Report {
  id: string;
  title: string | null;
  description: string;
  status: ReportStatus;
  priorityScore: number;
  priorityLevel: PriorityLevel;
  categoryId: string;
  category?: Category;
  municipalityId: string | null;
  municipality?: Municipality;
  reporterId: string;
  reporter?: Pick<User, 'id' | 'displayName' | 'isAnonymous'>;
  location: Location;
  address: string | null;
  confirmationsCount: number;
  duplicateOfId: string | null;
  mediaItems?: MediaItem[];
  statusHistory?: ReportStatusHistory[];
  resolvedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── DTOs (request / response shapes) ────────────────────────────────────────

export interface CreateReportDto {
  categoryId: string;
  latitude: number;
  longitude: number;
  description: string;
  mediaIds?: string[];
}

export interface UpdateStatusDto {
  status: ReportStatus;
  comment?: string;
}

export interface ConfirmReportDto {
  comment?: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  total: number;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  roles: UserRole[];
}

// ─── Media API request/response shapes ───────────────────────────────────────

export interface MediaInitRequest {
  contentType: string;
  reportId?: string;
}

export interface MediaInitResponse {
  mediaId: string;
  uploadUrl: string;
  key: string;
}

export interface MediaConfirmRequest {
  mediaId: string;
  key: string;
}

export interface MediaConfirmResponse {
  status: 'processing';
  mediaId: string;
}

export interface PaginatedReportsResponse {
  items: Report[];
  nextCursor: string | null;
}

// ─── Kafka Events ─────────────────────────────────────────────────────────────

export interface ReportCreatedEvent {
  reportId: string;
  reporterId: string;
  categoryId: string;
  location: Location;
  priorityScore: number;
  createdAt: string;
}

export interface ReportStatusChangedEvent {
  reportId: string;
  fromStatus: ReportStatus;
  toStatus: ReportStatus;
  actorId: string;
  changedAt: string;
}

export interface ReportConfirmedEvent {
  reportId: string;
  confirmerId: string;
  newConfirmationsCount: number;
  newPriorityScore: number;
  confirmedAt: string;
}

export interface MediaUploadedEvent {
  mediaId: string;
  key: string;
  confirmedAt: string;
}

export interface MediaProcessedEvent {
  mediaId: string;
  variants: Record<MediaVariant, string>;
  processedAt: string;
}
