drop policy "Users can manage bills of their houses" on "public"."bills";

drop policy "Users can view bills of their houses" on "public"."bills";

drop policy "Users can create notes in their houses" on "public"."bulletin_notes";

drop policy "Users can delete their own notes" on "public"."bulletin_notes";

drop policy "Users can view notes from their houses" on "public"."bulletin_notes";

drop policy "Users can view comments about themselves" on "public"."comments";

drop policy "Users can view expense shares of their houses" on "public"."expense_shares";

drop policy "Users can create expenses for their houses" on "public"."expenses";

drop policy "Users can view expenses of their houses" on "public"."expenses";

drop policy "Users can view house members of their houses" on "public"."house_members";

drop policy "Users can create houses" on "public"."houses";

drop policy "Users can view houses they belong to" on "public"."houses";

drop policy "Users can insert their own profile" on "public"."users";

drop policy "Users can update their own profile" on "public"."users";

drop policy "Users can view their own profile" on "public"."users";

alter table "public"."bills" drop constraint "bills_currency_check";

alter table "public"."users" drop constraint "users_id_fkey";

alter table "public"."bill_documents" drop constraint "bill_documents_uploaded_by_fkey";

alter table "public"."bills" drop constraint "bills_created_by_fkey";

alter table "public"."comments" drop constraint "comments_about_user_id_fkey";

alter table "public"."comments" drop constraint "comments_from_user_id_fkey";

alter table "public"."expense_shares" drop constraint "expense_shares_user_id_fkey";

alter table "public"."expenses" drop constraint "expenses_created_by_fkey";

alter table "public"."houses" drop constraint "houses_currency_check";

alter table "public"."houses" drop constraint "houses_owner_id_fkey";

drop index if exists "public"."idx_bills_currency";

