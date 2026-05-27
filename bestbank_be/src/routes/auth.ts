import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.js';
import { Otp } from '../models/otps.js';
import { SECRET } from '../middleware/auth.js';
import { sendVerificationEmail } from '../utils/mailer.js';

const router = Router();
const SALT_ROUNDS = 10;

const COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

function getOtpExpiry(): Date {
    const minutes = parseInt(process.env.OTP_EXPIRY_MINUTES ?? '10');
    return new Date(Date.now() + minutes * 60 * 1000);
}

function generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function saveOtp(email: string, otp: string): Promise<void> {
    await Otp.findOneAndUpdate(
        { email },
        { otp, createdAt: new Date(), expiresAt: getOtpExpiry() },
        { upsert: true }
    );
}

router.post('/register', async (req, res) => {
    const { email, password, phone } = req.body;

    if (!email || !password || !phone) {
        res.status(400).json({ error: 'All fields are required' });
        return;
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        if (existingUser.isVerified) {
            res.status(400).json({ error: 'Email already registered' });
            return;
        }

        const otpRecord = await Otp.findOne({ email });
        const expired = !otpRecord || otpRecord.expiresAt <= new Date();
        if (!expired) {
            res.status(400).json({ error: 'User not verified yet. Check mail for verification.' });
            return;
        }

        const otp = generateOtp();
        await saveOtp(email, otp);
        await sendVerificationEmail(email, otp);
        res.status(400).json({ error: 'Verification time expired. New verification sent.' });
        return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const otp = generateOtp();
    const balance = Math.floor(1000 + Math.random() * 9000);

    await User.create({ email, password: hashedPassword, phone, balance, isVerified: false });
    await saveOtp(email, otp);
    await sendVerificationEmail(email, otp);
    res.status(201).json({ message: 'User created. Check your email to verify your account.' });
});

router.get('/verify', async (req, res) => {
    const { email, otp } = req.query as { email: string; otp: string };

    const user = await User.findOne({ email });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    const otpRecord = await Otp.findOne({ email });
    const expired = !otpRecord || otpRecord.expiresAt <= new Date();
    if (expired) {
        const newOtp = generateOtp();
        await saveOtp(email, newOtp);
        await sendVerificationEmail(email, newOtp);
        res.status(400).json({ error: 'Verification expired. New verification sent.' });
        return;
    }

    if (otpRecord.otp !== otp) {
        res.status(400).json({ error: 'Incorrect OTP' });
        return;
    }

    user.isVerified = true;
    await user.save();
    await Otp.deleteOne({ email }); // @TODO handle multiple otps after 

    const token = jwt.sign({ email: user.email }, SECRET, { expiresIn: '7d' });                  
    res.cookie('token', token, COOKIE_OPTS);
    res.status(200).json({ message: 'Account verified successfully' });
});

router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
    }

    const otpRecord = await Otp.findOne({ email });
    const expired = !otpRecord || otpRecord.expiresAt <= new Date();
    if (expired) {
        const newOtp = generateOtp();
        await saveOtp(email, newOtp);
        await sendVerificationEmail(email, newOtp);
        res.status(400).json({ error: 'Verification expired. New verification sent.' });
        return;
    }

    if (otpRecord.otp !== otp) {
        res.status(400).json({ error: 'Incorrect OTP' });
        return;
    }

    user.isVerified = true;
    await user.save();
    await Otp.deleteOne({ email });

    const token = jwt.sign({ email: user.email }, SECRET, { expiresIn: '7d' });                  
    res.cookie('token', token, COOKIE_OPTS);
    res.status(200).json({ message: 'Verified' });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    if (!user.isVerified) {
        res.status(403).json({ error: 'Please verify your account first' });
        return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
    }

    const token = jwt.sign({ email: user.email }, SECRET, { expiresIn: '7d' });                  
    res.cookie('token', token, COOKIE_OPTS);
    res.status(200).json({ message: 'Login successful' });
});

router.post('/logout', (_req, res) => {
    res.clearCookie('token');
    res.status(200).json({ message: 'Logged out successfully' });
});

router.get('/debug-otp/:email', async (req, res) => {
    const otpRecord = await Otp.findOne({ email: req.params.email });
    if (!otpRecord) {
        res.status(404).json({ error: 'OTP not found' });
        return;
    }
    res.status(200).json({ otp: otpRecord.otp });
});

router.post('/debug-expire-otp/:email', async (req, res) => {
    const result = await Otp.findOneAndUpdate({ email: req.params.email }, { expiresAt: new Date(0) });
    if (!result) {
        res.status(404).json({ error: 'OTP not found' });
        return;
    }
    res.status(200).json({ message: 'OTP expired successfully' });
});

router.delete('/debug-delete/:email', async (req, res) => {
    const result = await User.deleteOne({ email: req.params.email });
    if (result.deletedCount === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
    }
    await Otp.deleteOne({ email: req.params.email });
    res.status(200).json({ message: 'User deleted successfully' });
});

export { router as authRouter };
