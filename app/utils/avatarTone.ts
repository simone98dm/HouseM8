// The five avatar hues (avatar.css). A stable hash of the person's key picks
// one, so a person keeps the same colour everywhere: avatar fill, and the ink
// of their name where it is highlighted (DESIGN.md / FIX-PLAN T2.6).
export const AVATAR_TONES = ['a', 'b', 'c', 'd', 'e'] as const;
export type AvatarTone = (typeof AVATAR_TONES)[number];

export const avatarTone = (key: string): AvatarTone => {
  const hash = [...key].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return AVATAR_TONES[hash % AVATAR_TONES.length]!;
};

// OKLCh hue per tone, so a Blobatar is drawn in the same family as the
// person's name ink (avatar.css `.avatar-ink-*`): blue, purple, green, orange,
// red.
export const AVATAR_HUES: Record<AvatarTone, number> = {
  a: 260,
  b: 300,
  c: 160,
  d: 50,
  e: 25,
};