drop index if exists "public"."idx_houses_currency";


  create table "public"."bill_reminders" (
    "id" uuid not null default gen_random_uuid(),
    "bill_id" uuid not null,
    "due_period" date not null,
    "days_before" integer not null,
    "sent_at" timestamp with time zone not null default now()
      );



  create table "public"."email_verification_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "token" text not null,
    "email" text not null,
    "expires_at" timestamp with time zone not null,
    "verified" boolean not null default false,
    "verified_at" timestamp with time zone,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."house_invitations" (
    "id" uuid not null default gen_random_uuid(),
    "token" text not null,
    "house_id" uuid not null,
    "invited_email" text not null,
    "invited_by" uuid not null,
    "expires_at" timestamp with time zone not null,
    "used" boolean not null default false,
    "used_by" uuid,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."monthly_reports" (
    "id" uuid not null default gen_random_uuid(),
    "house_id" uuid not null,
    "year" integer not null,
    "month" integer not null,
    "total_amount" numeric(10,2) not null default 0,
    "expense_count" integer not null default 0,
    "pdf_url" text,
    "generated_at" timestamp with time zone not null default now()
      );



  create table "public"."password_reset_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "token" text not null,
    "expires_at" timestamp with time zone not null,
    "used" boolean not null default false,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."referral_rewards" (
    "id" uuid not null default gen_random_uuid(),
    "referrer_id" uuid not null,
    "referred_id" uuid not null,
    "invitation_id" uuid,
    "reward_type" text not null default 'pro_month'::text,
    "redeemed_at" timestamp with time zone,
    "expires_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."report_images" (
    "id" uuid not null default gen_random_uuid(),
    "report_id" uuid not null,
    "filename" text not null,
    "url" text not null,
    "uploaded_at" timestamp with time zone not null default now()
      );



  create table "public"."reports" (
    "id" uuid not null default gen_random_uuid(),
    "house_id" uuid not null,
    "created_by" uuid not null,
    "description" text not null,
    "created_at" timestamp with time zone not null default now(),
    "read_at" timestamp with time zone,
    "solved_at" timestamp with time zone
      );



  create table "public"."subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "stripe_customer_id" text,
    "stripe_subscription_id" text,
    "plan" text not null default 'free'::text,
    "billing_period" text,
    "status" text not null default 'active'::text,
    "trial_ends_at" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."bills" drop column "currency";

alter table "public"."bills" add column "payment_period" integer not null default 1;

alter table "public"."bulletin_notes" disable row level security;

alter table "public"."houses" add column "status" text not null default 'active'::text;

alter table "public"."houses" add column "updated_at" timestamp with time zone not null default now();

alter table "public"."houses" alter column "currency" set default 'EUR'::text;

alter table "public"."houses" alter column "max_members" set default 10;

alter table "public"."users" add column "bio" text;

alter table "public"."users" add column "birthplace" text;

alter table "public"."users" add column "email_confirmed_at" timestamp with time zone;

alter table "public"."users" add column "gender" text;

alter table "public"."users" add column "instagram" text;

alter table "public"."users" add column "is_first_access" boolean default false;

alter table "public"."users" add column "is_smoker" boolean default false;

alter table "public"."users" add column "job_title" text;

alter table "public"."users" add column "languages" text[];

alter table "public"."users" add column "linkedin" text;

alter table "public"."users" add column "nationality" text;

alter table "public"."users" add column "occupation_type" text;

alter table "public"."users" add column "password_hash" text;

alter table "public"."users" add column "pets" text;

alter table "public"."users" add column "preferred_currency" text default 'EUR'::text;

alter table "public"."users" add column "profile_pictures" text[];

alter table "public"."users" add column "study_field" text;

alter table "public"."users" add column "telephone" text;

alter table "public"."users" add column "tiktok" text;

alter table "public"."users" add column "twitter" text;

alter table "public"."users" add column "updated_at" timestamp with time zone not null default now();

alter table "public"."users" alter column "id" set default gen_random_uuid();

CREATE UNIQUE INDEX bill_reminders_bill_id_due_period_days_before_key ON public.bill_reminders USING btree (bill_id, due_period, days_before);

CREATE UNIQUE INDEX bill_reminders_pkey ON public.bill_reminders USING btree (id);

CREATE UNIQUE INDEX email_verification_tokens_pkey ON public.email_verification_tokens USING btree (id);

CREATE UNIQUE INDEX email_verification_tokens_token_key ON public.email_verification_tokens USING btree (token);

CREATE UNIQUE INDEX house_invitations_pkey ON public.house_invitations USING btree (id);

CREATE UNIQUE INDEX house_invitations_token_key ON public.house_invitations USING btree (token);

CREATE INDEX idx_bill_documents_bill_id ON public.bill_documents USING btree (bill_id);

CREATE INDEX idx_bill_reminders_bill_id ON public.bill_reminders USING btree (bill_id);

CREATE INDEX idx_bill_reminders_due_period ON public.bill_reminders USING btree (due_period);

CREATE INDEX idx_bills_active ON public.bills USING btree (active);

CREATE INDEX idx_bulletin_notes_created_at ON public.bulletin_notes USING btree (created_at DESC);

CREATE INDEX idx_comments_house_id ON public.comments USING btree (house_id);

CREATE INDEX idx_email_verification_tokens_token ON public.email_verification_tokens USING btree (token);

CREATE INDEX idx_email_verification_tokens_user_id ON public.email_verification_tokens USING btree (user_id);

CREATE INDEX idx_email_verification_tokens_verified ON public.email_verification_tokens USING btree (verified);

CREATE INDEX idx_expense_shares_is_paid ON public.expense_shares USING btree (is_paid);

CREATE INDEX idx_expenses_created_at ON public.expenses USING btree (created_at DESC);

CREATE INDEX idx_house_invitations_expires_at ON public.house_invitations USING btree (expires_at);

CREATE INDEX idx_house_invitations_house_id ON public.house_invitations USING btree (house_id);

CREATE INDEX idx_house_invitations_token ON public.house_invitations USING btree (token);

CREATE INDEX idx_house_invitations_used ON public.house_invitations USING btree (used);

CREATE INDEX idx_monthly_reports_house_id ON public.monthly_reports USING btree (house_id);

CREATE INDEX idx_monthly_reports_period ON public.monthly_reports USING btree (year, month);

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);

CREATE INDEX idx_referral_rewards_redeemed ON public.referral_rewards USING btree (redeemed_at) WHERE (redeemed_at IS NULL);

CREATE INDEX idx_referral_rewards_referred_id ON public.referral_rewards USING btree (referred_id);

CREATE INDEX idx_referral_rewards_referrer_id ON public.referral_rewards USING btree (referrer_id);

