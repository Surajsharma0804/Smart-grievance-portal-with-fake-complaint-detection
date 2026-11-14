import { Router, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import { registerSchema, loginSchema } from '@nagrik-setu/shared';
import { authService } from '@nagrik-setu/domain';
import { getConfig } from '../config';

export const authRouter = Router();

authRouter.use(cookieParser());

function authCfg() {
  const c = getConfig();
  return {
    jwtAccessSecret: c.JWT_ACCESS_SECRET,
    jwtRefreshSecret: c.JWT_REFRESH_SECRET,
  };
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: false, // overridden below for production
  sameSite: 'lax' as const,
  path: '/',
};

function setCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  const secure = getConfig().NODE_ENV === 'production';
  res.cookie('accessToken', tokens.accessToken, {
    ...COOKIE_OPTS,
    secure,
    maxAge: 15 * 60 * 1000, // 15 min
  });
  res.cookie('refreshToken', tokens.refreshToken, {
    ...COOKIE_OPTS,
    secure,
    path: '/auth/refresh',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearCookies(res: Response) {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/auth/refresh' });
}

authRouter.post('/auth/register', async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const { user, tokens } = await authService.register(input, authCfg());
  setCookies(res, tokens);
  res.status(201).json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

authRouter.post('/auth/login', async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const { user, tokens } = await authService.login(input, authCfg());
  setCookies(res, tokens);
  res.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

authRouter.post('/auth/refresh', cookieParser(), async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'No refresh token' } });
    return;
  }
  const { user, tokens } = await authService.refresh(token, authCfg());
  setCookies(res, tokens);
  res.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

authRouter.post('/auth/logout', cookieParser(), async (req: Request, res: Response) => {
  const accessToken = req.cookies?.accessToken;
  if (accessToken) {
    try {
      const payload = authService.verifyAccess(accessToken, getConfig().JWT_ACCESS_SECRET);
      await authService.logout(payload.sub);
    } catch {
      // Logout even if the token is expired or invalid
    }
  }
  clearCookies(res);
  res.json({ ok: true });
});

authRouter.get('/auth/me', cookieParser(), async (req: Request, res: Response) => {
  const token = req.cookies?.accessToken;
  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    return;
  }
  const payload = authService.verifyAccess(token, getConfig().JWT_ACCESS_SECRET);
  const { User } = await import('@nagrik-setu/domain');
  const user = await User.findById(payload.sub);
  if (!user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'User not found' } });
    return;
  }
  res.json({
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});
