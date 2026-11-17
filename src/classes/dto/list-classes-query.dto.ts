import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum ClassSortField {
  STARTS_AT = 'startsAt',
  ACTIVITY = 'activity',
  SPOTS = 'spots',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListClassesQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 10;

  @IsEnum(ClassSortField)
  @IsOptional()
  sort?: ClassSortField = ClassSortField.STARTS_AT;

  @IsEnum(SortOrder)
  @IsOptional()
  order?: SortOrder = SortOrder.ASC;

  @IsString()
  @IsOptional()
  activity?: string;
}
