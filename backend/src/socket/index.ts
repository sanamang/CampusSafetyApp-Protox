import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { query } from '../db';

let io: SocketServer;

export function initSocket(server: HttpServer) {
  io = new SocketServer(server, {
    cors: { origin: '*', credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Not authenticated'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {
        id: string; role: string; email: string;
      };
      (socket as Socket & { user: typeof payload }).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as Socket & { user: { id: string; role: string } }).user;

    if (user.role === 'admin') socket.join('admins');
    if (user.role === 'officer') socket.join('officers');
    if (user.role === 'student') socket.join(`student:${user.id}`);

    // Student subscribes to their active alert room
    socket.on('subscribe:alert', (alertId: string) => {
      socket.join(`alert:${alertId}`);
    });

    // Officer broadcasts GPS every 10s
    socket.on('officer-location', async (data: { latitude: number; longitude: number }) => {
      if (user.role !== 'officer' && user.role !== 'admin') return;
      try {
        await query(
          `INSERT INTO officer_locations (officer_id, latitude, longitude, last_updated)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (officer_id) DO UPDATE
             SET latitude = EXCLUDED.latitude,
                 longitude = EXCLUDED.longitude,
                 last_updated = NOW()`,
          [user.id, data.latitude, data.longitude]
        );
        io.to('admins').emit('officer:location', { officer_id: user.id, ...data });
        io.to('students').emit('officer:location', { officer_id: user.id, ...data });
      } catch { /* silent */ }
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
