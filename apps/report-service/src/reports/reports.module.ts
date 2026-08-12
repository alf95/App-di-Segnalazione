import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { PrismaModule } from '../prisma/prisma.module';
import { DeduplicationService } from './deduplication/deduplication.service';
import { PriorityCalculatorService } from './priority/priority-calculator.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportStateMachineService } from './state-machine/report-state-machine.service';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    DeduplicationService,
    PriorityCalculatorService,
    ReportStateMachineService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
