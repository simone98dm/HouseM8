import { describe, it, expect } from 'vitest';
import { mountSuspended } from '@nuxt/test-utils/runtime';
import { blobatarUri } from 'blobatar/uri';
import UserAvatar from '~/components/ui/UserAvatar.vue';
import { AVATAR_HUES, avatarTone } from '~/utils/avatarTone';

const makeUser = (firstName: string, lastName: string, id = 'u-1') => ({
  id,
  first_name: firstName,
  last_name: lastName,
  email: 'test@example.com',
  avatar_url: 'https://example.com/uploaded.png',
});

const srcOf = async (props: Record<string, unknown>) => {
  const wrapper = await mountSuspended(UserAvatar, { props });
  return wrapper.find('img').attributes('src');
};

describe('UserAvatar (Blobatar)', () => {
  it('draws a Blobatar from the user id in the person tone', async () => {
    const src = await srcOf({ user: makeUser('John', 'Doe') });
    expect(src).toBe(
      blobatarUri('u-1', {
        background: 'circle',
        hue: AVATAR_HUES[avatarTone('u-1')],
      }),
    );
  });

  it('never shows an uploaded picture, even when the user has one', async () => {
    const src = await srcOf({ user: makeUser('John', 'Doe') });
    expect(src).not.toContain('example.com');
    expect(src?.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('keeps the same face when the name changes or is missing', async () => {
    const a = await srcOf({ user: makeUser('Jo', '') });
    const b = await srcOf({ user: makeUser('John', 'Doe') });
    expect(a).toBe(b);
  });

  it('changes shape as the name changes with liveName', async () => {
    const a = await srcOf({ user: makeUser('Jo', ''), liveName: true });
    const b = await srcOf({ user: makeUser('John', ''), liveName: true });
    expect(a).not.toBe(b);
  });

  it('is the same avatar for the same person everywhere', async () => {
    const a = await srcOf({ user: makeUser('Ada', 'Lovelace') });
    const b = await srcOf({ user: makeUser('Ada', 'Lovelace') });
    expect(a).toBe(b);
  });

  it('falls back to the id when there is no name yet, and to ? with no user', async () => {
    const noName = await srcOf({
      user: makeUser('', '', 'u-9'),
      liveName: true,
    });
    expect(noName).toBe(
      blobatarUri('u-9', {
        background: 'circle',
        hue: AVATAR_HUES[avatarTone('u-9')],
      }),
    );
    expect(await srcOf({ user: null })).toContain('data:image/svg+xml');
  });

  it.each([
    ['xs', 'size-6'],
    ['sm', 'size-8'],
    ['md', 'size-10'],
    ['lg', 'size-12'],
  ])('renders the %s size', async (size, cls) => {
    const wrapper = await mountSuspended(UserAvatar, {
      props: { user: makeUser('A', 'B'), size },
    });
    expect(wrapper.classes()).toContain(cls);
  });

  it('is decorative by default and an image when labelled', async () => {
    const plain = await mountSuspended(UserAvatar, {
      props: { user: makeUser('A', 'B') },
    });
    expect(plain.attributes('aria-hidden')).toBe('true');
    expect(plain.find('img').attributes('alt')).toBe('');

    const labelled = await mountSuspended(UserAvatar, {
      props: { user: makeUser('A', 'B'), ariaLabel: 'Your avatar' },
    });
    expect(labelled.attributes('role')).toBe('img');
    expect(labelled.attributes('aria-label')).toBe('Your avatar');
    expect(labelled.attributes('aria-hidden')).toBeUndefined();
  });
});
