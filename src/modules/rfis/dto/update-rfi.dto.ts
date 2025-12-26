import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateRfiDto } from './create-rfi.dto';

export class UpdateRfiDto extends PartialType(
  OmitType(CreateRfiDto, ['sendImmediately'] as const),
) {}
