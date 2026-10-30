-- House role model (owner / admin / member)
--
-- owner  : exactly one per house. Full control. Cannot be demoted, cannot be
--          removed, cannot leave. Archiving the house is the owner's only exit.
-- admin  : delegated. Everything a member can do, plus add members and generate
--          invitation links, plus promote other members to admin. Many allowed.
-- member : base role.

-- 1. allow the delegated role
ALTER TABLE house_members DROP CONSTRAINT IF EXISTS house_members_role_check;
ALTER TABLE house_members
  ADD CONSTRAINT house_members_role_check
  CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text]));

-- 2. "exactly one owner per house" was only ever an intention; nothing enforced
--    it, so two rows could both be 'owner'. Partial unique index over active
--    memberships only, so a departed owner row never blocks the live one.
CREATE UNIQUE INDEX IF NOT EXISTS house_members_one_owner_per_house
  ON house_members (house_id)
  WHERE role = 'owner' AND left_at IS NULL;

-- 3. houses.owner_id duplicated house_members.role and the two silently drifted
--    apart in practice. The server already treats the role as canonical
--    (repos.houses.isOwner reads house_members.role), so re-point any stale
--    owner_id at the role holder rather than leaving two disagreeing sources.
UPDATE houses h
SET owner_id = hm.user_id
FROM house_members hm
WHERE hm.house_id = h.id
  AND hm.role = 'owner'
  AND hm.left_at IS NULL
  AND h.owner_id IS DISTINCT FROM hm.user_id;
