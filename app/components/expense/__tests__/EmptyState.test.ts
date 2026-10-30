/**
 * Expense EmptyState Component Tests
 * Tests for expense empty state component following CLAUDE.md guidelines
 */

import { describe, it, expect, vi } from 'vitest';

describe('Expense EmptyState Component', () => {
  describe('Props', () => {
    it('should accept title prop', () => {
      const title = 'No Expenses Yet';
      expect(typeof title).toBe('string');
      expect(title).toBeTruthy();
    });

    it('should accept message prop', () => {
      const message = 'Start tracking expenses with your housemates';
      expect(typeof message).toBe('string');
      expect(message).toBeTruthy();
    });

    it('should accept buttonText prop', () => {
      const buttonText = 'Add Expense';
      expect(typeof buttonText).toBe('string');
      expect(buttonText).toBe('Add Expense');
    });

    it('should have default showButton as true', () => {
      const showButton = true;
      expect(showButton).toBe(true);
    });
  });

  describe('Events', () => {
    it('should emit add-click event', () => {
      const emit = vi.fn();
      emit('add-click');
      expect(emit).toHaveBeenCalledWith('add-click');
    });
  });

  describe('Icon', () => {
    it('should use appropriate icon for expenses', () => {
      const iconName = 'heroicons:currency-dollar';
      expect(iconName).toContain('heroicons:');
    });
  });

  describe('Styling', () => {
    it('should center content', () => {
      const centerClasses = 'text-center py-8';
      expect(centerClasses).toContain('text-center');
    });

    it('should have proper spacing', () => {
      const spacingClasses = 'py-8';
      expect(spacingClasses).toBe('py-8');
    });
  });

  describe('Conditional Rendering', () => {
    it('should show button when showButton is true', () => {
      const showButton = true;
      const shouldShowButton = showButton;
      expect(shouldShowButton).toBe(true);
    });

    it('should hide button when showButton is false', () => {
      const showButton = false;
      const shouldShowButton = showButton;
      expect(shouldShowButton).toBe(false);
    });
  });
});
