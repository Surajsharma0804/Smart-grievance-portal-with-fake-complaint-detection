import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { type RegisterInput, type LoginInput, Errors, type Role } from '@nagrik-setu/shared';
import { User, type IUser } from '../models/user.js';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthConfig {
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  accessExpiresIn?: number; // seconds
  refreshExpiresIn?: number; // seconds
}

const ACCESS_EXPIRES = 900; // 15 minutes
const REFRESH_EXPIRES = 7 * 24 * 3600; // 7 days

function signTokens(user: IUser, cfg: AuthConfig): TokenPair {
  const payload = { sub: user._id.toString(), role: user.role, jti: randomUUID() };
  const accessToken = jwt.sign(payload, cfg.jwtAccessSecret, {
    expiresIn: cfg.accessExpiresIn ?? ACCESS_EXPIRES,
  });
  const refreshToken = jwt.sign(
    { sub: user._id.toString(), family: user.refreshTokenFamily, jti: randomUUID() },
    cfg.jwtRefreshSecret,
    { expiresIn: cfg.refreshExpiresIn ?? REFRESH_EXPIRES },
  );
  return { accessToken, refreshToken };
}

export async function register(
  input: RegisterInput,
  cfg: AuthConfig,
): Promise<{ user: IUser; tokens: TokenPair }> {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) {
    throw Errors.conflict('Email already registered');
  }

  const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
  const family = randomUUID();
  const user = await User.create({
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    refreshTokenFamily: family,
  });

  // Re-fetch with refreshTokenFamily to sign tokens
  user.refreshTokenFamily = family;
  const tokens = signTokens(user, cfg);
  return { user, tokens };
}

export async function login(
  input: LoginInput,
  cfg: AuthConfig,
): Promise<{ user: IUser; tokens: TokenPair }> {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select(
    '+passwordHash +refreshTokenFamily',
  );
  if (!user) {
    throw Errors.unauthorized('Invalid email or password');
  }

  const valid = await argon2.verify(user.passwordHash, input.password);
  if (!valid) {
    throw Errors.unauthorized('Invalid email or password');
  }

  // Rotate token family on each login
  const family = randomUUID();
  user.refreshTokenFamily = family;
  await user.save();

  const tokens = signTokens(user, cfg);
  return { user, tokens };
}

export interface AccessPayload {
  sub: string;
  role: Role;
}

export function verifyAccess(token: string, secret: string): AccessPayload {
  try {
    const decoded = jwt.verify(token, secret) as AccessPayload;
    if (!decoded.sub || !decoded.role) {
      throw Errors.unauthorized('Malformed token');
    }
    return decoded;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw Errors.unauthorized('Token expired');
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw Errors.unauthorized('Invalid token');
    }
    throw err;
  }
}

export async function refresh(
  refreshTokenStr: string,
  cfg: AuthConfig,
): Promise<{ user: IUser; tokens: TokenPair }> {
  let decoded: { sub: string; family: string };
  try {
    decoded = jwt.verify(refreshTokenStr, cfg.jwtRefreshSecret) as {
      sub: string;
      family: string;
    };
  } catch {
    throw Errors.unauthorized('Invalid refresh token');
  }

  const user = await User.findById(decoded.sub).select('+refreshTokenFamily');
  if (!user) {
    throw Errors.unauthorized('User not found');
  }

  // Reuse detection: if the family doesn't match, someone reused an old token.
  // Revoke all sessions for this user.
  if (user.refreshTokenFamily !== decoded.family) {
    user.refreshTokenFamily = undefined;
    await user.save();
    throw Errors.unauthorized('Token reuse detected, all sessions revoked');
  }

  // Rotate family
  const newFamily = randomUUID();
  user.refreshTokenFamily = newFamily;
  await user.save();

  const tokens = signTokens(user, cfg);
  return { user, tokens };
}

export async function logout(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenFamily: 1 } });
}
