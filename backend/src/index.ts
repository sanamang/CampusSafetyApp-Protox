import express from 'express';
import http from 'http';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth';
import alertRoutes from './routes/alerts';
import userRoutes from './routes/users';
import officerRoutes from './routes/officers';
import mapRoutes from './routes/map';
import { initSocket } from './socket';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:3001', 'http://127.0.0.1:5500', 'null'],
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/map', mapRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

initSocket(server);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Campus Safety backend running on port ${PORT}`);
});

export { server };
