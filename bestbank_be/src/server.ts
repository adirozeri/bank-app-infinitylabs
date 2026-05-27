import express from 'express';
import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { authRouter } from './routes/auth.js';
import { accountRouter } from './routes/account.js';
import { transactionsRouter } from './routes/transactions.js';
import { chatRouter } from './routes/chat.js';
import { initSocket } from './socket.js';

dotenv.config();
console.log('MONGO_URI:', process.env.MONGO_URI);

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI ?? '';

const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(cookieParser());
app.use('/api/account', accountRouter);
app.use('/api/auth', authRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/chat', chatRouter);

const publicDir = join(__dirname, '../../public');
app.use(express.static(publicDir));
app.get('*', (_req, res) => res.sendFile(join(publicDir, 'index.html')));

const httpServer = createServer(app);
initSocket(httpServer);

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('Connected to MongoDB');
        httpServer.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Failed to connect to MongoDB:', err);
    });
