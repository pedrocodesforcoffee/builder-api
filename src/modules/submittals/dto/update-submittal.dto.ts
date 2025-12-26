import { PartialType } from '@nestjs/swagger';
import { CreateSubmittalDto } from './create-submittal.dto';

export class UpdateSubmittalDto extends PartialType(CreateSubmittalDto) {}
