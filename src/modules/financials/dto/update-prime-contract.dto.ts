import { PartialType } from '@nestjs/mapped-types';
import { CreatePrimeContractDto } from './create-prime-contract.dto';

export class UpdatePrimeContractDto extends PartialType(
  CreatePrimeContractDto,
) {}
