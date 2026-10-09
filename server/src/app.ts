import express from 'express';
import { notificationsRouter } from './routes/notifications';
import { groupsRouter } from './routes/groups';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'chat-firebase-api', time: new Date().toISOString() });
});

app.use('/notifications', notificationsRouter);
app.use('/groups', groupsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`API ouvindo na porta ${port}`);
});
