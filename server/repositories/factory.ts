/**
 * Repository Factory
 * Creates repository instances based on the configured database provider
 */

import type { Pool } from 'pg';
import type {
  IUserRepository,
  IHouseRepository,
  IExpenseRepository,
  IBillRepository,
  IBulletinNoteRepository,
  IBalanceRepository,
  IReportRepository,
  ISubscriptionRepository,
  IReferralRepository,
  IMonthlyReportRepository,
  IGdprRepository,
  ISecurityEventRepository,
  IConsentRepository,
} from './interfaces';

import { PostgresUserRepository } from './postgres/PostgresUserRepository';
import { PostgresHouseRepository } from './postgres/PostgresHouseRepository';
import { PostgresExpenseRepository } from './postgres/PostgresExpenseRepository';
import { PostgresBillRepository } from './postgres/PostgresBillRepository';
import { PostgresBulletinNoteRepository } from './postgres/PostgresBulletinNoteRepository';
import { PostgresBalanceRepository } from './postgres/PostgresBalanceRepository';
import { PostgresReportRepository } from './postgres/PostgresReportRepository';
import { PostgresSubscriptionRepository } from './postgres/PostgresSubscriptionRepository';
import { PostgresReferralRepository } from './postgres/PostgresReferralRepository';
import { PostgresMonthlyReportRepository } from './postgres/PostgresMonthlyReportRepository';
import { PostgresGdprRepository } from './postgres/PostgresGdprRepository';
import { PostgresSecurityEventRepository } from './postgres/PostgresSecurityEventRepository';
import { PostgresConsentRepository } from './postgres/PostgresConsentRepository';

/**
 * Repository container
 */
export interface Repositories {
  users: IUserRepository;
  houses: IHouseRepository;
  expenses: IExpenseRepository;
  bills: IBillRepository;
  bulletinNotes: IBulletinNoteRepository;
  balance: IBalanceRepository;
  reports: IReportRepository;
  subscriptions: ISubscriptionRepository;
  referrals: IReferralRepository;
  monthlyReports: IMonthlyReportRepository;
  gdpr: IGdprRepository;
  securityEvents: ISecurityEventRepository;
  consents: IConsentRepository;
}

/**
 * Database provider type
 */
export type DatabaseProvider = 'postgres';

/**
 * Create PostgreSQL repositories
 */
function createPostgresRepositories(pool: Pool): Repositories {
  return {
    users: new PostgresUserRepository(pool),
    houses: new PostgresHouseRepository(pool),
    expenses: new PostgresExpenseRepository(pool),
    bills: new PostgresBillRepository(pool),
    bulletinNotes: new PostgresBulletinNoteRepository(pool),
    balance: new PostgresBalanceRepository(pool),
    reports: new PostgresReportRepository(pool),
    subscriptions: new PostgresSubscriptionRepository(pool),
    referrals: new PostgresReferralRepository(pool),
    monthlyReports: new PostgresMonthlyReportRepository(pool),
    gdpr: new PostgresGdprRepository(pool),
    securityEvents: new PostgresSecurityEventRepository(pool),
    consents: new PostgresConsentRepository(pool),
  };
}

/**
 * Repository factory state
 */
let repositories: Repositories | null = null;

/**
 * Initialize repositories with the configured database provider
 */
export function initializeRepositories(client: Pool): void {
  repositories = createPostgresRepositories(client);
}

/**
 * Get repository instances
 */
export function getRepositories(): Repositories {
  if (!repositories) {
    throw new Error(
      'Repositories not initialized. Call initializeRepositories() first.',
    );
  }

  return repositories;
}

/**
 * Reset factory (useful for testing)
 */
export function resetRepositories(): void {
  repositories = null;
}
