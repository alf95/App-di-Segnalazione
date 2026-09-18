import { IsOptional, IsString } from 'class-validator';

export class ConfirmReportDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
