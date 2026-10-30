-- Comprehensive seed data for House M8 PostgreSQL
-- This file contains all the seed data for development/testing

-- =============================================================================
-- USERS
-- =============================================================================
-- Insert users with all profile information
-- Note: password is 'password123' hashed with bcrypt (12 rounds)
-- Hash generated with: bcrypt.hash('password123', 12)

INSERT INTO users (id, email, password_hash, first_name, last_name, birthdate, bio, is_smoker, gender, birthplace, nationality, occupation_type, job_title, study_field, languages, pets, telephone, instagram, twitter, linkedin, tiktok, profile_pictures, email_confirmed_at, created_at, updated_at) VALUES

-- House 1 users (Downtown Loft)
('43ac31fb-5b69-43bc-b339-182eba971f73', 'john.doe@example.com', '$2b$12$mfo3cbwAAl885JpQkP3rLOiEqqIkyxUurMTBRlGtJXvz8ZafuylSy', 'John', 'Doe', '1995-06-15',
  'Software engineer who loves cooking and hosting movie nights. Always up for trying new restaurants and exploring the city. Big fan of craft beer and board games!',
  false, 'male', 'San Francisco, CA', 'American', 'worker', 'Senior Software Engineer', NULL,
  ARRAY['English', 'Spanish', 'JavaScript'], 'No pets, but I love dogs!', '+1-555-0123',
  '@johndoe_sf', NULL, 'linkedin.com/in/johndoe', NULL,
  ARRAY[
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=face'
  ],
  NOW(), NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months'),

('c9031aa8-8d6e-46c9-841e-67414583bf3d', 'jane.smith@example.com', '$2b$12$mfo3cbwAAl885JpQkP3rLOiEqqIkyxUurMTBRlGtJXvz8ZafuylSy', 'Jane', 'Smith', '1993-03-22',
  'Graphic designer with a passion for sustainable living and yoga. Love organizing house activities and keeping our space beautiful and zen. Always down for a farmers market run!',
  false, 'female', 'Portland, OR', 'American', 'worker', 'Graphic Designer', NULL,
  ARRAY['English', 'French'], 'I have a rescue cat named Luna 🐱', '+1-555-0124',
  '@jane.designs', '@janesmithdesign', 'linkedin.com/in/janesmith', NULL,
  ARRAY[
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face'
  ],
  NOW(), NOW() - INTERVAL '5 months', NOW() - INTERVAL '5 months'),

('016526cd-0513-4746-86ed-953335702906', 'mike.johnson@example.com', '$2b$12$mfo3cbwAAl885JpQkP3rLOiEqqIkyxUurMTBRlGtJXvz8ZafuylSy', 'Mike', 'Johnson', '1997-11-08',
  'Marketing student finishing my MBA. Love sports, especially basketball and hiking on weekends. Always bringing good energy to the house and organizing fun activities!',
  false, 'male', 'Denver, CO', 'American', 'student', NULL, 'Marketing & Business Administration (MBA)',
  ARRAY['English', 'Italian'], 'No pets currently, but grew up with golden retrievers', '+1-555-0125',
  '@mike_adventures', NULL, NULL, '@mikejohnson_fit',
  ARRAY[
    'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=400&h=400&fit=crop&crop=face'
  ],
  NOW(), NOW() - INTERVAL '4 months', NOW() - INTERVAL '4 months'),

('6cb4267b-2869-44e5-aa6b-afa2a9f9da55', 'sarah.wilson@example.com', '$2b$12$mfo3cbwAAl885JpQkP3rLOiEqqIkyxUurMTBRlGtJXvz8ZafuylSy', 'Sarah', 'Wilson', '1996-09-12',
  'Psychology PhD student researching social dynamics. I love reading, meditation, and organizing movie nights. Always happy to lend an ear and great at conflict resolution!',
  false, 'female', 'Austin, TX', 'American', 'student', NULL, 'Psychology (PhD)',
  ARRAY['English', 'German', 'Portuguese'], 'I have two budgerigars named Freud and Jung 🦜', '+1-555-0126',
  '@sarah.mindful', NULL, 'linkedin.com/in/sarahwilson-phd', NULL,
  ARRAY['https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&h=400&fit=crop&crop=face'],
  NOW(), NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),

-- House 2 users (Suburban House)
('af1164b0-621b-4bfd-a1a0-eb452aa2258e', 'alex.brown@example.com', '$2b$12$mfo3cbwAAl885JpQkP3rLOiEqqIkyxUurMTBRlGtJXvz8ZafuylSy', 'Alex', 'Brown', '1994-08-20',
  'Architect who bought this house to create the perfect shared living space. Love gardening, woodworking, and hosting BBQ parties. Always working on home improvement projects!',
  false, 'male', 'Chicago, IL', 'American', 'worker', 'Residential Architect', NULL,
  ARRAY['English', 'Mandarin'], 'We have a golden retriever named Buddy 🐕', '+1-555-0127',
  '@alex.builds', NULL, 'linkedin.com/in/alexbrown-architect', NULL,
  ARRAY[
    'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face'
  ],
  NOW(), NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months'),

('853685c8-0077-4699-8a7d-e5a1c061c19c', 'emily.davis@example.com', '$2b$12$mfo3cbwAAl885JpQkP3rLOiEqqIkyxUurMTBRlGtJXvz8ZafuylSy', 'Emily', 'Davis', '1998-12-03',
  'Elementary school teacher who loves cooking, gardening, and organizing fun house events. I bring homemade treats and always keep the kitchen spotless. Plant mom extraordinaire! 🌱',
  false, 'female', 'Nashville, TN', 'American', 'worker', 'Elementary School Teacher', NULL,
  ARRAY['English', 'Spanish'], 'I have a rabbit named Clover and lots of plants! 🐰', '+1-555-0128',
  '@emily.teaches', '@emilyeducates', NULL, NULL,
  ARRAY[
    'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face'
  ],
  NOW(), NOW() - INTERVAL '7 months', NOW() - INTERVAL '7 months'),

('eac293c1-2c35-47a3-9b6a-88e41057250a', 'chris.garcia@example.com', '$2b$12$mfo3cbwAAl885JpQkP3rLOiEqqIkyxUurMTBRlGtJXvz8ZafuylSy', 'Chris', 'Garcia', '1992-05-17',
  'Freelance photographer and part-time barista. Love capturing life moments and exploring new coffee spots. Bit of a night owl but always up for weekend adventures!',
  true, 'male', 'Miami, FL', 'American', 'worker', 'Freelance Photographer', NULL,
  ARRAY['English', 'Spanish', 'Portuguese'], 'No pets, but I love photographing animals', '+1-555-0129',
  '@chris.captures', '@chrisgarcia_photo', NULL, '@chrisg_photography',
  ARRAY['https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=400&fit=crop&crop=face'],
  NOW(), NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),

-- House 3 users (Beach Cottage)
('35570297-318b-46c5-bf3c-418d05791648', 'lisa.martinez@example.com', '$2b$12$mfo3cbwAAl885JpQkP3rLOiEqqIkyxUurMTBRlGtJXvz8ZafuylSy', 'Lisa', 'Martinez', '1999-01-28',
  'Marine biology student living the dream by the ocean! Love surfing, beach volleyball, and sustainable living. Always organizing beach cleanups and seafood dinners. Ocean lover 🌊',
  false, 'female', 'Santa Barbara, CA', 'American', 'student', NULL, 'Marine Biology',
  ARRAY['English', 'Hawaiian', 'Japanese'], 'I rescued a seagull once, does that count? 🕊️', '+1-555-0130',
  '@lisa.ocean', NULL, NULL, '@oceanlisa',
  ARRAY[
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1485875437342-9b39470b3d95?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=face'
  ],
  NOW(), NOW() - INTERVAL '12 months', NOW() - INTERVAL '12 months'),

('08db68a4-7321-4398-9273-68eda1c2fac9', 'david.lee@example.com', '$2b$12$mfo3cbwAAl885JpQkP3rLOiEqqIkyxUurMTBRlGtJXvz8ZafuylSy', 'David', 'Lee', '1991-10-14',
  'Software developer working remotely from paradise! Love cooking fresh seafood, beach runs, and evening coding sessions with ocean sounds. Best of both worlds! 💻🏖️',
  false, 'male', 'Seattle, WA', 'American', 'worker', 'Full-Stack Developer', NULL,
  ARRAY['English', 'Korean', 'Python', 'JavaScript'], 'No pets, but I feed the local pelicans 🦜', '+1-555-0131',
  '@david.codes.beach', '@davidlee_codes', 'linkedin.com/in/davidlee-dev', NULL,
  ARRAY[
    'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face'
  ],
  NOW(), NOW() - INTERVAL '10 months', NOW() - INTERVAL '10 months'),

-- Standalone users (no house)
('89e728d5-a13d-45d4-b65b-f1f2655e3483', 'rachel.white@example.com', '$2b$12$mfo3cbwAAl885JpQkP3rLOiEqqIkyxUurMTBRlGtJXvz8ZafuylSy', 'Rachel', 'White', '1995-07-09',
  'Travel blogger and yoga instructor looking for the perfect house to call home. Love cooking healthy meals, meditation, and sharing travel stories. Seeking zen living space! ✈️🧘‍♀️',
  false, 'female', 'Boulder, CO', 'American', 'worker', 'Travel Blogger & Yoga Instructor', NULL,
  ARRAY['English', 'Hindi', 'Thai'], 'I have a rescued cat named Namaste 🐱', '+1-555-0132',
  '@rachel.wanderlust', '@rachelwrites', NULL, '@rachel.travels',
  ARRAY[
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1485875437342-9b39470b3d95?w=400&h=400&fit=crop&crop=face'
  ],
  NOW(), NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month'),

('673dc533-4e00-4172-bba6-c6b4f32f782f', 'kevin.taylor@example.com', '$2b$12$mfo3cbwAAl885JpQkP3rLOiEqqIkyxUurMTBRlGtJXvz8ZafuylSy', 'Kevin', 'Taylor', '1996-04-25',
  'Medical student in my final year, future emergency room doctor. Love fitness, meal prep, and study groups. Looking for a quiet, organized house with serious but fun housemates! 🏥📚',
  false, 'male', 'Boston, MA', 'American', 'student', NULL, 'Medicine (MD)',
  ARRAY['English', 'Arabic', 'Latin'], 'No pets due to study schedule, but love animals', '+1-555-0133',
  '@kevin.future.md', NULL, 'linkedin.com/in/kevintaylor-med', NULL, NULL,
  NOW(), NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month');

-- =============================================================================
-- HOUSES
-- =============================================================================
INSERT INTO houses (id, name, address, owner_id, currency, created_at, updated_at) VALUES
('560a0217-180e-4112-a9f4-0e4b497f9556', 'Downtown Loft', '123 Main St, Downtown, NY 10001', '43ac31fb-5b69-43bc-b339-182eba971f73', 'USD', NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months'),
('670b1328-291f-5223-b0f5-1f5c608f0667', 'Suburban House', '456 Oak Avenue, Suburbia, CA 90210', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', 'USD', NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months'),
('780c2439-3a20-6334-c1f6-2f6d719f1778', 'Beach Cottage', '789 Seaside Drive, Coastal, FL 33101', '35570297-318b-46c5-bf3c-418d05791648', 'USD', NOW() - INTERVAL '12 months', NOW() - INTERVAL '12 months');

-- =============================================================================
-- HOUSE MEMBERS
-- =============================================================================
INSERT INTO house_members (house_id, user_id, role, joined_at) VALUES
-- House 1: Downtown Loft (4 members)
('560a0217-180e-4112-a9f4-0e4b497f9556', '43ac31fb-5b69-43bc-b339-182eba971f73', 'owner', NOW() - INTERVAL '6 months'),
('560a0217-180e-4112-a9f4-0e4b497f9556', 'c9031aa8-8d6e-46c9-841e-67414583bf3d', 'member', NOW() - INTERVAL '5 months'),
('560a0217-180e-4112-a9f4-0e4b497f9556', '016526cd-0513-4746-86ed-953335702906', 'member', NOW() - INTERVAL '4 months'),
('560a0217-180e-4112-a9f4-0e4b497f9556', '6cb4267b-2869-44e5-aa6b-afa2a9f9da55', 'member', NOW() - INTERVAL '2 months'),

-- House 2: Suburban House (3 members)
('670b1328-291f-5223-b0f5-1f5c608f0667', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', 'owner', NOW() - INTERVAL '8 months'),
('670b1328-291f-5223-b0f5-1f5c608f0667', '853685c8-0077-4699-8a7d-e5a1c061c19c', 'member', NOW() - INTERVAL '7 months'),
('670b1328-291f-5223-b0f5-1f5c608f0667', 'eac293c1-2c35-47a3-9b6a-88e41057250a', 'member', NOW() - INTERVAL '3 months'),

-- House 3: Beach Cottage (2 members)
('780c2439-3a20-6334-c1f6-2f6d719f1778', '35570297-318b-46c5-bf3c-418d05791648', 'owner', NOW() - INTERVAL '12 months'),
('780c2439-3a20-6334-c1f6-2f6d719f1778', '08db68a4-7321-4398-9273-68eda1c2fac9', 'member', NOW() - INTERVAL '10 months');

-- =============================================================================
-- EXPENSES
-- =============================================================================
INSERT INTO expenses (id, house_id, created_by, description, total_amount, currency, due_date, recurring, created_at, updated_at) VALUES
-- House 1: Downtown Loft expenses
('5037aea7-6ded-4c54-a319-e3153d6ec45e', '560a0217-180e-4112-a9f4-0e4b497f9556', '43ac31fb-5b69-43bc-b339-182eba971f73', 'Weekly Grocery Shopping', 156.80, 'USD', NULL, false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('77e6764f-5a84-41c2-a692-04f3812442e0', '560a0217-180e-4112-a9f4-0e4b497f9556', 'c9031aa8-8d6e-46c9-841e-67414583bf3d', 'Pizza Night', 68.40, 'USD', NULL, false, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week'),
('daa83ae4-e7cb-4ac0-8d40-bf8d94d0ccb6', '560a0217-180e-4112-a9f4-0e4b497f9556', '016526cd-0513-4746-86ed-953335702906', 'Cleaning Supplies & Toilet Paper', 89.25, 'USD', NULL, false, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('1234abcd-5678-90ef-1234-567890abcdef', '560a0217-180e-4112-a9f4-0e4b497f9556', '6cb4267b-2869-44e5-aa6b-afa2a9f9da55', 'Movie Night Snacks', 32.50, 'USD', NULL, false, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks'),
('2345bcde-6789-01ef-2345-678901abcdef', '560a0217-180e-4112-a9f4-0e4b497f9556', '43ac31fb-5b69-43bc-b339-182eba971f73', 'Living Room Plants & Pots', 145.99, 'USD', NULL, false, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),

-- House 2: Suburban House expenses
('3456cdef-7890-12ef-3456-789012abcdef', '670b1328-291f-5223-b0f5-1f5c608f0667', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', 'Yard Work Tools', 198.75, 'USD', NULL, false, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week'),
('4567def0-8901-23ef-4567-890123abcdef', '670b1328-291f-5223-b0f5-1f5c608f0667', '853685c8-0077-4699-8a7d-e5a1c061c19c', 'BBQ Supplies & Groceries', 134.60, 'USD', NULL, false, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
('5678ef01-9012-34ef-5678-901234abcdef', '670b1328-291f-5223-b0f5-1f5c608f0667', 'eac293c1-2c35-47a3-9b6a-88e41057250a', 'Kitchen Appliance Repair', 85.00, 'USD', NULL, false, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks'),
('6789f012-0123-45ef-6789-012345abcdef', '670b1328-291f-5223-b0f5-1f5c608f0667', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', 'Monthly Grocery Run', 287.45, 'USD', NULL, false, NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),

-- House 3: Beach Cottage expenses
('dbd82ef9-5d97-4334-aaaa-5749a9c3ebc2', '780c2439-3a20-6334-c1f6-2f6d719f1778', '35570297-318b-46c5-bf3c-418d05791648', 'Beach Day Supplies', 76.90, 'USD', NULL, false, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('89ab1234-2345-67ef-89ab-123456abcdef', '780c2439-3a20-6334-c1f6-2f6d719f1778', '08db68a4-7321-4398-9273-68eda1c2fac9', 'Fresh Seafood Dinner', 124.30, 'USD', NULL, false, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week'),
('9abc2345-3456-78ef-9abc-23456789abcd', '780c2439-3a20-6334-c1f6-2f6d719f1778', '35570297-318b-46c5-bf3c-418d05791648', 'Deck Furniture Cushions', 189.99, 'USD', NULL, false, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks');

-- =============================================================================
-- EXPENSE SHARES
-- =============================================================================
INSERT INTO expense_shares (id, expense_id, user_id, amount_due, is_paid, paid_at) VALUES
-- House 1 expenses
-- Weekly Grocery Shopping (split 4 ways: $156.80)
(gen_random_uuid(), '5037aea7-6ded-4c54-a319-e3153d6ec45e', '43ac31fb-5b69-43bc-b339-182eba971f73', 39.20, true, NOW() - INTERVAL '2 days'),
(gen_random_uuid(), '5037aea7-6ded-4c54-a319-e3153d6ec45e', 'c9031aa8-8d6e-46c9-841e-67414583bf3d', 39.20, true, NOW() - INTERVAL '1 day'),
(gen_random_uuid(), '5037aea7-6ded-4c54-a319-e3153d6ec45e', '016526cd-0513-4746-86ed-953335702906', 39.20, false, NULL),
(gen_random_uuid(), '5037aea7-6ded-4c54-a319-e3153d6ec45e', '6cb4267b-2869-44e5-aa6b-afa2a9f9da55', 39.20, true, NOW() - INTERVAL '1 day'),

-- Pizza Night (split 4 ways: $68.40)
(gen_random_uuid(), '77e6764f-5a84-41c2-a692-04f3812442e0', '43ac31fb-5b69-43bc-b339-182eba971f73', 17.10, true, NOW() - INTERVAL '5 days'),
(gen_random_uuid(), '77e6764f-5a84-41c2-a692-04f3812442e0', 'c9031aa8-8d6e-46c9-841e-67414583bf3d', 17.10, true, NOW() - INTERVAL '6 days'),
(gen_random_uuid(), '77e6764f-5a84-41c2-a692-04f3812442e0', '016526cd-0513-4746-86ed-953335702906', 17.10, true, NOW() - INTERVAL '4 days'),
(gen_random_uuid(), '77e6764f-5a84-41c2-a692-04f3812442e0', '6cb4267b-2869-44e5-aa6b-afa2a9f9da55', 17.10, true, NOW() - INTERVAL '5 days'),

-- Cleaning Supplies (split 4 ways: $89.25)
(gen_random_uuid(), 'daa83ae4-e7cb-4ac0-8d40-bf8d94d0ccb6', '43ac31fb-5b69-43bc-b339-182eba971f73', 22.31, false, NULL),
(gen_random_uuid(), 'daa83ae4-e7cb-4ac0-8d40-bf8d94d0ccb6', 'c9031aa8-8d6e-46c9-841e-67414583bf3d', 22.31, false, NULL),
(gen_random_uuid(), 'daa83ae4-e7cb-4ac0-8d40-bf8d94d0ccb6', '016526cd-0513-4746-86ed-953335702906', 22.31, true, NOW() - INTERVAL '3 days'),
(gen_random_uuid(), 'daa83ae4-e7cb-4ac0-8d40-bf8d94d0ccb6', '6cb4267b-2869-44e5-aa6b-afa2a9f9da55', 22.32, false, NULL),

-- Movie Night Snacks (split 4 ways: $32.50)
(gen_random_uuid(), '1234abcd-5678-90ef-1234-567890abcdef', '43ac31fb-5b69-43bc-b339-182eba971f73', 8.13, false, NULL),
(gen_random_uuid(), '1234abcd-5678-90ef-1234-567890abcdef', 'c9031aa8-8d6e-46c9-841e-67414583bf3d', 8.13, false, NULL),
(gen_random_uuid(), '1234abcd-5678-90ef-1234-567890abcdef', '016526cd-0513-4746-86ed-953335702906', 8.12, false, NULL),
(gen_random_uuid(), '1234abcd-5678-90ef-1234-567890abcdef', '6cb4267b-2869-44e5-aa6b-afa2a9f9da55', 8.12, true, NOW() - INTERVAL '12 days'),

-- Living Room Plants (split 4 ways: $145.99)
(gen_random_uuid(), '2345bcde-6789-01ef-2345-678901abcdef', '43ac31fb-5b69-43bc-b339-182eba971f73', 36.50, true, NOW() - INTERVAL '8 days'),
(gen_random_uuid(), '2345bcde-6789-01ef-2345-678901abcdef', 'c9031aa8-8d6e-46c9-841e-67414583bf3d', 36.50, true, NOW() - INTERVAL '7 days'),
(gen_random_uuid(), '2345bcde-6789-01ef-2345-678901abcdef', '016526cd-0513-4746-86ed-953335702906', 36.50, false, NULL),
(gen_random_uuid(), '2345bcde-6789-01ef-2345-678901abcdef', '6cb4267b-2869-44e5-aa6b-afa2a9f9da55', 36.49, false, NULL),

-- House 2 expenses
-- Yard Work Tools (split 3 ways: $198.75)
(gen_random_uuid(), '3456cdef-7890-12ef-3456-789012abcdef', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', 66.25, true, NOW() - INTERVAL '5 days'),
(gen_random_uuid(), '3456cdef-7890-12ef-3456-789012abcdef', '853685c8-0077-4699-8a7d-e5a1c061c19c', 66.25, false, NULL),
(gen_random_uuid(), '3456cdef-7890-12ef-3456-789012abcdef', 'eac293c1-2c35-47a3-9b6a-88e41057250a', 66.25, true, NOW() - INTERVAL '4 days'),

-- BBQ Supplies (split 3 ways: $134.60)
(gen_random_uuid(), '4567def0-8901-23ef-4567-890123abcdef', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', 44.87, true, NOW() - INTERVAL '2 days'),
(gen_random_uuid(), '4567def0-8901-23ef-4567-890123abcdef', '853685c8-0077-4699-8a7d-e5a1c061c19c', 44.87, true, NOW() - INTERVAL '3 days'),
(gen_random_uuid(), '4567def0-8901-23ef-4567-890123abcdef', 'eac293c1-2c35-47a3-9b6a-88e41057250a', 44.86, true, NOW() - INTERVAL '3 days'),

-- Kitchen Repair (split 3 ways: $85.00)
(gen_random_uuid(), '5678ef01-9012-34ef-5678-901234abcdef', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', 28.34, false, NULL),
(gen_random_uuid(), '5678ef01-9012-34ef-5678-901234abcdef', '853685c8-0077-4699-8a7d-e5a1c061c19c', 28.33, false, NULL),
(gen_random_uuid(), '5678ef01-9012-34ef-5678-901234abcdef', 'eac293c1-2c35-47a3-9b6a-88e41057250a', 28.33, true, NOW() - INTERVAL '12 days'),

-- Monthly Groceries (split 3 ways: $287.45)
(gen_random_uuid(), '6789f012-0123-45ef-6789-012345abcdef', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', 95.82, true, NOW() - INTERVAL '4 days'),
(gen_random_uuid(), '6789f012-0123-45ef-6789-012345abcdef', '853685c8-0077-4699-8a7d-e5a1c061c19c', 95.82, false, NULL),
(gen_random_uuid(), '6789f012-0123-45ef-6789-012345abcdef', 'eac293c1-2c35-47a3-9b6a-88e41057250a', 95.81, false, NULL),

-- House 3 expenses
-- Beach Day Supplies (split 2 ways: $76.90)
(gen_random_uuid(), 'dbd82ef9-5d97-4334-aaaa-5749a9c3ebc2', '35570297-318b-46c5-bf3c-418d05791648', 38.45, true, NOW() - INTERVAL '2 days'),
(gen_random_uuid(), 'dbd82ef9-5d97-4334-aaaa-5749a9c3ebc2', '08db68a4-7321-4398-9273-68eda1c2fac9', 38.45, true, NOW() - INTERVAL '1 day'),

-- Seafood Dinner (split 2 ways: $124.30)
(gen_random_uuid(), '89ab1234-2345-67ef-89ab-123456abcdef', '35570297-318b-46c5-bf3c-418d05791648', 62.15, false, NULL),
(gen_random_uuid(), '89ab1234-2345-67ef-89ab-123456abcdef', '08db68a4-7321-4398-9273-68eda1c2fac9', 62.15, true, NOW() - INTERVAL '5 days'),

-- Deck Cushions (split 2 ways: $189.99)
(gen_random_uuid(), '9abc2345-3456-78ef-9abc-23456789abcd', '35570297-318b-46c5-bf3c-418d05791648', 95.00, true, NOW() - INTERVAL '10 days'),
(gen_random_uuid(), '9abc2345-3456-78ef-9abc-23456789abcd', '08db68a4-7321-4398-9273-68eda1c2fac9', 94.99, false, NULL);

-- =============================================================================
-- BILLS
-- =============================================================================
INSERT INTO bills (id, house_id, description, monthly_cost, next_due_date, created_by, active, created_at, updated_at) VALUES
-- House 1: Downtown Loft bills
(gen_random_uuid(), '560a0217-180e-4112-a9f4-0e4b497f9556', 'Rent', 3200.00, '2025-11-01', '43ac31fb-5b69-43bc-b339-182eba971f73', true, NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months'),
(gen_random_uuid(), '560a0217-180e-4112-a9f4-0e4b497f9556', 'Electricity & Gas', 185.00, '2025-11-15', 'c9031aa8-8d6e-46c9-841e-67414583bf3d', true, NOW() - INTERVAL '5 months', NOW() - INTERVAL '5 months'),
(gen_random_uuid(), '560a0217-180e-4112-a9f4-0e4b497f9556', 'Internet & Cable', 129.99, '2025-11-12', '016526cd-0513-4746-86ed-953335702906', true, NOW() - INTERVAL '4 months', NOW() - INTERVAL '4 months'),
(gen_random_uuid(), '560a0217-180e-4112-a9f4-0e4b497f9556', 'Water & Sewer', 95.50, '2025-11-20', '6cb4267b-2869-44e5-aa6b-afa2a9f9da55', true, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
(gen_random_uuid(), '560a0217-180e-4112-a9f4-0e4b497f9556', 'Building Insurance', 75.00, '2025-11-28', '43ac31fb-5b69-43bc-b339-182eba971f73', true, NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),

-- House 2: Suburban House bills
(gen_random_uuid(), '670b1328-291f-5223-b0f5-1f5c608f0667', 'Mortgage Payment', 2850.00, '2025-11-03', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', true, NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months'),
(gen_random_uuid(), '670b1328-291f-5223-b0f5-1f5c608f0667', 'Property Tax', 420.00, '2025-11-30', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', true, NOW() - INTERVAL '7 months', NOW() - INTERVAL '7 months'),
(gen_random_uuid(), '670b1328-291f-5223-b0f5-1f5c608f0667', 'Electricity', 165.00, '2025-11-18', '853685c8-0077-4699-8a7d-e5a1c061c19c', true, NOW() - INTERVAL '6 months', NOW() - INTERVAL '6 months'),
(gen_random_uuid(), '670b1328-291f-5223-b0f5-1f5c608f0667', 'Natural Gas', 89.99, '2025-11-22', 'eac293c1-2c35-47a3-9b6a-88e41057250a', true, NOW() - INTERVAL '4 months', NOW() - INTERVAL '4 months'),
(gen_random_uuid(), '670b1328-291f-5223-b0f5-1f5c608f0667', 'Water & Trash', 112.50, '2025-11-25', '853685c8-0077-4699-8a7d-e5a1c061c19c', true, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
(gen_random_uuid(), '670b1328-291f-5223-b0f5-1f5c608f0667', 'Internet', 79.99, '2025-11-14', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', true, NOW() - INTERVAL '5 months', NOW() - INTERVAL '5 months'),
(gen_random_uuid(), '670b1328-291f-5223-b0f5-1f5c608f0667', 'Home Security System', 45.00, '2025-11-10', 'eac293c1-2c35-47a3-9b6a-88e41057250a', true, NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),

-- House 3: Beach Cottage bills  
(gen_random_uuid(), '780c2439-3a20-6334-c1f6-2f6d719f1778', 'Rent', 1800.00, '2025-11-05', '35570297-318b-46c5-bf3c-418d05791648', true, NOW() - INTERVAL '12 months', NOW() - INTERVAL '12 months'),
(gen_random_uuid(), '780c2439-3a20-6334-c1f6-2f6d719f1778', 'Electricity', 135.00, '2025-11-16', '08db68a4-7321-4398-9273-68eda1c2fac9', true, NOW() - INTERVAL '10 months', NOW() - INTERVAL '10 months'),
(gen_random_uuid(), '780c2439-3a20-6334-c1f6-2f6d719f1778', 'Water & Sewer', 68.75, '2025-11-08', '35570297-318b-46c5-bf3c-418d05791648', true, NOW() - INTERVAL '9 months', NOW() - INTERVAL '9 months'),
(gen_random_uuid(), '780c2439-3a20-6334-c1f6-2f6d719f1778', 'Internet', 65.99, '2025-11-11', '08db68a4-7321-4398-9273-68eda1c2fac9', true, NOW() - INTERVAL '8 months', NOW() - INTERVAL '8 months');

-- =============================================================================
-- COMMENTS (ratings between housemates)
-- =============================================================================
INSERT INTO comments (id, from_user_id, about_user_id, house_id, rating, text, created_at) VALUES
-- House 1: Downtown Loft comments
(gen_random_uuid(), 'c9031aa8-8d6e-46c9-841e-67414583bf3d', '43ac31fb-5b69-43bc-b339-182eba971f73', '560a0217-180e-4112-a9f4-0e4b497f9556', 5, 'Amazing house owner! Always on top of maintenance issues and very fair with expense splitting. Great communication.', NOW() - INTERVAL '15 days'),
(gen_random_uuid(), '016526cd-0513-4746-86ed-953335702906', '43ac31fb-5b69-43bc-b339-182eba971f73', '560a0217-180e-4112-a9f4-0e4b497f9556', 4, 'Very responsible landlord and housemate. Good at organizing house expenses and keeping things organized.', NOW() - INTERVAL '8 days'),
(gen_random_uuid(), '6cb4267b-2869-44e5-aa6b-afa2a9f9da55', '43ac31fb-5b69-43bc-b339-182eba971f73', '560a0217-180e-4112-a9f4-0e4b497f9556', 5, 'Best housemate experience! John is super helpful and makes living here enjoyable.', NOW() - INTERVAL '12 days'),
(gen_random_uuid(), '43ac31fb-5b69-43bc-b339-182eba971f73', 'c9031aa8-8d6e-46c9-841e-67414583bf3d', '560a0217-180e-4112-a9f4-0e4b497f9556', 5, 'Jane is fantastic! Always cleans up after herself and contributes positively to house activities.', NOW() - INTERVAL '5 days'),
(gen_random_uuid(), '016526cd-0513-4746-86ed-953335702906', 'c9031aa8-8d6e-46c9-841e-67414583bf3d', '560a0217-180e-4112-a9f4-0e4b497f9556', 4, 'Great roommate. Jane always pays her share on time and is very considerate.', NOW() - INTERVAL '10 days'),
(gen_random_uuid(), '43ac31fb-5b69-43bc-b339-182eba971f73', '016526cd-0513-4746-86ed-953335702906', '560a0217-180e-4112-a9f4-0e4b497f9556', 4, 'Mike brings great energy to the house. Sometimes a bit messy but overall a solid housemate.', NOW() - INTERVAL '7 days'),
(gen_random_uuid(), 'c9031aa8-8d6e-46c9-841e-67414583bf3d', '6cb4267b-2869-44e5-aa6b-afa2a9f9da55', '560a0217-180e-4112-a9f4-0e4b497f9556', 5, 'Sarah is the best! Super friendly, always helps with groceries, and great at movie night planning.', NOW() - INTERVAL '3 days'),

-- House 2: Suburban House comments
(gen_random_uuid(), '853685c8-0077-4699-8a7d-e5a1c061c19c', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', '670b1328-291f-5223-b0f5-1f5c608f0667', 5, 'Alex is an excellent house owner. Fair with bills and always fixes things quickly. Love the BBQs!', NOW() - INTERVAL '20 days'),
(gen_random_uuid(), 'eac293c1-2c35-47a3-9b6a-88e41057250a', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', '670b1328-291f-5223-b0f5-1f5c608f0667', 4, 'Good homeowner, keeps the yard looking great. Sometimes takes charge a bit too much but overall positive.', NOW() - INTERVAL '14 days'),
(gen_random_uuid(), 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', '853685c8-0077-4699-8a7d-e5a1c061c19c', '670b1328-291f-5223-b0f5-1f5c608f0667', 5, 'Emily is amazing! Always keeps the kitchen spotless and brings the best snacks for our hangouts.', NOW() - INTERVAL '6 days'),
(gen_random_uuid(), 'eac293c1-2c35-47a3-9b6a-88e41057250a', '853685c8-0077-4699-8a7d-e5a1c061c19c', '670b1328-291f-5223-b0f5-1f5c608f0667', 4, 'Emily is really considerate and fun to live with. Good at keeping track of shared expenses.', NOW() - INTERVAL '9 days'),
(gen_random_uuid(), 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', 'eac293c1-2c35-47a3-9b6a-88e41057250a', '670b1328-291f-5223-b0f5-1f5c608f0667', 3, 'Chris is okay as a housemate. Sometimes forgets to pay bills on time but friendly enough.', NOW() - INTERVAL '11 days'),
(gen_random_uuid(), '853685c8-0077-4699-8a7d-e5a1c061c19c', 'eac293c1-2c35-47a3-9b6a-88e41057250a', '670b1328-291f-5223-b0f5-1f5c608f0667', 4, 'Chris is pretty chill. Good to hang out with and helps with yard work when asked.', NOW() - INTERVAL '4 days'),

-- House 3: Beach Cottage comments
(gen_random_uuid(), '08db68a4-7321-4398-9273-68eda1c2fac9', '35570297-318b-46c5-bf3c-418d05791648', '780c2439-3a20-6334-c1f6-2f6d719f1778', 5, 'Lisa is perfect! Living by the beach with her has been incredible. She knows all the best seafood spots.', NOW() - INTERVAL '25 days'),
(gen_random_uuid(), '35570297-318b-46c5-bf3c-418d05791648', '08db68a4-7321-4398-9273-68eda1c2fac9', '780c2439-3a20-6334-c1f6-2f6d719f1778', 5, 'David is the ideal housemate. Very reliable with expenses and always up for beach activities. Great cook too!', NOW() - INTERVAL '18 days');

-- =============================================================================
-- BULLETIN NOTES
-- =============================================================================
INSERT INTO bulletin_notes (id, house_id, user_id, message, dismiss_date, created_at) VALUES
-- House 1: Downtown Loft notes
(gen_random_uuid(), '560a0217-180e-4112-a9f4-0e4b497f9556', '43ac31fb-5b69-43bc-b339-182eba971f73', 'Reminder: Apartment inspection on November 15th. Please keep common areas tidy!', '2025-11-15', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), '560a0217-180e-4112-a9f4-0e4b497f9556', 'c9031aa8-8d6e-46c9-841e-67414583bf3d', 'Movie night this Friday at 8pm! I''ll order pizza if everyone chips in 🍕', NULL, NOW() - INTERVAL '2 days'),
(gen_random_uuid(), '560a0217-180e-4112-a9f4-0e4b497f9556', '016526cd-0513-4746-86ed-953335702906', 'WiFi password changed to: Downtown2025!', NULL, NOW() - INTERVAL '1 week'),
(gen_random_uuid(), '560a0217-180e-4112-a9f4-0e4b497f9556', '6cb4267b-2869-44e5-aa6b-afa2a9f9da55', 'Don''t forget to water the plants this weekend while I''m away! Thanks! 🌱', '2025-11-02', NOW() - INTERVAL '5 days'),

-- House 2: Suburban House notes  
(gen_random_uuid(), '670b1328-291f-5223-b0f5-1f5c608f0667', 'af1164b0-621b-4bfd-a1a0-eb452aa2258e', 'BBQ party this Saturday 2pm! Inviting some friends, let me know if you want to join 🔥', NULL, NOW() - INTERVAL '1 day'),
(gen_random_uuid(), '670b1328-291f-5223-b0f5-1f5c608f0667', '853685c8-0077-4699-8a7d-e5a1c061c19c', 'Grocery run tomorrow morning. Send me your lists! 🛒', '2025-10-28', NOW() - INTERVAL '2 days'),
(gen_random_uuid(), '670b1328-291f-5223-b0f5-1f5c608f0667', 'eac293c1-2c35-47a3-9b6a-88e41057250a', 'Lawn mower is in the garage if anyone wants to help with yard work. Beer provided! 🍺', NULL, NOW() - INTERVAL '4 days'),

-- House 3: Beach Cottage notes
(gen_random_uuid(), '780c2439-3a20-6334-c1f6-2f6d719f1778', '35570297-318b-46c5-bf3c-418d05791648', 'Tide is perfect for surfing this weekend! Anyone want to join? 🏄‍♀️', '2025-10-29', NOW() - INTERVAL '3 days'),
(gen_random_uuid(), '780c2439-3a20-6334-c1f6-2f6d719f1778', '08db68a4-7321-4398-9273-68eda1c2fac9', 'Fresh catch from the pier! Cooking seafood paella tonight if you''re interested 🦐', NULL, NOW() - INTERVAL '6 hours');
