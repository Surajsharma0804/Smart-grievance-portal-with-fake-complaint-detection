/** User roles in the system. */
export const Role = {
  CITIZEN: 'CITIZEN',
  OFFICER: 'OFFICER',
  DEPT_ADMIN: 'DEPT_ADMIN',
  REVIEWER: 'REVIEWER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/** Complaint lifecycle statuses (see design.md §8 state machine). */
export const ComplaintStatus = {
  SUBMITTED: 'SUBMITTED',
  ANALYZING: 'ANALYZING',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  ROUTED: 'ROUTED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  REOPENED: 'REOPENED',
  LINKED_DUPLICATE: 'LINKED_DUPLICATE',
} as const;
export type ComplaintStatus = (typeof ComplaintStatus)[keyof typeof ComplaintStatus];

/** Grievance category codes (FR-6.1). */
export const CategoryCode = {
  SANITATION: 'SANITATION',
  ROADS: 'ROADS',
  WATER: 'WATER',
  ELECTRICITY: 'ELECTRICITY',
  STREET_LIGHTING: 'STREET_LIGHTING',
  TRAFFIC: 'TRAFFIC',
  PARKS: 'PARKS',
  PUBLIC_HEALTH: 'PUBLIC_HEALTH',
  STRAY_ANIMALS: 'STRAY_ANIMALS',
  ENCROACHMENT: 'ENCROACHMENT',
  OTHER: 'OTHER',
} as const;
export type CategoryCode = (typeof CategoryCode)[keyof typeof CategoryCode];

/** Source of the uploaded image (FR-2.2). */
export const MediaSource = {
  CAMERA: 'CAMERA',
  GALLERY: 'GALLERY',
} as const;
export type MediaSource = (typeof MediaSource)[keyof typeof MediaSource];

/** Stages of the analysis pipeline (design.md §3). */
export const AnalysisStage = {
  INGEST: 'INGEST',
  FINGERPRINT: 'FINGERPRINT',
  METADATA: 'METADATA',
  FORENSICS: 'FORENSICS',
  EMBEDDING: 'EMBEDDING',
  VLM: 'VLM',
  DUPLICATES: 'DUPLICATES',
  TRUST: 'TRUST',
  ROUTING: 'ROUTING',
  NOTIFY: 'NOTIFY',
  DONE: 'DONE',
  FAILED: 'FAILED',
} as const;
export type AnalysisStage = (typeof AnalysisStage)[keyof typeof AnalysisStage];
