import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, ReportStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const VALID_TRANSITIONS: Record<ReportStatus, ReportStatus[]> = {
  [ReportStatus.DRAFT]: [ReportStatus.SUBMITTED],
  [ReportStatus.SUBMITTED]: [
    ReportStatus.UNDER_REVIEW,
    ReportStatus.DUPLICATE,
    ReportStatus.REJECTED,
  ],
  [ReportStatus.UNDER_REVIEW]: [ReportStatus.ASSIGNED, ReportStatus.REJECTED],
  [ReportStatus.ASSIGNED]: [ReportStatus.IN_PROGRESS, ReportStatus.REJECTED],
  [ReportStatus.IN_PROGRESS]: [ReportStatus.RESOLVED, ReportStatus.REJECTED],
  [ReportStatus.RESOLVED]: [],
  [ReportStatus.REJECTED]: [],
  [ReportStatus.DUPLICATE]: [],
};

@Injectable()
export class ReportStateMachineService {
  constructor(private readonly prisma: PrismaService) {}

  canTransition(from: ReportStatus, to: ReportStatus): boolean {
    return VALID_TRANSITIONS[from].includes(to);
  }

  async transition(
    reportId: string,
    to: ReportStatus,
    actorId: string,
    comment?: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const report = await tx.report.findUnique({
        where: { id: reportId },
        select: { status: true },
      });

      if (!report) {
        throw new NotFoundException(`Report "${reportId}" not found`);
      }

      if (!this.canTransition(report.status, to)) {
        throw new UnprocessableEntityException(
          `Invalid status transition from ${report.status} to ${to}`,
        );
      }

      await tx.report.update({
        where: { id: reportId },
        data: {
          status: to,
          resolvedAt: to === ReportStatus.RESOLVED ? new Date() : undefined,
        },
      });

      await tx.reportStatusHistory.create({
        data: {
          reportId,
          fromStatus: report.status,
          toStatus: to,
          actorId,
          comment,
        },
      });
    });
  }
}
