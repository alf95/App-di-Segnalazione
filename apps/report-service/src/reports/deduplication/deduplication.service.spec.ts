import { PrismaService } from '../../prisma/prisma.service';
import { DeduplicationService } from './deduplication.service';

describe('DeduplicationService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
  } as unknown as PrismaService;

  let service: DeduplicationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeduplicationService(prisma);
  });

  it('returns id when PostGIS finds a match', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ id: 'duplicate-id' }]);

    await expect(service.findDuplicate('category-id', 45.46, 9.19)).resolves.toBe('duplicate-id');
  });

  it('returns null when no match exists', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    await expect(service.findDuplicate('category-id', 45.46, 9.19)).resolves.toBeNull();
  });

  it('passes the correct parameters to the query', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    await service.findDuplicate('category-id', 45.46, 9.19);

    const [strings, categoryId, longitude, latitude] = (prisma.$queryRaw as jest.Mock).mock
      .calls[0] as [TemplateStringsArray, string, number, number];

    expect(strings.join('')).toContain('SELECT id FROM reports');
    expect(strings.join('')).toContain('ST_DWithin(location::geography');
    expect(categoryId).toBe('category-id');
    expect(longitude).toBe(9.19);
    expect(latitude).toBe(45.46);
  });
});
