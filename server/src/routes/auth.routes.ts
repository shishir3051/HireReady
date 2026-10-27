import { Router } from 'express';
import * as c from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { noStore } from '../middleware/cache';
import { authRateLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { forgotPasswordBody, googleStartQuery, loginBody, registerBody, resetPasswordBody } from '../validators/schemas';

export const authRouter = Router();
authRouter.use(noStore);
authRouter.post('/register', authRateLimiter(), validate({ body: registerBody }), c.register);
authRouter.post('/login', authRateLimiter(), validate({ body: loginBody }), c.login);
authRouter.post('/logout', c.logout);
authRouter.get('/me', requireAuth, c.me);
authRouter.get('/providers', c.providers);
authRouter.post('/forgot-password', authRateLimiter(5), validate({ body: forgotPasswordBody }), c.forgotPassword);
authRouter.post('/reset-password', authRateLimiter(), validate({ body: resetPasswordBody }), c.resetPassword);
authRouter.get('/google', authRateLimiter(), validate({ query: googleStartQuery }), c.googleStart);
authRouter.get('/google/callback', authRateLimiter(), c.googleCallback);
