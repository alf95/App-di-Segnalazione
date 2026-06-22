import express from 'express';
import { confirmHandler } from './handlers/confirm.handler';
import { initHandler } from './handlers/init.handler';

export const createApp = () => {
  const app = express();

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'media-service',
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/media/init', initHandler);
  app.post('/media/confirm', confirmHandler);

  return app;
};
