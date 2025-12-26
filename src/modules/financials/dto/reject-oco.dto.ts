import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectOcoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}
