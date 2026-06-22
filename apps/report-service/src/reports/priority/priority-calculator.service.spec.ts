import { PriorityLevel } from '@prisma/client';
import { PriorityCalculatorService } from './priority-calculator.service';

describe('PriorityCalculatorService', () => {
  const service = new PriorityCalculatorService();

  describe('calculateScore', () => {
    it('adds category weight contribution', () => {
      expect(
        service.calculateScore({
          categoryWeight: 4,
          confirmations: 0,
          locationRisk: 0,
          hasMedia: false,
          ageHours: 0
        })
      ).toBe(40);
    });

    it('adds confirmation contribution', () => {
      expect(
        service.calculateScore({
          categoryWeight: 0,
          confirmations: 3,
          locationRisk: 0,
          hasMedia: false,
          ageHours: 0
        })
      ).toBe(15);
    });

    it('adds location risk contribution', () => {
      expect(
        service.calculateScore({
          categoryWeight: 0,
          confirmations: 0,
          locationRisk: 2,
          hasMedia: false,
          ageHours: 0
        })
      ).toBe(30);
    });

    it('adds media contribution', () => {
      expect(
        service.calculateScore({
          categoryWeight: 0,
          confirmations: 0,
          locationRisk: 0,
          hasMedia: true,
          ageHours: 0
        })
      ).toBe(5);
    });

    it('adds age contribution', () => {
      expect(
        service.calculateScore({
          categoryWeight: 0,
          confirmations: 0,
          locationRisk: 0,
          hasMedia: false,
          ageHours: 48
        })
      ).toBe(4);
    });

    it('caps confirmation contribution at 30', () => {
      expect(
        service.calculateScore({
          categoryWeight: 0,
          confirmations: 10,
          locationRisk: 0,
          hasMedia: false,
          ageHours: 0
        })
      ).toBe(30);
    });

    it('caps age contribution at 20', () => {
      expect(
        service.calculateScore({
          categoryWeight: 0,
          confirmations: 0,
          locationRisk: 0,
          hasMedia: false,
          ageHours: 24 * 25
        })
      ).toBe(20);
    });

    it('handles zero values', () => {
      expect(
        service.calculateScore({
          categoryWeight: 0,
          confirmations: 0,
          locationRisk: 0,
          hasMedia: false,
          ageHours: 0
        })
      ).toBe(0);
    });

    it('handles maxed-out values', () => {
      expect(
        service.calculateScore({
          categoryWeight: 5,
          confirmations: 100,
          locationRisk: 2,
          hasMedia: true,
          ageHours: 24 * 100
        })
      ).toBe(135);
    });
  });

  describe('getPriorityLevel', () => {
    it.each([
      [19, PriorityLevel.LOW],
      [20, PriorityLevel.NORMAL],
      [44, PriorityLevel.NORMAL],
      [45, PriorityLevel.HIGH],
      [69, PriorityLevel.HIGH],
      [70, PriorityLevel.CRITICAL]
    ])('returns %s -> %s', (score, expected) => {
      expect(service.getPriorityLevel(score)).toBe(expected);
    });
  });
});
