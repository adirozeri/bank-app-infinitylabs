import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const SECRET = 'adirsecret';

const verifyToken = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.cookies?.token;

    if (!token) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    jwt.verify(token, SECRET, (err: any, decoded: any) => {
        if (err) {
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }
        (req as any).user = decoded;
        next();
    });
};

export { verifyToken, SECRET };
