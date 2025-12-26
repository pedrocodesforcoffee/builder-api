import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RejectPcoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason!: string;
}
