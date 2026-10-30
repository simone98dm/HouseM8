import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import PersonalInfoPictures from '~/components/user/profile/PersonalInfoPictures.vue';
import { createMockUser } from '~/tests/utils';

let mockFlags: Record<string, boolean> = {};
const uploadPicture = vi.fn();
const deletePicture = vi.fn();
const notifyError = vi.fn();

mockNuxtImport('useFeatureFlags', () => () => ({
  isEnabled: (flag: string) => mockFlags[flag] ?? false,
}));

mockNuxtImport('useUserApi', () => () => ({
  uploadPicture,
  deletePicture,
}));

mockNuxtImport('useNotificationStore', () => () => ({
  error: notifyError,
}));

const grantSharing = () => {
  useConsentsStore().consents = [
    {
      id: 'c-1',
      purpose: 'profile_sharing',
      version: 2,
      granted_at: '2026-10-26T00:00:00Z',
      withdrawn_at: null,
    },
  ];
};

const G = { mocks: { $t: (k: string) => k }, stubs: { Icon: true } };

describe('PersonalInfoPictures', () => {
  beforeEach(() => {
    mockFlags = { showProfilePicture: true };
    useConsentsStore().consents = [];
    uploadPicture.mockReset();
    deletePicture.mockReset();
    notifyError.mockReset();
  });

  it('renders nothing when there are no pictures and uploads are disabled', async () => {
    mockFlags = {};
    const wrapper = await mountSuspended(PersonalInfoPictures, {
      props: { user: createMockUser({ profile_pictures: [] }) },
      global: G,
    });
    expect(wrapper.find('[class*=relative]').exists()).toBe(false);
  });

  it('shows the carousel when the user has profile pictures', async () => {
    const wrapper = await mountSuspended(PersonalInfoPictures, {
      props: {
        user: createMockUser({ profile_pictures: ['a.jpg', 'b.jpg'] }),
      },
      global: { ...G, stubs: { ...G.stubs, UiCarousel: true } },
    });
    expect(wrapper.findComponent({ name: 'UiCarousel' }).exists()).toBe(true);
  });

  it('shows delete buttons for own profile with pictures when uploads are enabled', async () => {
    const wrapper = await mountSuspended(PersonalInfoPictures, {
      props: {
        user: createMockUser({ profile_pictures: ['a.jpg'] }),
        isOwnProfile: true,
      },
      global: { ...G, stubs: { ...G.stubs, UiCarousel: true } },
    });
    expect(
      wrapper.findAllComponents({ name: 'UiButton' }).length,
    ).toBeGreaterThan(0);
  });

  it('hides the upload section without the profile-sharing consent', async () => {
    const wrapper = await mountSuspended(PersonalInfoPictures, {
      props: {
        user: createMockUser({ profile_pictures: [] }),
        isOwnProfile: true,
      },
      global: { ...G, stubs: { ...G.stubs, UiPictureUpload: true } },
    });
    expect(wrapper.findComponent({ name: 'UiPictureUpload' }).exists()).toBe(
      false,
    );
  });

  it('shows the upload section for own profile under the 6-picture limit', async () => {
    grantSharing();
    const wrapper = await mountSuspended(PersonalInfoPictures, {
      props: {
        user: createMockUser({ profile_pictures: [] }),
        isOwnProfile: true,
      },
      global: { ...G, stubs: { ...G.stubs, UiPictureUpload: true } },
    });
    expect(wrapper.findComponent({ name: 'UiPictureUpload' }).exists()).toBe(
      true,
    );
  });

  it('hides the upload section once 6 pictures exist', async () => {
    grantSharing();
    const wrapper = await mountSuspended(PersonalInfoPictures, {
      props: {
        user: createMockUser({
          profile_pictures: ['1', '2', '3', '4', '5', '6'],
        }),
        isOwnProfile: true,
      },
      global: {
        ...G,
        stubs: { ...G.stubs, UiCarousel: true, UiPictureUpload: true },
      },
    });
    expect(wrapper.findComponent({ name: 'UiPictureUpload' }).exists()).toBe(
      false,
    );
  });

  it('emits save with the updated pictures on successful delete', async () => {
    deletePicture.mockResolvedValue({ profile_pictures: ['b.jpg'] });
    const wrapper = await mountSuspended(PersonalInfoPictures, {
      props: {
        user: createMockUser({ profile_pictures: ['a.jpg', 'b.jpg'] }),
        isOwnProfile: true,
      },
      global: { ...G, stubs: { ...G.stubs, UiCarousel: true } },
    });
    const deleteButton = wrapper.findComponent({ name: 'UiButton' });
    await deleteButton.trigger('click');
    expect(deletePicture).toHaveBeenCalledWith(0);
    expect(wrapper.emitted('save')?.[0]).toEqual([
      { profile_pictures: ['b.jpg'] },
    ]);
  });

  it('notifies an error when delete fails', async () => {
    deletePicture.mockResolvedValue(null);
    const wrapper = await mountSuspended(PersonalInfoPictures, {
      props: {
        user: createMockUser({ profile_pictures: ['a.jpg'] }),
        isOwnProfile: true,
      },
      global: { ...G, stubs: { ...G.stubs, UiCarousel: true } },
    });
    const deleteButton = wrapper.findComponent({ name: 'UiButton' });
    await deleteButton.trigger('click');
    expect(notifyError).toHaveBeenCalled();
    expect(wrapper.emitted('save')).toBeUndefined();
  });

  it('lets the owner delete pictures even without the profile-sharing consent', async () => {
    deletePicture.mockResolvedValue({ profile_pictures: [] });
    const wrapper = await mountSuspended(PersonalInfoPictures, {
      props: {
        user: createMockUser({ profile_pictures: ['a.jpg'] }),
        isOwnProfile: true,
      },
      global: { ...G, stubs: { ...G.stubs, UiCarousel: true } },
    });
    await wrapper.findComponent({ name: 'UiButton' }).trigger('click');
    expect(deletePicture).toHaveBeenCalledWith(0);
  });

  describe('upload', () => {
    const mountUpload = async () => {
      grantSharing();
      return mountSuspended(PersonalInfoPictures, {
        props: {
          user: createMockUser({ profile_pictures: [] }),
          isOwnProfile: true,
        },
        global: { ...G, stubs: { ...G.stubs, UiPictureUpload: true } },
      });
    };
    const pick = async (wrapper: Awaited<ReturnType<typeof mountUpload>>) => {
      const file = new File(['x'], 'p.png', { type: 'image/png' });
      wrapper
        .findComponent({ name: 'UiPictureUpload' })
        .vm.$emit('update:modelValue', file);
      await wrapper.vm.$nextTick();
      return file;
    };

    it('shows the upload button only after a file is picked', async () => {
      const wrapper = await mountUpload();
      expect(wrapper.findAllComponents({ name: 'UiButton' })).toHaveLength(0);
      await pick(wrapper);
      expect(wrapper.findAllComponents({ name: 'UiButton' })).toHaveLength(1);
    });

    it('uploads, emits save with the new pictures and clears the selection', async () => {
      uploadPicture.mockResolvedValue({
        user: { profile_pictures: ['n.jpg'] },
      });
      const wrapper = await mountUpload();
      const file = await pick(wrapper);
      await wrapper.findComponent({ name: 'UiButton' }).trigger('click');
      await flushPromises();
      expect(uploadPicture).toHaveBeenCalledWith(file);
      expect(wrapper.emitted('save')?.[0]).toEqual([
        { profile_pictures: ['n.jpg'] },
      ]);
      expect(wrapper.findAllComponents({ name: 'UiButton' })).toHaveLength(0);
    });

    it('notifies an error and keeps the selection when the upload fails', async () => {
      uploadPicture.mockResolvedValue(null);
      const wrapper = await mountUpload();
      await pick(wrapper);
      await wrapper.findComponent({ name: 'UiButton' }).trigger('click');
      await flushPromises();
      expect(notifyError).toHaveBeenCalled();
      expect(wrapper.emitted('save')).toBeUndefined();
      expect(wrapper.findAllComponents({ name: 'UiButton' })).toHaveLength(1);
    });
  });
});
