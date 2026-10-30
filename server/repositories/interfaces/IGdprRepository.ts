export interface GdprRequest {
  id: string;
  user_id: string;
  type: 'export' | 'deletion' | 'deletion_cancelled';
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  requested_at: string;
  completed_at: string | null;
  scheduled_for: string | null;
}

export interface UserExportData {
  exported_at: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    created_at: string;
    terms_accepted_at: string | null;
    consent_version: number | null;
    preferred_currency: string | null;
    avatar_url: string | null;
    bio: string | null;
    gender: string | null;
    occupation_type: string | null;
    study_field: string | null;
    job_title: string | null;
    languages: string[] | null;
    pets: string | null;
    telephone: string | null;
    instagram: string | null;
    twitter: string | null;
    tiktok: string | null;
    linkedin: string | null;
    profile_pictures: string[] | null;
  };
  houses: Array<{
    id: string;
    name: string;
    role: string;
    joined_at: string;
    left_at: string | null;
  }>;
  expenses: Array<{
    id: string;
    description: string;
    total_amount: number;
    currency: string;
    created_at: string;
    created_by_me: boolean;
    my_share: number;
    is_paid: boolean;
  }>;
  bills: Array<{
    id: string;
    description: string;
    monthly_cost: number;
    currency: string;
    created_at: string;
    active: boolean;
  }>;
  bill_reminders: Array<{
    id: string;
    bill_id: string;
    due_period: string;
    days_before: number;
    sent_at: string;
  }>;
  monthly_reports: Array<{
    id: string;
    house_id: string;
    year: number;
    month: number;
    total_amount: number;
    expense_count: number;
    generated_at: string;
  }>;
  bulletin_notes: Array<{
    id: string;
    house_id: string;
    message: string;
    dismiss_date: string | null;
    created_at: string;
  }>;
  reports: Array<{
    id: string;
    house_id: string;
    description: string;
    created_at: string;
    read_at: string | null;
    solved_at: string | null;
  }>;
  invitations_sent: Array<{
    id: string;
    house_id: string;
    invited_email: string;
    expires_at: string;
    used: boolean;
    used_at: string | null;
    created_at: string;
  }>;
  subscription: {
    plan: string;
    billing_period: string | null;
    status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    trial_ends_at: string | null;
    trial_used_at: string | null;
    current_period_end: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  sessions: Array<{ created_at: string; expires_at: string }>;
  consents: Array<{
    purpose: string;
    version: number;
    granted_at: string;
    withdrawn_at: string | null;
  }>;
  settlements: Array<{
    id: string;
    house_id: string;
    from_user_id: string;
    to_user_id: string;
    amount: number;
    kind: 'settlement' | 'share';
    share_id: string | null;
    created_by: string;
    created_at: string;
    undone_at: string | null;
  }>;
  security_events: Array<{ event: string; created_at: string }>;
  gdpr_requests: Array<{
    type: string;
    status: string;
    requested_at: string;
    completed_at: string | null;
  }>;
}

export interface CancelDeletionResult {
  restoredHouseIds: string[];
  stripeCancelScheduled: boolean;
}

export interface IGdprRepository {
  /** Houses the user owns that still have other active members. */
  getOwnedHousesBlockingDeletion(
    userId: string,
  ): Promise<Array<{ id: string; name: string }>>;
  /**
   * Idempotent: returns the existing pending request if there is one. Also
   * archives houses where the user is the only active member and records
   * them (plus whether Stripe cancellation was scheduled) on the request so
   * cancelDeletion can undo exactly that.
   */
  softDeleteUser(
    userId: string,
    stripeCancelScheduled?: boolean,
  ): Promise<{ scheduledFor: Date; cancelToken: string }>;
  /**
   * Null when no matching pending deletion. Otherwise un-archives the houses
   * the request archived (if still archived) and reports what to restore.
   */
  cancelDeletion(
    cancelToken: string,
    userId?: string,
  ): Promise<CancelDeletionResult | null>;
  pseudonymizeUser(userId: string): Promise<boolean>;
  getPendingDeletions(): Promise<Array<{ userId: string; deletedAt: Date }>>;
  recordExportRequest(userId: string): Promise<void>;
  /** `security_events` is added by the caller (separate repository). */
  exportUserData(
    userId: string,
  ): Promise<Omit<UserExportData, 'security_events'>>;
  runScheduledCleanup(options?: { excludeUserIds?: string[] }): Promise<{
    pseudonymized: number;
    pseudonymizedUserIds: string[];
    tokensCleared: number;
    invitationsCleared: number;
    resetTokensCleared: number;
    gdprRequestsCleared: number;
  }>;
}
