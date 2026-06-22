import { Type } from 'class-transformer';
import {
  IsArray,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength
} from 'class-validator';

export class CreateReportDto {
  @IsUUID('4')
  categoryId!: string;

  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mediaIds?: string[];
}
