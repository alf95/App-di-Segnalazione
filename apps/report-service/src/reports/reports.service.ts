import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PriorityLevel, ReportStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfirmReportDto } from './dto/confirm-report.dto';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { DeduplicationService } from './deduplication/deduplication.service';
import { PriorityCalculatorService } from './priority/priority-calculator.service';
import { ReportStateMachineService } from './state-machine/report-state-machine.service';

type ReportDetails = Prisma.ReportGetPayload<{
  include: {
    category: true;
    municipality: true;
    mediaItems: true;
    statusHistory: {
      include: { actor: true };
    };
  };
}>;

type ReportListItem = Prisma.ReportGetPayload<{
  include: {
    category: true;
    municipality: true;
  };
}>;

interface InsertReportInput {
  id: string;
  reporterId: string;
  municipalityId: string | null;
  categoryId: string;
  description: string;
  status: ReportStatus;
  priorityLevel: PriorityLevel;
  priorityScore: number;
  longitude: number;
  latitude: number;
  confirmationsCount: number;
  duplicateOfId: string | null;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deduplicationService: DeduplicationService,
    private readonly priorityCalculator: PriorityCalculatorService,
    private readonly reportStateMachine: ReportStateMachineService,
    private readonly eventsService: EventsService,
  ) {}

  async create(dto: CreateReportDto, userId: string): Promise<ReportDetails> {
    const reporterId = await this.ensureUserId(userId);

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category "${dto.categoryId}" not found`);
    }

    const duplicateId = await this.deduplicationService.findDuplicate(
      dto.categoryId,
      dto.latitude,
      dto.longitude,
    );

    const reportId = uuidv4();
    const municipalityId = await this.resolveMunicipalityId();
    const hasMedia = (dto.mediaIds?.length ?? 0) > 0;
    const initialScore = this.priorityCalculator.calculateScore({
      categoryWeight: category.weight,
      confirmations: 0,
      locationRisk: 0,
      hasMedia,
      ageHours: 0,
    });
    const initialLevel = this.priorityCalculator.getPriorityLevel(initialScore);

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (duplicateId) {
        await this.insertReport(tx, {
          id: reportId,
          reporterId,
          municipalityId,
          categoryId: dto.categoryId,
          description: dto.description,
          status: ReportStatus.DUPLICATE,
          priorityLevel: initialLevel,
          priorityScore: initialScore,
          longitude: dto.longitude,
          latitude: dto.latitude,
          confirmationsCount: 0,
          duplicateOfId: duplicateId,
        });

        await tx.report.update({
          where: { id: duplicateId },
          data: { confirmationsCount: { increment: 1 } },
        });

        await tx.reportStatusHistory.create({
          data: {
            reportId,
            fromStatus: null,
            toStatus: ReportStatus.DUPLICATE,
            actorId: reporterId,
            comment: 'Auto-marked as duplicate during submission.',
          },
        });

        await this.recalculatePriority(tx, duplicateId);
      } else {
        await this.insertReport(tx, {
          id: reportId,
          reporterId,
          municipalityId,
          categoryId: dto.categoryId,
          description: dto.description,
          status: ReportStatus.SUBMITTED,
          priorityLevel: initialLevel,
          priorityScore: initialScore,
          longitude: dto.longitude,
          latitude: dto.latitude,
          confirmationsCount: 0,
          duplicateOfId: null,
        });

        await tx.reportStatusHistory.create({
          data: {
            reportId,
            fromStatus: null,
            toStatus: ReportStatus.SUBMITTED,
            actorId: reporterId,
          },
        });
      }

      if (dto.mediaIds && dto.mediaIds.length > 0) {
        await tx.mediaItem.updateMany({
          where: { id: { in: dto.mediaIds } },
          data: { reportId },
        });
      }
    });

    const report = await this.findOne(reportId);

    if (!duplicateId) {
      await this.eventsService.emit('report.created', {
        reportId: report.id,
        categoryId: report.categoryId,
        municipalityId: report.municipalityId,
        status: report.status,
        priorityLevel: report.priorityLevel,
        priorityScore: report.priorityScore,
        reporterId: userId,
        createdAt: report.createdAt.toISOString(),
      });
    }

    return report;
  }

  async findOne(id: string): Promise<ReportDetails> {
    const report = await this.prisma.report.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        municipality: true,
        mediaItems: true,
        statusHistory: {
          include: { actor: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report "${id}" not found`);
    }

    return report;
  }

  async updateStatus(id: string, dto: UpdateStatusDto, actorId: string): Promise<ReportDetails> {
    const localActorId = await this.ensureUserId(actorId);

    await this.reportStateMachine.transition(id, dto.status, localActorId, dto.comment);

    await this.eventsService.emit('report.status_changed', {
      reportId: id,
      status: dto.status,
      actorId,
      comment: dto.comment,
      changedAt: new Date().toISOString(),
    });

    return this.findOne(id);
  }

  async confirm(id: string, dto: ConfirmReportDto, userId: string): Promise<ReportDetails> {
    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const report = await tx.report.findUnique({
        where: { id },
        include: {
          category: true,
          _count: { select: { mediaItems: true } },
        },
      });

      if (!report || report.deletedAt) {
        throw new NotFoundException(`Report "${id}" not found`);
      }

      const nextConfirmationsCount = report.confirmationsCount + 1;
      const ageHours = (Date.now() - report.createdAt.getTime()) / (1000 * 60 * 60);
      const score = this.priorityCalculator.calculateScore({
        categoryWeight: report.category.weight,
        confirmations: nextConfirmationsCount,
        locationRisk: 0,
        hasMedia: report._count.mediaItems > 0,
        ageHours,
      });
      const level = this.priorityCalculator.getPriorityLevel(score);

      await tx.report.update({
        where: { id },
        data: {
          confirmationsCount: nextConfirmationsCount,
          priorityScore: score,
          priorityLevel: level,
        },
      });
    });

    await this.eventsService.emit('report.confirmed', {
      reportId: id,
      userId,
      comment: dto.comment,
      confirmedAt: new Date().toISOString(),
    });

    return this.findOne(id);
  }

  async findMany(params: {
    after?: string;
    limit?: number;
    municipalityId?: string;
  }): Promise<{ items: ReportListItem[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);

    const items = await this.prisma.report.findMany({
      where: { deletedAt: null, municipalityId: params.municipalityId },
      include: { category: true, municipality: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(params.after ? { cursor: { id: params.after }, skip: 1 } : {}),
    });

    const hasNextPage = items.length > limit;
    const sliced = hasNextPage ? items.slice(0, limit) : items;

    return {
      items: sliced,
      nextCursor: hasNextPage ? (sliced[sliced.length - 1]?.id ?? null) : null,
    };
  }

  /** Upsert a user by Keycloak sub so we always have a local user row. */
  private async ensureUserId(keycloakId: string, email?: string): Promise<string> {
    const user = await this.prisma.user.upsert({
      where: { keycloakId },
      update: email ? { email } : {},
      create: {
        keycloakId,
        // email is required in the schema; use a placeholder when absent
        email: email ?? `${keycloakId}@keycloak.local`,
      },
    });

    return user.id;
  }

  private async resolveMunicipalityId(): Promise<string | null> {
    const municipality = await this.prisma.municipality.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    return municipality?.id ?? null;
  }

  /**
   * Raw INSERT for reports because the `location` column uses an
   * Unsupported("geometry(Point,4326)") type in Prisma and can't use
   * the generated client create().
   */
  private async insertReport(
    tx: Prisma.TransactionClient,
    input: InsertReportInput,
  ): Promise<void> {
    await tx.$queryRaw`
      INSERT INTO reports (
        id, reporter_id, municipality_id, category_id, description,
        status, priority_level, priority_score, location,
        confirmations_count, duplicate_of_id, created_at, updated_at
      )
      VALUES (
        ${input.id}::uuid,
        ${input.reporterId}::uuid,
        ${input.municipalityId ?? null}::uuid,
        ${input.categoryId}::uuid,
        ${input.description},
        ${input.status}::"ReportStatus",
        ${input.priorityLevel}::"PriorityLevel",
        ${input.priorityScore},
        ST_SetSRID(ST_MakePoint(${input.longitude}, ${input.latitude}), 4326),
        ${input.confirmationsCount},
        ${input.duplicateOfId ?? null}::uuid,
        NOW(),
        NOW()
      )
    `;
  }

  private async recalculatePriority(tx: Prisma.TransactionClient, reportId: string): Promise<void> {
    const report = await tx.report.findUnique({
      where: { id: reportId },
      include: {
        category: true,
        _count: { select: { mediaItems: true } },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report "${reportId}" not found`);
    }

    const ageHours = (Date.now() - report.createdAt.getTime()) / (1000 * 60 * 60);
    const score = this.priorityCalculator.calculateScore({
      categoryWeight: report.category.weight,
      confirmations: report.confirmationsCount,
      locationRisk: 0,
      hasMedia: report._count.mediaItems > 0,
      ageHours,
    });
    const level = this.priorityCalculator.getPriorityLevel(score);

    await tx.report.update({
      where: { id: reportId },
      data: { priorityScore: score, priorityLevel: level },
    });
  }
}
