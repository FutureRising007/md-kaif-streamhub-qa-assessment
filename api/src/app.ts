import express from 'express';
import { errorHandler, notFoundHandler } from './lib/errors';
import { channelsRouter } from './routes/channels';
import { videosRouter } from './routes/videos';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/videos', videosRouter);
  app.use('/api/channels', channelsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
