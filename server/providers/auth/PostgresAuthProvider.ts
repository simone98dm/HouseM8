/**
 * PostgreSQL Authentication Provider Implementation
 * Uses JWT tokens for session management instead of Supabase auth
 */

import type { Pool } from 'pg';
import type { H3Event } from 'h3';
import { hash, compare } from 'bcrypt';
import { randomUUID } from 'node:crypto';
import type {
  IAuthProvider,
  AuthUser,
  UserCredentials,
  UserRegistrationData,
  EmailVerificationToken,
  EmailConfirmation,
} from './IAuthProvider';
import {
  getUserFromToken,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  refreshAccessToken,
  getRefreshToken,
  verifyToken,
} from '../../utils/jwt';
import { hashToken } from '../../utils/tokens';
import { sendPasswordResetEmail } from '~~/server/emails';
import consola from 'consola';

const SALT_ROUNDS = 12;
const RESEND_COOLDOWN_MINUTES = 15;
const RESET_COOLDOWN_MINUTES = 5;

/**
 * PostgreSQL authentication provider
 * Implements JWT-based authentication with bcrypt password hashing
 */
export class PostgresAuthProvider implements IAuthProvider {
  constructor(private readonly pool: Pool) {}

  async getCurrentUser(event: H3Event): Promise<AuthUser | null> {
    try {
      // Try to get user from access token; if expired, auto-refresh using refresh token
      let tokenPayload = await getUserFromToken(event);

      if (!tokenPayload) {
        const newAccessToken = await refreshAccessToken(event);
        if (!newAccessToken) return null;
        tokenPayload = await verifyToken(newAccessToken, 'access');
        if (!tokenPayload) return null;
      }

      // Fetch full user data from database
      const result = await this.pool.query(
        `SELECT id, email, email_confirmed_at, created_at 
         FROM users 
         WHERE id = $1`,
        [tokenPayload.userId],
      );

      if (result.rows.length === 0) return null;

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
      };
    } catch (error) {
      consola.error('PostgresAuthProvider.getCurrentUser error:', error);
      return null;
    }
  }

  async signIn(credentials: UserCredentials): Promise<AuthUser | null> {
    try {
      // Query user by email
      const result = await this.pool.query(
        `SELECT id, email, password_hash, email_confirmed_at, created_at 
         FROM users 
         WHERE email = $1`,
        [credentials.email],
      );

      if (result.rows.length === 0) return null;

      const user = result.rows[0];

      // Verify password
      const isPasswordValid = await compare(
        credentials.password,
        user.password_hash,
      );
      if (!isPasswordValid) return null;

      // Enforce email verification before allowing sign-in
      if (!user.email_confirmed_at) {
        throw new Error('EMAIL_NOT_CONFIRMED');
      }

      return {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
      };
    } catch (error) {
      consola.error('PostgresAuthProvider.signIn error:', error);
      return null;
    }
  }

  async signInWithEvent(
    event: H3Event,
    credentials: UserCredentials,
  ): Promise<AuthUser | null> {
    try {
      // Use regular signIn to validate credentials
      const user = await this.signIn(credentials);
      if (!user) return null;

      // Generate and set JWT tokens in cookies
      await this.generateAuthTokens(
        event,
        user.id,
        user.email,
        credentials.rememberMe ?? false,
      );

      return user;
    } catch (error) {
      // Re-throw EMAIL_NOT_CONFIRMED so the API layer can return a 403
      if (error instanceof Error && error.message === 'EMAIL_NOT_CONFIRMED') {
        throw error;
      }
      consola.error('PostgresAuthProvider.signInWithEvent error:', error);
      return null;
    }
  }

  async signUpEmailOnly(email: string): Promise<AuthUser | null> {
    try {
      const existingUser = await this.pool.query(
        `SELECT id FROM users WHERE email = $1`,
        [email],
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email already exists');
      }

      const result = await this.pool.query(
        `INSERT INTO users (id, email, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())
         RETURNING id, email, email_confirmed_at, created_at`,
        [randomUUID(), email],
      );

      if (result.rows.length === 0) return null;

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
      };
    } catch (error) {
      consola.error('PostgresAuthProvider.signUpEmailOnly error:', error);
      return null;
    }
  }

  /**
   * An unconfirmed account that is due a fresh verification link. Returns null
   * while a link was issued in the last RESEND_COOLDOWN_MINUTES, so repeated
   * sign-up requests cannot flood one inbox.
   */
  async getUnconfirmedUserByEmail(email: string): Promise<AuthUser | null> {
    try {
      const result = await this.pool.query(
        `SELECT id, email, email_confirmed_at, created_at
         FROM users u
         WHERE u.email = $1 AND u.email_confirmed_at IS NULL
           AND NOT EXISTS (
             SELECT 1 FROM email_verification_tokens t
             WHERE t.user_id = u.id
               AND t.created_at > NOW() - INTERVAL '${RESEND_COOLDOWN_MINUTES} minutes'
           )`,
        [email],
      );
      return result.rows[0] ?? null;
    } catch (error) {
      consola.error(
        'PostgresAuthProvider.getUnconfirmedUserByEmail error:',
        error,
      );
      return null;
    }
  }

  async verifyPassword(
    userId: string,
    password: string,
  ): Promise<'valid' | 'invalid' | 'no_password'> {
    try {
      const result = await this.pool.query(
        `SELECT password_hash FROM users WHERE id = $1`,
        [userId],
      );
      const passwordHash = result.rows[0]?.password_hash;
      if (!passwordHash) return 'no_password';
      return (await compare(password, passwordHash)) ? 'valid' : 'invalid';
    } catch (error) {
      consola.error('PostgresAuthProvider.verifyPassword error:', error);
      return 'invalid';
    }
  }

  async confirmEmailVerificationToken(
    token: string,
    password?: string,
  ): Promise<EmailConfirmation | 'password_required' | null> {
    const tokenHash = hashToken(token);
    // bcrypt is slow: hash before BEGIN so the row lock is held briefly.
    const passwordHash = password ? await hash(password, SALT_ROUNDS) : null;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const tokenResult = await client.query(
        `SELECT user_id, email
         FROM email_verification_tokens
         WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
        [tokenHash],
      );

      if (tokenResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return null;
      }

      const { user_id, email } = tokenResult.rows[0];

      const currentResult = await client.query(
        `SELECT email, password_hash IS NOT NULL AS has_password
         FROM users WHERE id = $1 FOR UPDATE`,
        [user_id],
      );
      const currentEmail: string = currentResult.rows[0]?.email ?? '';
      const hasPassword = currentResult.rows[0]?.has_password === true;
      const isEmailChange = currentEmail.toLowerCase() !== email.toLowerCase();

      // A sign-up without a password would leave an account nobody can sign
      // back in to. Ask for one first; the token is not consumed.
      const needsPassword = !isEmailChange && !hasPassword;
      if (needsPassword && !passwordHash) {
        await client.query('ROLLBACK');
        return 'password_required';
      }
      if (needsPassword) {
        await client.query(
          `UPDATE users SET password_hash = $2 WHERE id = $1`,
          [user_id, passwordHash],
        );
      }

      await client.query(
        `UPDATE users
         SET email_confirmed_at = NOW(), email = $2, updated_at = NOW()
         WHERE id = $1`,
        [user_id, email],
      );

      if (isEmailChange) {
        // The sign-in identity changed: end every session and void any other
        // pending link, so nothing issued for the old address stays usable.
        await client.query(
          'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
          [user_id],
        );
        await client.query(
          `DELETE FROM email_verification_tokens
           WHERE user_id = $1 AND used_at IS NULL AND token <> $2`,
          [user_id, tokenHash],
        );
      }

      await client.query(
        `UPDATE email_verification_tokens SET used_at = NOW() WHERE token = $1`,
        [tokenHash],
      );

      await client.query('COMMIT');
      return {
        userId: user_id,
        email,
        isEmailChange,
        passwordSet: needsPassword,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      consola.error(
        'PostgresAuthProvider.confirmEmailVerificationToken error:',
        error,
      );
      return null;
    } finally {
      client.release();
    }
  }

  async signUp(data: UserRegistrationData): Promise<AuthUser | null> {
    try {
      // Check if user already exists
      const existingUser = await this.pool.query(
        `SELECT id FROM users WHERE email = $1`,
        [data.email],
      );

      if (existingUser.rows.length > 0) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await hash(data.password, SALT_ROUNDS);

      // Insert user into database
      const result = await this.pool.query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING id, email, email_confirmed_at, created_at`,
        [randomUUID(), data.email, passwordHash, data.firstName, data.lastName],
      );

      if (result.rows.length === 0) return null;

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
      };
    } catch (error) {
      consola.error('PostgresAuthProvider.signUp error:', error);
      return null;
    }
  }

  async signOut(event: H3Event): Promise<void> {
    try {
      // The access token may have expired; fall back to the refresh cookie
      let userId = (await getUserFromToken(event))?.userId;
      if (!userId) {
        const refreshToken = getRefreshToken(event);
        userId = refreshToken
          ? (await verifyToken(refreshToken, 'refresh'))?.userId
          : undefined;
      }
      if (userId) {
        await this.pool.query(
          'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
          [userId],
        );
      }
      clearAuthCookies(event);
    } catch (error) {
      consola.error('PostgresAuthProvider.signOut error:', error);
    }
  }

  async createEmailVerificationToken(
    userId: string,
    email: string,
  ): Promise<EmailVerificationToken | null> {
    try {
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours expiration

      const result = await this.pool.query(
        `INSERT INTO email_verification_tokens (id, user_id, token, email, expires_at, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id, user_id, token, email, expires_at, created_at`,
        [randomUUID(), userId, hashToken(token), email, expiresAt],
      );

      if (result.rows.length === 0) return null;

      const tokenData = result.rows[0];
      return {
        // Only the hash is stored; callers need the raw token for the link
        token,
        user_id: tokenData.user_id,
        email: tokenData.email,
        expires_at: tokenData.expires_at,
        created_at: tokenData.created_at,
      };
    } catch (error) {
      consola.error(
        'PostgresAuthProvider.createEmailVerificationToken error:',
        error,
      );
      return null;
    }
  }

  async verifyEmail(token: string): Promise<boolean> {
    // Delegate to confirmEmailVerificationToken; return boolean for backward compat
    return (await this.confirmEmailVerificationToken(token)) !== null;
  }

  async getUserById(userId: string): Promise<AuthUser | null> {
    try {
      const result = await this.pool.query(
        `SELECT id, email, email_confirmed_at, created_at 
         FROM users 
         WHERE id = $1`,
        [userId],
      );

      if (result.rows.length === 0) return null;

      const user = result.rows[0];
      return {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at,
        created_at: user.created_at,
      };
    } catch (error) {
      consola.error('PostgresAuthProvider.getUserById error:', error);
      return null;
    }
  }

  async updateUserEmail(userId: string, newEmail: string): Promise<boolean> {
    try {
      // Update email and reset email_confirmed_at
      const result = await this.pool.query(
        `UPDATE users 
         SET email = $2, email_confirmed_at = NULL, updated_at = NOW()
         WHERE id = $1`,
        [userId, newEmail],
      );

      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      consola.error('PostgresAuthProvider.updateUserEmail error:', error);
      return false;
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      // Hard delete user (since deleted_at column doesn't exist)
      const result = await this.pool.query(`DELETE FROM users WHERE id = $1`, [
        userId,
      ]);

      return result.rowCount !== null && result.rowCount > 0;
    } catch (error) {
      consola.error('PostgresAuthProvider.deleteUser error:', error);
      return false;
    }
  }

  async sendPasswordReset(email: string): Promise<boolean> {
    try {
      // Find user by email
      const userResult = await this.pool.query(
        `SELECT id, first_name, last_name FROM users WHERE email = $1`,
        [email],
      );

      if (userResult.rows.length === 0) {
        // Return true even if user not found (security best practice)
        return true;
      }

      const user = userResult.rows[0];
      const userId = user.id;

      // One reset email per address per cooldown; the caller still gets the
      // same generic answer.
      const recent = await this.pool.query(
        `SELECT 1 FROM password_reset_tokens
         WHERE user_id = $1
           AND created_at > NOW() - INTERVAL '${RESET_COOLDOWN_MINUTES} minutes'
         LIMIT 1`,
        [userId],
      );
      if (recent.rows.length > 0) return true;

      const userName =
        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
        email.split('@')[0] ||
        'User';
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration

      // Insert password reset token
      await this.pool.query(
        `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [randomUUID(), userId, hashToken(token), expiresAt],
      );

      // Send password reset email
      const baseUrl = String(useRuntimeConfig().public.baseUrl);
      const resetLink = `${baseUrl}/auth/password-reset?token=${token}`;

      const emailResult = await sendPasswordResetEmail({
        email,
        userName,
        resetLink,
      });

      if (!emailResult.success) {
        consola.error(
          'Failed to send password reset email:',
          emailResult.error,
        );
        // Still return true for security (don't reveal if email exists)
      }

      return true;
    } catch (error) {
      consola.error('PostgresAuthProvider.sendPasswordReset error:', error);
      return false;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const tokenHash = hashToken(token);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Find valid token
      const tokenResult = await client.query(
        `SELECT user_id 
         FROM password_reset_tokens 
         WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
        [tokenHash],
      );

      if (tokenResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      const userId = tokenResult.rows[0].user_id;

      // Hash new password
      const passwordHash = await hash(newPassword, SALT_ROUNDS);

      // Update user's password
      await client.query(
        `UPDATE users 
         SET password_hash = $2, updated_at = NOW()
         WHERE id = $1`,
        [userId, passwordHash],
      );

      // Mark token as used
      await client.query(
        `UPDATE password_reset_tokens
         SET used_at = NOW()
         WHERE token = $1`,
        [tokenHash],
      );

      await client.query(
        'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
        [userId],
      );

      // A reset is how a user recovers a compromised account: a pending
      // email-change link requested by the intruder must not outlive it.
      await client.query(
        'DELETE FROM email_verification_tokens WHERE user_id = $1 AND used_at IS NULL',
        [userId],
      );

      await client.query('COMMIT');

      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      consola.error('PostgresAuthProvider.resetPassword error:', error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Confirm OAuth session with tokens
   */
  async confirmOAuthSession(
    accessToken: string,
    _refreshToken: string,
    _tokenMetadata?: {
      expires_in?: number;
      token_type?: string;
      scope?: string;
      provider?: string;
    },
  ): Promise<{
    user: AuthUser;
    metadata?: Record<string, unknown>;
  } | null> {
    try {
      // For Google OAuth, verify the access token by calling userinfo
      const userInfo = await $fetch<{
        id: string;
        email: string;
        verified_email: boolean;
        name?: string;
        given_name?: string;
        family_name?: string;
        picture?: string;
      }>('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userInfo.email || userInfo.verified_email !== true) {
        return null;
      }

      // Check if user exists in database
      const existingUser = await this.pool.query(
        `SELECT id, email, email_confirmed_at, created_at 
         FROM users 
         WHERE email = $1`,
        [userInfo.email],
      );

      let user: AuthUser;

      if (existingUser.rows.length > 0) {
        // User exists
        user = {
          id: existingUser.rows[0].id,
          email: existingUser.rows[0].email,
          email_confirmed_at: existingUser.rows[0].email_confirmed_at,
          created_at: existingUser.rows[0].created_at,
        };
      } else {
        // Create new user
        const userId = randomUUID();
        const now = new Date().toISOString();

        await this.pool.query(
          `INSERT INTO users (id, email, email_confirmed_at, first_name, last_name, created_at, updated_at, is_first_access)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            userId,
            userInfo.email,
            now,
            userInfo.given_name || '',
            userInfo.family_name || '',
            now,
            now,
            true,
          ],
        );

        user = {
          id: userId,
          email: userInfo.email,
          email_confirmed_at: now,
          created_at: now,
        };
      }

      // Return user and metadata for profile creation
      const metadata: Record<string, unknown> = {
        first_name: userInfo.given_name
          ? String(userInfo.given_name).trim()
          : '',
        last_name: userInfo.family_name
          ? String(userInfo.family_name).trim()
          : '',
        full_name: userInfo.name ? String(userInfo.name).trim() : '',
        picture: userInfo.picture ? String(userInfo.picture).trim() : '',
        provider: 'google',
        is_first_access: existingUser.rows.length === 0, // true for new users, false for existing
      };

      return { user, metadata };
    } catch (error) {
      consola.error('PostgresAuthProvider.confirmOAuthSession error:', error);
      return null;
    }
  }

  /**
   * Helper method to generate and set auth tokens
   */
  async generateAuthTokens(
    event: H3Event,
    userId: string,
    email: string,
    rememberMe: boolean = false,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessToken = await generateAccessToken(userId, email);
    const refreshToken = await generateRefreshToken(userId, email);

    setAuthCookies(event, accessToken, refreshToken, rememberMe);

    return { accessToken, refreshToken };
  }
}
