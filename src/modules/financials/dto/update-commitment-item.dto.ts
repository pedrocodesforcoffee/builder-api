import { PartialType } from '@nestjs/mapped-types';
import { CreateCommitmentItemDto } from './create-commitment-item.dto';

export class UpdateCommitmentItemDto extends PartialType(
  CreateCommitmentItemDto,
) {}
