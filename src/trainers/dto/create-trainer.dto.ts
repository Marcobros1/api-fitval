import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  Length,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  ArrayMinSize,
  ArrayUnique,
} from 'class-validator';

export class CreateTrainerDto {
  @IsString()
  @IsNotEmpty()
  @Length(9, 9, { message: 'El DNI debe tener 9 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  dni: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @IsEmail()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  email: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe tener al menos una especialidad' })
  @ArrayUnique((item) => item.id, { message: 'Las especialidades no pueden repetirse' })
  @ValidateNested({ each: true })
  @Type(() => SpecialtyIdDto)
  specialtyIds: SpecialtyIdDto[];
}

export class SpecialtyIdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}