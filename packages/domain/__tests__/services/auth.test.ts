import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../../src/models/user.js';
import * as authService from '../../src/services/auth.js';
import type { AuthConfig } from '../../src/services/auth.js';
import jwt from 'jsonwebtoken';

let mongod: MongoMemoryServer;
const cfg: AuthConfig = {
  jwtAccessSecret: 'test-access-secret-1234567890',
  jwtRefreshSecret: 'test-refresh-secret-1234567890',
  accessExpiresIn: 900,
  refreshExpiresIn: 604800,
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('register', () => {
  it('creates a user and returns tokens', async () => {
    const result = await authService.register(
      { name: 'Test User', email: 'test@example.com', password: 'password123' },
      cfg,
    );

    expect(result.user.name).toBe('Test User');
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.role).toBe('CITIZEN');
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();

    // Verify the password is hashed with argon2id
    const dbUser = await User.findById(result.user._id).select('+passwordHash');
    expect(dbUser!.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('normalizes email to lowercase', async () => {
    const result = await authService.register(
      { name: 'Test', email: 'Test@EXAMPLE.com', password: 'password123' },
      cfg,
    );
    expect(result.user.email).toBe('test@example.com');
  });

  it('rejects duplicate email', async () => {
    await authService.register(
      { name: 'First', email: 'dup@example.com', password: 'password123' },
      cfg,
    );

    await expect(
      authService.register(
        { name: 'Second', email: 'dup@example.com', password: 'password456' },
        cfg,
      ),
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      statusCode: 409,
    });
  });
});

describe('login', () => {
  beforeEach(async () => {
    await authService.register(
      { name: 'Existing', email: 'existing@example.com', password: 'correctpassword' },
      cfg,
    );
  });

  it('returns tokens for valid credentials', async () => {
    const result = await authService.login(
      { email: 'existing@example.com', password: 'correctpassword' },
      cfg,
    );
    expect(result.user.email).toBe('existing@example.com');
    expect(result.tokens.accessToken).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    await expect(
      authService.login(
        { email: 'existing@example.com', password: 'wrongpassword' },
        cfg,
      ),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  });

  it('rejects non-existent email', async () => {
    await expect(
      authService.login(
        { email: 'nobody@example.com', password: 'whatever' },
        cfg,
      ),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      statusCode: 401,
    });
  });
});

describe('verifyAccess', () => {
  it('decodes a valid token', async () => {
    const { tokens, user } = await authService.register(
      { name: 'Verify', email: 'verify@example.com', password: 'password123' },
      cfg,
    );
    const payload = authService.verifyAccess(tokens.accessToken, cfg.jwtAccessSecret);
    expect(payload.sub).toBe(user._id.toString());
    expect(payload.role).toBe('CITIZEN');
  });

  it('rejects an expired token', () => {
    const token = jwt.sign({ sub: 'fake', role: 'CITIZEN' }, cfg.jwtAccessSecret, {
      expiresIn: '0s',
    });
    expect(() => authService.verifyAccess(token, cfg.jwtAccessSecret)).toThrow('Token expired');
  });

  it('rejects a tampered token', () => {
    expect(() => authService.verifyAccess('invalid.token.here', cfg.jwtAccessSecret)).toThrow(
      'Invalid token',
    );
  });
});

describe('token rotation and reuse detection', () => {
  it('refresh rotates the token family', async () => {
    const { tokens: firstTokens } = await authService.register(
      { name: 'Rotate', email: 'rotate@example.com', password: 'password123' },
      cfg,
    );

    const { tokens: secondTokens } = await authService.refresh(firstTokens.refreshToken, cfg);
    expect(secondTokens.accessToken).not.toBe(firstTokens.accessToken);
    expect(secondTokens.refreshToken).not.toBe(firstTokens.refreshToken);

    // Second refresh with new token works
    const { tokens: thirdTokens } = await authService.refresh(secondTokens.refreshToken, cfg);
    expect(thirdTokens.accessToken).toBeTruthy();
  });

  it('reuse of an old refresh token revokes all sessions', async () => {
    const { tokens: firstTokens } = await authService.register(
      { name: 'Reuse', email: 'reuse@example.com', password: 'password123' },
      cfg,
    );

    // Rotate once - firstTokens.refreshToken is now stale
    await authService.refresh(firstTokens.refreshToken, cfg);

    // Reuse the old token - should detect the reuse and revoke
    await expect(
      authService.refresh(firstTokens.refreshToken, cfg),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: expect.stringContaining('reuse'),
    });

    // Verify the user's session is fully revoked
    const user = await User.findOne({ email: 'reuse@example.com' }).select(
      '+refreshTokenFamily',
    );
    expect(user!.refreshTokenFamily).toBeUndefined();
  });
});

describe('logout', () => {
  it('clears the refresh token family', async () => {
    const { user } = await authService.register(
      { name: 'Logout', email: 'logout@example.com', password: 'password123' },
      cfg,
    );

    await authService.logout(user._id.toString());

    const dbUser = await User.findById(user._id).select('+refreshTokenFamily');
    expect(dbUser!.refreshTokenFamily).toBeUndefined();
  });
});
