import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectCcoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}
