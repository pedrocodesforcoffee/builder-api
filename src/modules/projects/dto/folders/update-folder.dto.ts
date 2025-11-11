import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateFolderDto } from './create-folder.dto';

/**
 * Update Folder DTO
 *
 * Allows partial updates of folder information.
 * All fields from CreateFolderDto are optional except projectId and parentId.
 * Cannot update projectId (folders cannot be moved between projects).
 * Cannot update parentId directly (use move-folder endpoint instead).
 *
 * @dto UpdateFolderDto
 */
export class UpdateFolderDto extends PartialType(
  OmitType(CreateFolderDto, ['parentId'] as const),
) {
  // Explicitly exclude parentId - use move operation instead
  parentId?: never;
}
