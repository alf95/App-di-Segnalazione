import { Injectable } from '@nestjs/common';
import { PriorityLevel } from '@prisma/client';

interface PriorityScoreParams {
  categoryWeight: number;
  confirmations: number;
  locationRisk: number;
  hasMedia: boolean;
  ageHours: number;
}

@Injectable()
export class PriorityCalculatorService {
  calculateScore(params: PriorityScoreParams): number {
    const confirmationsScore = Math.min(params.confirmations * 5, 30);
    const mediaScore = params.hasMedia ? 5 : 0;
    const ageScore = Math.min(Math.floor(params.ageHours / 24) * 2, 20);

    return (
      params.categoryWeight * 10 +
      confirmationsScore +
      params.locationRisk * 15 +
      mediaScore +
      ageScore
    );
  }

  getPriorityLevel(score: number): PriorityLevel {
    if (score >= 70) {
      return PriorityLevel.CRITICAL;
    }

    if (score >= 45) {
      return PriorityLevel.HIGH;
    }

    if (score >= 20) {
      return PriorityLevel.NORMAL;
    }

    return PriorityLevel.LOW;
  }
}
