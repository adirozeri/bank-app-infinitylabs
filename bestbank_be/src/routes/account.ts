import { Router } from 'express';
import { User } from '../models/user.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.get('/me', verifyToken, async (req, res) => {
    const email = (req as any).user.email;

    const user = await User.findOne({ email });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    res.status(200).json({
        email: user.email,
        phone: user.phone,
        balance: user.balance
    });
});

router.delete('/me', verifyToken, async (req, res) => {
    const email = (req as any).user.email;

    const result = await User.deleteOne({ email });
    if (result.deletedCount === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    res.status(200).json({ message: 'User deleted successfully' });
});

export { router as accountRouter };