CREATE INDEX idx_report_images_report_id ON public.report_images USING btree (report_id);

CREATE INDEX idx_reports_created_at ON public.reports USING btree (created_at DESC);

CREATE INDEX idx_reports_created_by ON public.reports USING btree (created_by);

CREATE INDEX idx_reports_house_id ON public.reports USING btree (house_id);

CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions USING btree (stripe_customer_id);

CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions USING btree (stripe_subscription_id);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);

CREATE INDEX idx_users_email ON public.users USING btree (email);

CREATE UNIQUE INDEX monthly_reports_house_id_year_month_key ON public.monthly_reports USING btree (house_id, year, month);

CREATE UNIQUE INDEX monthly_reports_pkey ON public.monthly_reports USING btree (id);

CREATE UNIQUE INDEX password_reset_tokens_pkey ON public.password_reset_tokens USING btree (id);

CREATE UNIQUE INDEX password_reset_tokens_token_key ON public.password_reset_tokens USING btree (token);

CREATE UNIQUE INDEX referral_rewards_pkey ON public.referral_rewards USING btree (id);

CREATE UNIQUE INDEX referral_rewards_referrer_id_referred_id_key ON public.referral_rewards USING btree (referrer_id, referred_id);

CREATE UNIQUE INDEX report_images_pkey ON public.report_images USING btree (id);

