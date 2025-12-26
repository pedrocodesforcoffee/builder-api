/**
 * Documents Module Entities
 *
 * Centralized export of all document-related entities.
 */

export { Document } from './document.entity';
export { DocumentVersion } from './document-version.entity';
export { DrawingSet } from './drawing-set.entity';
export { Drawing } from './drawing.entity';
export { DrawingCrossReference, ReferenceType } from './drawing-cross-reference.entity';
export { DrawingRevision } from './drawing-revision.entity';
export { Specification } from './specification.entity';
export { DocumentAuditLog } from './document-audit-log.entity';
export { DocumentUpload, UploadStatus, UploadType } from './document-upload.entity';
export { VersionDistribution, DistributionType } from './version-distribution.entity';
export { DocumentLockHistory, LockAction } from './document-lock-history.entity';
export { Addendum } from './addendum.entity';
export { AddendumSection, AddendumChangeType } from './addendum-section.entity';
export { SpecificationProduct } from './specification-product.entity';
export { SpecificationDrawing } from './specification-drawing.entity';
export { SpecificationRfi } from './specification-rfi.entity';

// Permission & Distribution entities
export { ProjectMember } from './project-member.entity';
export { FolderPermission } from './folder-permission.entity';
export { DocumentPermission } from './document-permission.entity';
export { DocumentRestriction } from './document-restriction.entity';
export { ShareLink } from './share-link.entity';
export { DocumentAccessLog } from './document-access-log.entity';
export { Transmittal, TransmittalDocument, TransmittalRecipient } from './transmittal.entity';
export { DistributionList, DistributionListMember } from './distribution-list.entity';

// Search & Discovery entities
export { UserDocumentActivity, DocumentActivityType } from './user-document-activity.entity';
export { UserFavorite } from './user-favorite.entity';
export { SavedSearch, AlertFrequency } from './saved-search.entity';
export { SearchLog } from './search-log.entity';
