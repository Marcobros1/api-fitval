import { Transform } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsInt,
  IsString,
  Length,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// Quita los espacios de los extremos si el valor es texto
function trimText({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreateTrainerDto {
  @IsString()
  @Length(9, 9, { message: 'El DNI debe tener 9 caracteres' })
  @Transform(trimText)
  dni!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(trimText)
  name!: string;

  @IsEmail()
  @MaxLength(150)
  @Transform(trimText)
  email!: string;

  // Ids de especialidades: enteros mayores que 0, al menos uno, sin repetir
  @IsArray()
  @ArrayMinSize(1, { message: 'Debe tener al menos una especialidad' })
  @ArrayUnique({ message: 'Las especialidades no pueden repetirse' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  specialtyIds!: number[];
}