CREATE UNIQUE INDEX reports_pkey ON public.reports USING btree (id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE UNIQUE INDEX subscriptions_stripe_customer_id_key ON public.subscriptions USING btree (stripe_customer_id);

CREATE UNIQUE INDEX subscriptions_stripe_subscription_id_key ON public.subscriptions USING btree (stripe_subscription_id);

CREATE UNIQUE INDEX subscriptions_user_id_key ON public.subscriptions USING btree (user_id);

alter table "public"."bill_reminders" add constraint "bill_reminders_pkey" PRIMARY KEY using index "bill_reminders_pkey";

alter table "public"."email_verification_tokens" add constraint "email_verification_tokens_pkey" PRIMARY KEY using index "email_verification_tokens_pkey";

alter table "public"."house_invitations" add constraint "house_invitations_pkey" PRIMARY KEY using index "house_invitations_pkey";

alter table "public"."monthly_reports" add constraint "monthly_reports_pkey" PRIMARY KEY using index "monthly_reports_pkey";

alter table "public"."password_reset_tokens" add constraint "password_reset_tokens_pkey" PRIMARY KEY using index "password_reset_tokens_pkey";

alter table "public"."referral_rewards" add constraint "referral_rewards_pkey" PRIMARY KEY using index "referral_rewards_pkey";

alter table "public"."report_images" add constraint "report_images_pkey" PRIMARY KEY using index "report_images_pkey";

alter table "public"."reports" add constraint "reports_pkey" PRIMARY KEY using index "reports_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."bill_reminders" add constraint "bill_reminders_bill_id_due_period_days_before_key" UNIQUE using index "bill_reminders_bill_id_due_period_days_before_key";

alter table "public"."bill_reminders" add constraint "bill_reminders_bill_id_fkey" FOREIGN KEY (bill_id) REFERENCES public.bills(id) ON DELETE CASCADE not valid;

alter table "public"."bill_reminders" validate constraint "bill_reminders_bill_id_fkey";

alter table "public"."bill_reminders" add constraint "bill_reminders_days_before_check" CHECK ((days_before = ANY (ARRAY[1, 3, 7]))) not valid;

alter table "public"."bill_reminders" validate constraint "bill_reminders_days_before_check";

alter table "public"."bills" add constraint "bills_payment_period_check" CHECK ((payment_period = ANY (ARRAY[1, 2, 6, 12]))) not valid;

alter table "public"."bills" validate constraint "bills_payment_period_check";

alter table "public"."email_verification_tokens" add constraint "email_verification_tokens_token_key" UNIQUE using index "email_verification_tokens_token_key";

alter table "public"."email_verification_tokens" add constraint "email_verification_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."email_verification_tokens" validate constraint "email_verification_tokens_user_id_fkey";

alter table "public"."house_invitations" add constraint "house_invitations_house_id_fkey" FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE not valid;

alter table "public"."house_invitations" validate constraint "house_invitations_house_id_fkey";

alter table "public"."house_invitations" add constraint "house_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."house_invitations" validate constraint "house_invitations_invited_by_fkey";

alter table "public"."house_invitations" add constraint "house_invitations_token_key" UNIQUE using index "house_invitations_token_key";

alter table "public"."house_invitations" add constraint "house_invitations_used_by_fkey" FOREIGN KEY (used_by) REFERENCES public.users(id) ON DELETE SET NULL not valid;

alter table "public"."house_invitations" validate constraint "house_invitations_used_by_fkey";

alter table "public"."houses" add constraint "houses_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'archived'::text]))) not valid;

alter table "public"."houses" validate constraint "houses_status_check";

alter table "public"."monthly_reports" add constraint "monthly_reports_house_id_fkey" FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE not valid;

alter table "public"."monthly_reports" validate constraint "monthly_reports_house_id_fkey";

alter table "public"."monthly_reports" add constraint "monthly_reports_house_id_year_month_key" UNIQUE using index "monthly_reports_house_id_year_month_key";

alter table "public"."monthly_reports" add constraint "monthly_reports_month_check" CHECK (((month >= 1) AND (month <= 12))) not valid;

alter table "public"."monthly_reports" validate constraint "monthly_reports_month_check";

alter table "public"."password_reset_tokens" add constraint "password_reset_tokens_token_key" UNIQUE using index "password_reset_tokens_token_key";

alter table "public"."password_reset_tokens" add constraint "password_reset_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."password_reset_tokens" validate constraint "password_reset_tokens_user_id_fkey";

alter table "public"."referral_rewards" add constraint "referral_rewards_invitation_id_fkey" FOREIGN KEY (invitation_id) REFERENCES public.house_invitations(id) ON DELETE SET NULL not valid;

alter table "public"."referral_rewards" validate constraint "referral_rewards_invitation_id_fkey";

alter table "public"."referral_rewards" add constraint "referral_rewards_referred_id_fkey" FOREIGN KEY (referred_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."referral_rewards" validate constraint "referral_rewards_referred_id_fkey";

alter table "public"."referral_rewards" add constraint "referral_rewards_referrer_id_fkey" FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."referral_rewards" validate constraint "referral_rewards_referrer_id_fkey";

alter table "public"."referral_rewards" add constraint "referral_rewards_referrer_id_referred_id_key" UNIQUE using index "referral_rewards_referrer_id_referred_id_key";

alter table "public"."referral_rewards" add constraint "referral_rewards_reward_type_check" CHECK ((reward_type = 'pro_month'::text)) not valid;

alter table "public"."referral_rewards" validate constraint "referral_rewards_reward_type_check";

alter table "public"."report_images" add constraint "report_images_report_id_fkey" FOREIGN KEY (report_id) REFERENCES public.reports(id) ON DELETE CASCADE not valid;

alter table "public"."report_images" validate constraint "report_images_report_id_fkey";

alter table "public"."reports" add constraint "reports_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."reports" validate constraint "reports_created_by_fkey";

alter table "public"."reports" add constraint "reports_house_id_fkey" FOREIGN KEY (house_id) REFERENCES public.houses(id) ON DELETE CASCADE not valid;

alter table "public"."reports" validate constraint "reports_house_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_billing_period_check" CHECK ((billing_period = ANY (ARRAY['monthly'::text, 'annual'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_billing_period_check";

alter table "public"."subscriptions" add constraint "subscriptions_plan_check" CHECK ((plan = ANY (ARRAY['free'::text, 'pro'::text, 'house_plus'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_plan_check";

alter table "public"."subscriptions" add constraint "subscriptions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'trialing'::text, 'past_due'::text, 'canceled'::text, 'incomplete'::text]))) not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_status_check";

alter table "public"."subscriptions" add constraint "subscriptions_stripe_customer_id_key" UNIQUE using index "subscriptions_stripe_customer_id_key";

alter table "public"."subscriptions" add constraint "subscriptions_stripe_subscription_id_key" UNIQUE using index "subscriptions_stripe_subscription_id_key";

alter table "public"."subscriptions" add constraint "subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."subscriptions" validate constraint "subscriptions_user_id_fkey";

alter table "public"."subscriptions" add constraint "subscriptions_user_id_key" UNIQUE using index "subscriptions_user_id_key";

alter table "public"."users" add constraint "users_gender_check" CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text, 'prefer_not_to_say'::text]))) not valid;

alter table "public"."users" validate constraint "users_gender_check";

alter table "public"."users" add constraint "users_occupation_type_check" CHECK ((occupation_type = ANY (ARRAY['student'::text, 'employed'::text, 'self_employed'::text, 'unemployed'::text, 'retired'::text, 'other'::text]))) not valid;

alter table "public"."users" validate constraint "users_occupation_type_check";

alter table "public"."users" add constraint "users_preferred_currency_check" CHECK ((preferred_currency = ANY (ARRAY['USD'::text, 'EUR'::text]))) not valid;

alter table "public"."users" validate constraint "users_preferred_currency_check";

alter table "public"."bill_documents" add constraint "bill_documents_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."bill_documents" validate constraint "bill_documents_uploaded_by_fkey";

alter table "public"."bills" add constraint "bills_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."bills" validate constraint "bills_created_by_fkey";

alter table "public"."comments" add constraint "comments_about_user_id_fkey" FOREIGN KEY (about_user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_about_user_id_fkey";

alter table "public"."comments" add constraint "comments_from_user_id_fkey" FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_from_user_id_fkey";

alter table "public"."expense_shares" add constraint "expense_shares_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."expense_shares" validate constraint "expense_shares_user_id_fkey";

alter table "public"."expenses" add constraint "expenses_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."expenses" validate constraint "expenses_created_by_fkey";

alter table "public"."houses" add constraint "houses_currency_check" CHECK ((currency = ANY (ARRAY['USD'::text, 'EUR'::text]))) not valid;

alter table "public"."houses" validate constraint "houses_currency_check";

alter table "public"."houses" add constraint "houses_owner_id_fkey" FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE CASCADE not valid;

alter table "public"."houses" validate constraint "houses_owner_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_report_creator_not_owner()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF EXISTS (
        SELECT 1 FROM houses 
        WHERE id = NEW.house_id 
        AND owner_id = NEW.created_by
    ) THEN
        RAISE EXCEPTION 'House owners cannot create reports for their own house';
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM house_invitations 
    WHERE expires_at < NOW() 
    AND used = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_password_reset_tokens()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW() AND used = FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_verification_tokens()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM email_verification_tokens
    WHERE expires_at < NOW() AND verified = FALSE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_expired_bulletin_notes()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM bulletin_notes
    WHERE dismiss_date IS NOT NULL AND dismiss_date < CURRENT_DATE;
END;
$function$
;

grant delete on table "public"."bill_reminders" to "anon";

grant insert on table "public"."bill_reminders" to "anon";

grant references on table "public"."bill_reminders" to "anon";

grant select on table "public"."bill_reminders" to "anon";

grant trigger on table "public"."bill_reminders" to "anon";

grant truncate on table "public"."bill_reminders" to "anon";

grant update on table "public"."bill_reminders" to "anon";

grant delete on table "public"."bill_reminders" to "authenticated";

grant insert on table "public"."bill_reminders" to "authenticated";

grant references on table "public"."bill_reminders" to "authenticated";

grant select on table "public"."bill_reminders" to "authenticated";

grant trigger on table "public"."bill_reminders" to "authenticated";

grant truncate on table "public"."bill_reminders" to "authenticated";

grant update on table "public"."bill_reminders" to "authenticated";

grant delete on table "public"."bill_reminders" to "service_role";

grant insert on table "public"."bill_reminders" to "service_role";

grant references on table "public"."bill_reminders" to "service_role";

grant select on table "public"."bill_reminders" to "service_role";

grant trigger on table "public"."bill_reminders" to "service_role";

grant truncate on table "public"."bill_reminders" to "service_role";

grant update on table "public"."bill_reminders" to "service_role";

grant delete on table "public"."email_verification_tokens" to "anon";

grant insert on table "public"."email_verification_tokens" to "anon";

grant references on table "public"."email_verification_tokens" to "anon";

grant select on table "public"."email_verification_tokens" to "anon";

grant trigger on table "public"."email_verification_tokens" to "anon";

grant truncate on table "public"."email_verification_tokens" to "anon";

grant update on table "public"."email_verification_tokens" to "anon";

grant delete on table "public"."email_verification_tokens" to "authenticated";

grant insert on table "public"."email_verification_tokens" to "authenticated";

grant references on table "public"."email_verification_tokens" to "authenticated";

grant select on table "public"."email_verification_tokens" to "authenticated";

grant trigger on table "public"."email_verification_tokens" to "authenticated";

grant truncate on table "public"."email_verification_tokens" to "authenticated";

grant update on table "public"."email_verification_tokens" to "authenticated";

grant delete on table "public"."email_verification_tokens" to "service_role";

grant insert on table "public"."email_verification_tokens" to "service_role";

grant references on table "public"."email_verification_tokens" to "service_role";

grant select on table "public"."email_verification_tokens" to "service_role";

grant trigger on table "public"."email_verification_tokens" to "service_role";

grant truncate on table "public"."email_verification_tokens" to "service_role";

grant update on table "public"."email_verification_tokens" to "service_role";

grant delete on table "public"."house_invitations" to "anon";

grant insert on table "public"."house_invitations" to "anon";

grant references on table "public"."house_invitations" to "anon";

grant select on table "public"."house_invitations" to "anon";

grant trigger on table "public"."house_invitations" to "anon";

grant truncate on table "public"."house_invitations" to "anon";

grant update on table "public"."house_invitations" to "anon";

grant delete on table "public"."house_invitations" to "authenticated";

grant insert on table "public"."house_invitations" to "authenticated";

grant references on table "public"."house_invitations" to "authenticated";

grant select on table "public"."house_invitations" to "authenticated";

grant trigger on table "public"."house_invitations" to "authenticated";

grant truncate on table "public"."house_invitations" to "authenticated";

grant update on table "public"."house_invitations" to "authenticated";

grant delete on table "public"."house_invitations" to "service_role";

grant insert on table "public"."house_invitations" to "service_role";

grant references on table "public"."house_invitations" to "service_role";

grant select on table "public"."house_invitations" to "service_role";

grant trigger on table "public"."house_invitations" to "service_role";

grant truncate on table "public"."house_invitations" to "service_role";

grant update on table "public"."house_invitations" to "service_role";

grant delete on table "public"."monthly_reports" to "anon";

grant insert on table "public"."monthly_reports" to "anon";

grant references on table "public"."monthly_reports" to "anon";

grant select on table "public"."monthly_reports" to "anon";

grant trigger on table "public"."monthly_reports" to "anon";

grant truncate on table "public"."monthly_reports" to "anon";

grant update on table "public"."monthly_reports" to "anon";

grant delete on table "public"."monthly_reports" to "authenticated";

grant insert on table "public"."monthly_reports" to "authenticated";

grant references on table "public"."monthly_reports" to "authenticated";

grant select on table "public"."monthly_reports" to "authenticated";

grant trigger on table "public"."monthly_reports" to "authenticated";

grant truncate on table "public"."monthly_reports" to "authenticated";

grant update on table "public"."monthly_reports" to "authenticated";

grant delete on table "public"."monthly_reports" to "service_role";

grant insert on table "public"."monthly_reports" to "service_role";

grant references on table "public"."monthly_reports" to "service_role";

grant select on table "public"."monthly_reports" to "service_role";

grant trigger on table "public"."monthly_reports" to "service_role";

grant truncate on table "public"."monthly_reports" to "service_role";

grant update on table "public"."monthly_reports" to "service_role";

grant delete on table "public"."password_reset_tokens" to "anon";

grant insert on table "public"."password_reset_tokens" to "anon";

grant references on table "public"."password_reset_tokens" to "anon";

grant select on table "public"."password_reset_tokens" to "anon";

grant trigger on table "public"."password_reset_tokens" to "anon";

grant truncate on table "public"."password_reset_tokens" to "anon";

grant update on table "public"."password_reset_tokens" to "anon";

grant delete on table "public"."password_reset_tokens" to "authenticated";

grant insert on table "public"."password_reset_tokens" to "authenticated";

grant references on table "public"."password_reset_tokens" to "authenticated";

grant select on table "public"."password_reset_tokens" to "authenticated";

grant trigger on table "public"."password_reset_tokens" to "authenticated";

grant truncate on table "public"."password_reset_tokens" to "authenticated";

grant update on table "public"."password_reset_tokens" to "authenticated";

grant delete on table "public"."password_reset_tokens" to "service_role";

grant insert on table "public"."password_reset_tokens" to "service_role";

grant references on table "public"."password_reset_tokens" to "service_role";

grant select on table "public"."password_reset_tokens" to "service_role";

grant trigger on table "public"."password_reset_tokens" to "service_role";

grant truncate on table "public"."password_reset_tokens" to "service_role";

grant update on table "public"."password_reset_tokens" to "service_role";

grant delete on table "public"."referral_rewards" to "anon";

grant insert on table "public"."referral_rewards" to "anon";

grant references on table "public"."referral_rewards" to "anon";

grant select on table "public"."referral_rewards" to "anon";

grant trigger on table "public"."referral_rewards" to "anon";

grant truncate on table "public"."referral_rewards" to "anon";

grant update on table "public"."referral_rewards" to "anon";

grant delete on table "public"."referral_rewards" to "authenticated";

grant insert on table "public"."referral_rewards" to "authenticated";

grant references on table "public"."referral_rewards" to "authenticated";

grant select on table "public"."referral_rewards" to "authenticated";

grant trigger on table "public"."referral_rewards" to "authenticated";

grant truncate on table "public"."referral_rewards" to "authenticated";

grant update on table "public"."referral_rewards" to "authenticated";

grant delete on table "public"."referral_rewards" to "service_role";

grant insert on table "public"."referral_rewards" to "service_role";

grant references on table "public"."referral_rewards" to "service_role";

grant select on table "public"."referral_rewards" to "service_role";

grant trigger on table "public"."referral_rewards" to "service_role";

grant truncate on table "public"."referral_rewards" to "service_role";

grant update on table "public"."referral_rewards" to "service_role";

grant delete on table "public"."report_images" to "anon";

grant insert on table "public"."report_images" to "anon";

grant references on table "public"."report_images" to "anon";

grant select on table "public"."report_images" to "anon";

grant trigger on table "public"."report_images" to "anon";

grant truncate on table "public"."report_images" to "anon";

grant update on table "public"."report_images" to "anon";

grant delete on table "public"."report_images" to "authenticated";

grant insert on table "public"."report_images" to "authenticated";

grant references on table "public"."report_images" to "authenticated";

grant select on table "public"."report_images" to "authenticated";

grant trigger on table "public"."report_images" to "authenticated";

grant truncate on table "public"."report_images" to "authenticated";

grant update on table "public"."report_images" to "authenticated";

grant delete on table "public"."report_images" to "service_role";

grant insert on table "public"."report_images" to "service_role";

grant references on table "public"."report_images" to "service_role";

grant select on table "public"."report_images" to "service_role";

grant trigger on table "public"."report_images" to "service_role";

grant truncate on table "public"."report_images" to "service_role";

grant update on table "public"."report_images" to "service_role";

grant delete on table "public"."reports" to "anon";

grant insert on table "public"."reports" to "anon";

grant references on table "public"."reports" to "anon";

grant select on table "public"."reports" to "anon";

grant trigger on table "public"."reports" to "anon";

grant truncate on table "public"."reports" to "anon";

grant update on table "public"."reports" to "anon";

grant delete on table "public"."reports" to "authenticated";

grant insert on table "public"."reports" to "authenticated";

grant references on table "public"."reports" to "authenticated";

grant select on table "public"."reports" to "authenticated";

grant trigger on table "public"."reports" to "authenticated";

grant truncate on table "public"."reports" to "authenticated";

grant update on table "public"."reports" to "authenticated";

grant delete on table "public"."reports" to "service_role";

grant insert on table "public"."reports" to "service_role";

grant references on table "public"."reports" to "service_role";

grant select on table "public"."reports" to "service_role";

grant trigger on table "public"."reports" to "service_role";

grant truncate on table "public"."reports" to "service_role";

grant update on table "public"."reports" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

CREATE TRIGGER trg_anonymize_invitation BEFORE UPDATE ON public.house_invitations FOR EACH ROW EXECUTE FUNCTION public.anonymize_used_invitation();

CREATE TRIGGER update_houses_updated_at BEFORE UPDATE ON public.houses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trigger_check_report_creator_not_owner BEFORE INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION public.check_report_creator_not_owner();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

drop policy "Users can view bill documents of their houses" on "storage"."objects";


