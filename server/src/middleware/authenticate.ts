import type { NextFunction, Request, Response } from 'express';
import { adminAuth } from '../services/firebaseAdmin';

export type AuthedLocals = { uid: string };

/** Valida o Firebase ID Token enviado em "Authorization: Bearer <token>". */
export async function authenticate(req: Request, res: Response<unknown, AuthedLocals>, next: NextFunction) {
  const header = req.header('authorization') ?? '';
  const match = /^Bearer (.+)$/.exec(header);
  if (!match) {
    res.status(401).json({ error: 'missing_token' });
    return;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(match[1], true);
    res.locals.uid = decoded.uid;
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}
