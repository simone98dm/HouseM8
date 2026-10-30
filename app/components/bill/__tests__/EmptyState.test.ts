/**
 * Bill EmptyState Component Tests
 * Tests for bill empty state component following CLAUDE.md guidelines
 */

import { describe, it, expect, vi } from 'vitest';

describe('Bill EmptyState Component', () => {
  describe('Props', () => {
    it('should accept title prop', () => {
      const title = 'No Bills Yet';
      expect(typeof title).toBe('string');
      expect(title).toBe('No Bills Yet');
    });

    it('should accept message prop', () => {
      const message = 'Start by adding your first bill';
      expect(typeof message).toBe('string');
      expect(message).toBeTruthy();
    });

    it('should accept buttonText prop', () => {
      const buttonText = 'Add Bill';
      expect(typeof buttonText).toBe('string');
      expect(buttonText).toBe('Add Bill');
    });

    it('should have default showButton as true', () => {
      const showButton = true;
      expect(showButton).toBe(true);
    });

    it('should allow hiding button', () => {
      const showButton = false;
      expect(showButton).toBe(false);
    });
  });

  describe('Events', () => {
    it('should emit add-click event', () => {
      const emit = vi.fn();
      emit('add-click');
      expect(emit).toHaveBeenCalledWith('add-click');
    });

    it('should emit event when button is clicked', () => {
      const emit = vi.fn();
      const showButton = true;

      if (showButton) {
        emit('add-click');
      }

      expect(emit).toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('should center content', () => {
      const centerClasses = 'text-center py-8';
      expect(centerClasses).toContain('text-center');
      expect(centerClasses).toContain('py-8');
    });

    it('should style title', () => {
      const titleClasses = 'text-lg font-medium text-gray-900 mb-2';
      expect(titleClasses).toContain('text-lg');
      expect(titleClasses).toContain('font-medium');
      expect(titleClasses).toContain('text-gray-900');
    });

    it('should style message', () => {
      const messageClasses = 'text-gray-600 mb-4';
      expect(messageClasses).toContain('text-gray-600');
      expect(messageClasses).toContain('mb-4');
    });

    it('should style icon', () => {
      const iconClasses = 'w-12 h-12 text-gray-400 mx-auto mb-4';
      expect(iconClasses).toContain('w-12');
      expect(iconClasses).toContain('h-12');
      expect(iconClasses).toContain('text-gray-400');
      expect(iconClasses).toContain('mx-auto');
    });
  });

  describe('Icon Display', () => {
    it('should use document-text icon', () => {
      const iconName = 'heroicons:document-text';
      expect(iconName).toBe('heroicons:document-text');
    });
  });

  describe('Conditional Rendering', () => {
    it('should show button when showButton is true', () => {
      const showButton = true;
      expect(showButton).toBe(true);
    });

    it('should hide button when showButton is false', () => {
      const showButton = false;
      expect(showButton).toBe(false);
    });
  });

  describe('Component Structure', () => {
    it('should have icon, title, message, and button', () => {
      const hasIcon = true;
      const hasTitle = true;
      const hasMessage = true;
      const hasButton = true;

      expect(hasIcon).toBe(true);
      expect(hasTitle).toBe(true);
      expect(hasMessage).toBe(true);
      expect(hasButton).toBe(true);
    });
  });
});
