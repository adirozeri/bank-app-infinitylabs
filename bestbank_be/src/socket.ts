import { Server, Socket } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { parse as parseCookies } from 'cookie';
import { SECRET } from './middleware/auth.js';

export interface TransferNotificationPayload {
  senderEmail: string;
  amount: number;
}

const userSockets = new Map<string, Socket>();

export function initSocket(httpServer: HttpServer): void {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const cookies = parseCookies(socket.handshake.headers.cookie ?? '');
    const token = cookies['token'];
    if (!token) return next(new Error('Not authenticated'));
    jwt.verify(token, SECRET, (err, decoded) => {
      if (err || !decoded || typeof decoded === 'string')
        return next(new Error('Invalid token'));
      (socket as any).userEmail = (decoded as { email: string }).email;
      next();
    });
  });

  io.on('connection', (socket: Socket) => {
    const email: string = (socket as any).userEmail;
    userSockets.set(email, socket);
    console.log(`[socket] connected: ${email}`);
    socket.on('disconnect', () => {
      if (userSockets.get(email) === socket) userSockets.delete(email);
      console.log(`[socket] disconnected: ${email}`);
    });
  });
}

export function notifyUser(email: string, payload: TransferNotificationPayload): void {
  const socket = userSockets.get(email);
  if (socket?.connected) socket.emit('transfer:received', payload);
}
