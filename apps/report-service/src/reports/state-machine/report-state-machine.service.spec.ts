import { UnprocessableEntityException } from '@nestjs/common';
import { ReportStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportStateMachineService } from './report-state-machine.service';

const validTransitions: Record<ReportStatus, ReportStatus[]> = {
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

describe('ReportStateMachineService', () => {
  const prisma = {
    $transaction: jest.fn(),
  } as unknown as PrismaService;

  let service: ReportStateMachineService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportStateMachineService(prisma);
  });

  it('returns true for all valid transitions', () => {
    for (const [from, targets] of Object.entries(validTransitions) as Array<
      [ReportStatus, ReportStatus[]]
    >) {
      for (const target of targets) {
        expect(service.canTransition(from, target)).toBe(true);
      }
    }
  });

  it('returns false for invalid transitions', () => {
    const statuses = Object.values(ReportStatus);

    for (const from of statuses) {
      for (const to of statuses) {
        const expected = validTransitions[from].includes(to);
        expect(service.canTransition(from, to)).toBe(expected);
      }
    }
  });

  it('terminal states have no valid transitions', () => {
    expect(validTransitions[ReportStatus.RESOLVED]).toHaveLength(0);
    expect(validTransitions[ReportStatus.REJECTED]).toHaveLength(0);
    expect(validTransitions[ReportStatus.DUPLICATE]).toHaveLength(0);
  });

  it('throws 422 on invalid transition', async () => {
    const tx = {
      report: {
        findUnique: jest.fn().mockResolvedValue({ status: ReportStatus.SUBMITTED }),
        update: jest.fn(),
      },
      reportStatusHistory: {
        create: jest.fn(),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(
      async (callback: (client: typeof tx) => Promise<void>) => callback(tx),
    );

    await expect(
      service.transition('report-id', ReportStatus.RESOLVED, 'actor-id'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(tx.report.update).not.toHaveBeenCalled();
    expect(tx.reportStatusHistory.create).not.toHaveBeenCalled();
  });
});
