import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateClassDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as string),
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50)
  activity: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : (value as string),
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(30)
  room: string;

  @IsDateString()
  startsAt: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  spots: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  trainerId: number;
}
