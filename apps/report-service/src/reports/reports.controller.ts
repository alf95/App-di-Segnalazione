import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards
} from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { ConfirmReportDto } from './dto/confirm-report.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ReportsService } from './reports.service';

type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() dto: CreateReportDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.reportsService.create(dto, request.user.sub);
  }

  @Get()
  @Public()
  findMany(
    @Query('after') after?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
    @Query('municipalityId') municipalityId?: string
  ) {
    return this.reportsService.findMany({ after, limit, municipalityId });
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.reportsService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateStatusDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.reportsService.updateStatus(id, dto, request.user.sub);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  confirm(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ConfirmReportDto,
    @Req() request: AuthenticatedRequest
  ) {
    return this.reportsService.confirm(id, dto, request.user.sub);
  }
}
