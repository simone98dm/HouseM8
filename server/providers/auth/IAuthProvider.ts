import type { H3Event } from 'h3';

/**
 * Authenticated user data
 */
export interface AuthUser {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
  created_at?: string;
}

/**
 * User credentials for sign in
 */
export interface UserCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * User registration data
 */
export interface UserRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Email verification token data
 */
export interface EmailVerificationToken {
  token: string;
  user_id: string;
  email: string;
  expires_at: string;
  created_at: string;
}

export interface EmailConfirmation {
  userId: string;
  email: string;
  /** True when the token moved the account to a different address. */
  isEmailChange: boolean;
  /** True when this confirmation stored the account's first password. */
  passwordSet: boolean;
}

/**
 * Authentication provider interface
 * Abstracts authentication operations for different providers (Supabase, PostgreSQL, etc.)
 */
export interface IAuthProvider {
  /**
   * Sign up a new user with email only (passwordless onboarding)
   * @param email - User email
   * @returns Created user or null. Throws if email already exists.
   */
  signUpEmailOnly(email: string): Promise<AuthUser | null>;

  /**
   * Find an existing account for this email that never confirmed it
   * (email_confirmed_at IS NULL). Used to resend the sign-up link.
   * @returns The unconfirmed user, or null if none / already confirmed
   */
  getUnconfirmedUserByEmail(email: string): Promise<AuthUser | null>;

  /**
   * Check a plain-text password against the user's stored hash.
   * @returns 'no_password' when the account has none (e.g. Google-only)
   */
  verifyPassword(
    userId: string,
    password: string,
  ): Promise<'valid' | 'invalid' | 'no_password'>;

  /**
   * Verify an email-verification token and return the user identity.
   * Marks the token used and sets email_confirmed_at in one transaction.
   * A sign-up whose account has no password yet needs `password`: without it
   * nothing is written and the token stays usable.
   * @param token - Verification token
   * @param password - Initial password, stored in the same transaction
   * @returns User identity, 'password_required', or null if the token is
   * invalid/expired/used
   */
  confirmEmailVerificationToken(
    token: string,
    password?: string,
  ): Promise<EmailConfirmation | 'password_required' | null>;

  /**
   * Get the current authenticated user from the request
   * @param event - H3 event object
   * @returns Authenticated user or null if not authenticated
   */
  getCurrentUser(event: H3Event): Promise<AuthUser | null>;

  /**
   * Sign in a user with email and password
   * @param credentials - User credentials
   * @returns Authenticated user or null if sign in failed
   */
  signIn(credentials: UserCredentials): Promise<AuthUser | null>;

  /**
   * Sign in a user with email and password (event-based for cookie management)
   * @param event - H3 event object
   * @param credentials - User credentials
   * @returns Authenticated user or null if sign in failed
   */
  signInWithEvent?(
    event: H3Event,
    credentials: UserCredentials,
  ): Promise<AuthUser | null>;

  /**
   * Sign up a new user
   * @param data - User registration data
   * @returns Authenticated user or null if registration failed
   */
  signUp(data: UserRegistrationData): Promise<AuthUser | null>;

  /**
   * Sign out the current user
   * @param event - H3 event object
   */
  signOut(event: H3Event): Promise<void>;

  /**
   * Create email verification token
   * @param userId - User ID
   * @param email - User email
   * @returns Verification token
   */
  createEmailVerificationToken(
    userId: string,
    email: string,
  ): Promise<EmailVerificationToken | null>;

  /**
   * Verify email with token
   * @param token - Verification token
   * @returns True if verification successful
   */
  verifyEmail(token: string): Promise<boolean>;

  /**
   * Get user by ID (admin operation)
   * @param userId - User ID
   * @returns User or null if not found
   */
  getUserById(userId: string): Promise<AuthUser | null>;

  /**
   * Update user email
   * @param userId - User ID
   * @param newEmail - New email address
   * @returns True if update successful
   */
  updateUserEmail(userId: string, newEmail: string): Promise<boolean>;

  /**
   * Delete user account
   * @param userId - User ID
   * @returns True if deletion successful
   */
  deleteUser(userId: string): Promise<boolean>;

  /**
   * Send password reset email
   * @param email - User email
   * @returns True if email sent
   */
  sendPasswordReset(email: string): Promise<boolean>;

  /**
   * Reset password with token
   * @param token - Reset token
   * @param newPassword - New password
   * @returns True if reset successful
   */
  resetPassword(token: string, newPassword: string): Promise<boolean>;

  /**
   * Confirm OAuth session with tokens
   * @param accessToken - OAuth access token
   * @param refreshToken - OAuth refresh token
   * @param tokenMetadata - Additional token information (expires_in, etc.)
   * @returns Authenticated user with metadata or null if confirmation failed
   */
  confirmOAuthSession?(
    accessToken: string,
    refreshToken: string,
    tokenMetadata?: {
      expires_in?: number;
      token_type?: string;
      scope?: string;
      provider?: string;
    },
  ): Promise<{
    user: AuthUser;
    metadata?: Record<string, unknown>;
  } | null>;
}
