import { Router } from 'express';
import { User } from '../models/user.js';
import { Transaction } from '../models/transaction.js';
import { verifyToken } from '../middleware/auth.js';
import { notifyUser } from '../socket.js';

const router = Router();

router.get('/', verifyToken, async (req, res) => {
    const email = (req as any).user.email;

    const userTransactions = await Transaction.find({
        $or: [{ senderEmail: email }, { receiverEmail: email }]
    });

    const result = userTransactions.map(t => ({
        counterpartEmail: t.senderEmail === email ? t.receiverEmail : t.senderEmail,
        amount: t.senderEmail === email ? -t.amount : t.amount,
        timestamp: t.timestamp
    }));

    res.status(200).json({ transactions: result });
});

router.post('/', verifyToken, async (req, res) => {
    const senderEmail = (req as any).user.email;
    const { receiverEmail, amount } = req.body;

    if (!receiverEmail || !amount) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }

    if (senderEmail === receiverEmail) {
        res.status(400).json({ error: 'Cannot transfer money to yourself' });
        return;
    }

    const sender = await User.findOne({ email: senderEmail });
    const receiver = await User.findOne({ email: receiverEmail });

    if (!receiver) {
        res.status(400).json({ error: 'Receiver not found' });
        return;
    }

    if (!sender) {
        res.status(400).json({ error: 'Sender not found' });
        return;
    }

    if (sender.balance < amount) {
        res.status(400).json({ error: 'Insufficient balance' });
        return;
    }

    sender.balance -= amount;
    receiver.balance += amount;

    await sender.save();
    await receiver.save();

    await Transaction.create({
        senderEmail,
        receiverEmail,
        amount,
        timestamp: new Date().toISOString()
    });

    res.status(200).json({
        message: 'Transfer successful',
        senderBalance: sender.balance
    });

    notifyUser(receiverEmail, { senderEmail, amount });
});

export { router as transactionsRouter };