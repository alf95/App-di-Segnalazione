import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeduplicationService {
  constructor(private readonly prisma: PrismaService) {}

  async findDuplicate(
    categoryId: string,
    latitude: number,
    longitude: number,
  ): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM reports
      WHERE category_id = ${categoryId}
        AND status NOT IN ('REJECTED', 'DUPLICATE', 'RESOLVED')
        AND created_at > NOW() - INTERVAL '30 days'
        AND ST_DWithin(location::geography, ST_MakePoint(${longitude}, ${latitude})::geography, 50)
      ORDER BY confirmations_count DESC
      LIMIT 1;
    `;

    return rows[0]?.id ?? null;
  }
}
