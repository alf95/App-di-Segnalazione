import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer } from 'kafkajs';

export type ReportEventTopic =
  | 'report.created'
  | 'report.status_changed'
  | 'report.confirmed'
  | 'media.processed';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly producer: Producer;
  private isConnected = false;

  constructor(configService: ConfigService) {
    const brokers = configService
      .get<string>('KAFKA_BROKERS', 'localhost:9092')
      .split(',')
      .map((broker) => broker.trim())
      .filter((broker) => broker.length > 0);

    const kafka = new Kafka({
      clientId: 'report-service',
      brokers
    });

    this.producer = kafka.producer();
  }

  async emit(topic: ReportEventTopic | string, payload: unknown): Promise<void> {
    try {
      await this.ensureConnected();
      await this.producer.send({
        topic,
        messages: [
          {
            value: JSON.stringify(payload)
          }
        ]
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown Kafka producer error';
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Failed to emit "${topic}" event: ${message}`, stack);
    }
  }

  private async ensureConnected(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    await this.producer.connect();
    this.isConnected = true;
  }
}
