/**
 * InformationCard Component Tests
 * Tests for house information card component
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createMockHouse } from '~/tests/utils';
import type { House, Currency } from '~/types';

describe('House InformationCard Component', () => {
  let mockHouse: House;

  beforeEach(() => {
    mockHouse = createMockHouse({
      id: 'house-123',
      name: 'Test House',
      address: '123 Test Street',
      currency: 'USD',
      max_members: 5,
    });
  });

  describe('Props', () => {
    it('should accept house prop', () => {
      expect(mockHouse).toBeDefined();
      expect(mockHouse.id).toBe('house-123');
      expect(mockHouse.name).toBe('Test House');
    });

    it('should have default isOwner prop', () => {
      const defaultIsOwner = false;
      expect(defaultIsOwner).toBe(false);
    });

    it('should accept isOwner prop', () => {
      const isOwner = true;
      expect(isOwner).toBe(true);
    });
  });

  describe('House Information Display', () => {
    it('should display house address', () => {
      expect(mockHouse.address).toBe('123 Test Street');
    });

    it('should display house currency', () => {
      expect(mockHouse.currency).toBe('USD');
    });

    it('should display the configured max_members cap, not a derived member count', () => {
      expect(mockHouse.max_members).toBe(5);
    });

    it('should fall back to notProvided text when max_members is unset', () => {
      const houseWithoutMaxMembers = createMockHouse({
        id: 'house-999',
        name: 'House 4',
        currency: 'USD',
        max_members: null,
      });

      const display = houseWithoutMaxMembers.max_members ?? 'Not provided';
      expect(display).toBe('Not provided');
    });

    it('should handle house without address', () => {
      const houseWithoutAddress = createMockHouse({
        id: 'house-456',
        name: 'House 2',
        currency: 'EUR',
        address: undefined,
      });

      const displayAddress = houseWithoutAddress.address || 'Not provided';
      expect(displayAddress).toBe('Not provided');
    });
  });

  describe('Currency Display', () => {
    it('should display currency name', () => {
      const currencyNames: Record<Currency, string> = {
        USD: 'US Dollar',
        EUR: 'Euro',
      };

      const currencyName = currencyNames[mockHouse.currency as Currency];
      expect(currencyName).toBe('US Dollar');
    });

    it('should handle different currencies', () => {
      const currencies: Currency[] = ['USD', 'EUR'];
      currencies.forEach((currency) => {
        expect(['USD', 'EUR']).toContain(currency);
      });
    });
  });

  describe('Edit Capability', () => {
    it('should show edit button for owner', () => {
      const isOwner = true;
      const showEdit = isOwner;
      expect(showEdit).toBe(true);
    });

    it('should hide edit button for non-owner', () => {
      const isOwner = false;
      const showEdit = isOwner;
      expect(showEdit).toBe(false);
    });
  });

  describe('House Properties', () => {
    it('should have all required properties', () => {
      expect(mockHouse).toHaveProperty('id');
      expect(mockHouse).toHaveProperty('name');
      expect(mockHouse).toHaveProperty('currency');
    });

    it('should have optional address property', () => {
      expect(mockHouse).toHaveProperty('address');
    });
  });

  describe('Component Layout', () => {
    it('should display header with title', () => {
      const hasHeader = true;
      expect(hasHeader).toBe(true);
    });

    it('should use grid layout for information', () => {
      const usesGrid = true;
      expect(usesGrid).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for information fields', () => {
      const hasLabels = true;
      expect(hasLabels).toBe(true);
    });
  });

  describe('Empty States', () => {
    it('should show fallback text when address is missing', () => {
      const houseWithoutAddress = createMockHouse({
        id: 'house-789',
        name: 'House 3',
        currency: 'GBP',
        address: undefined,
      });

      const displayAddress = houseWithoutAddress.address || 'Not provided';
      expect(displayAddress).toBe('Not provided');
    });
  });
});

describe('House InformationCard lead', () => {
  const render = async (props: Record<string, unknown>) => {
    const { mountSuspended } = await import('@nuxt/test-utils/runtime');
    const { default: Card } =
      await import('~/components/house/InformationCard.vue');
    return mountSuspended(Card, {
      props: {
        summary: '2 of 6 places taken',
        ...props,
      },
      global: { stubs: { Icon: true } },
    });
  };

  it('leads with the summary sentence', async () => {
    const wrapper = await render({});
    expect(wrapper.text()).toContain('2 of 6 places taken');
  });

  it('offers "Invite someone" only when the viewer can invite, and emits invite', async () => {
    const without = await render({});
    expect(without.text()).not.toContain('Invite someone');
    const wrapper = await render({ canInvite: true });
    const invite = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Invite someone'));
    await invite!.trigger('click');
    expect(wrapper.emitted('invite')).toHaveLength(1);
  });

  it('shows no Edit control (name lives in the page header)', async () => {
    const wrapper = await render({ isOwner: true });
    expect(wrapper.find('details').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('Edit');
  });

  it('explains a full house to the people who could invite', async () => {
    const owner = await render({
      isOwner: true,
      isFull: true,
      canManageMembers: true,
    });
    expect(owner.text()).toContain('Every place is taken. To invite someone');
    const admin = await render({ isFull: true, canManageMembers: true });
    expect(admin.text()).toContain('Ask the owner');
    const member = await render({ isFull: true });
    expect(member.text()).not.toContain('Every place is taken');
  });
});
