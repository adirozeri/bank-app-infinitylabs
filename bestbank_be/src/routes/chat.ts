import { Router } from 'express';
import { verifyToken } from '../middleware/auth.js';
import { runChatAgent } from '../agent/chatAgent.js';

const router = Router();

router.post('/', verifyToken, async (req, res) => {
    const userEmail = (req as any).user.email;
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim() === '') {
        res.status(400).json({ error: 'question is required' });
        return;
    }

    try {
        const answer = await runChatAgent(question.trim(), userEmail);
        res.json({ answer });
    } catch (err) {
        console.error('Chat agent error:', err);
        res.status(500).json({ error: 'Failed to process your question' });
    }
});

export { router as chatRouter };
