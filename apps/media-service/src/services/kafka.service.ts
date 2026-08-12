import { Consumer, Kafka, Producer } from 'kafkajs';

const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
  .split(',')
  .map((broker) => broker.trim())
  .filter(Boolean);

const kafka = new Kafka({
  clientId: 'media-service',
  brokers,
});

export class KafkaService {
  private producer: Producer | null = null;

  private readonly consumers = new Map<string, Consumer>();

  private async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = kafka.producer();
      await this.producer.connect();
    }

    return this.producer;
  }

  async emit(topic: string, payload: unknown): Promise<void> {
    const producer = await this.getProducer();
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(payload) }],
    });
  }

  async consume(
    topic: string,
    groupId: string,
    handler: (payload: unknown) => Promise<void>,
  ): Promise<void> {
    const existingConsumer = this.consumers.get(groupId);
    const consumer = existingConsumer ?? kafka.consumer({ groupId });

    if (!existingConsumer) {
      await consumer.connect();
      this.consumers.set(groupId, consumer);
    }

    await consumer.subscribe({ topic, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) {
          return;
        }

        const parsedPayload = JSON.parse(message.value.toString('utf-8')) as unknown;
        await handler(parsedPayload);
      },
    });
  }
}

export const kafkaService = new KafkaService();
