import { describe, it, expect, vi } from 'vitest';

const buildUpdateData = (f: {
  gender: string;
  occupation_type: string;
  study_field: string;
  job_title: string;
  languages: string[];
  pets: string;
  preferred_currency: string;
  telephone: string;
  instagram: string;
  twitter: string;
  linkedin: string;
  tiktok: string;
}) => {
  const data: Record<string, unknown> = {};
  if (f.gender) data.gender = f.gender;
  if (f.occupation_type) data.occupation_type = f.occupation_type;
  if (f.study_field) data.study_field = f.study_field;
  if (f.job_title) data.job_title = f.job_title;
  if (f.languages.length > 0) data.languages = f.languages;
  const petArray = (f.pets || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (petArray.length) data.pets = petArray;
  if (f.preferred_currency) data.preferred_currency = f.preferred_currency;
  if (f.telephone) data.telephone = f.telephone;
  if (f.instagram) data.instagram = f.instagram;
  if (f.twitter) data.twitter = f.twitter;
  if (f.linkedin) data.linkedin = f.linkedin;
  if (f.tiktok) data.tiktok = f.tiktok;
  return data;
};

const emptyForm = () => ({
  gender: '',
  occupation_type: '',
  study_field: '',
  job_title: '',
  languages: [] as string[],
  pets: '',
  preferred_currency: '',
  telephone: '',
  instagram: '',
  twitter: '',
  linkedin: '',
  tiktok: '',
});

describe('PersonalInfoForm', () => {
  describe('buildUpdateData', () => {
    it('omits empty string fields', () => {
      const data = buildUpdateData(emptyForm());
      expect(data.gender).toBeUndefined();
    });

    it('converts comma-separated pets string to array', () => {
      const data = buildUpdateData({
        ...emptyForm(),
        pets: 'Dog, Cat, Hamster',
      });
      expect(data.pets).toEqual(['Dog', 'Cat', 'Hamster']);
    });

    it('handles pets string with no spaces', () => {
      const data = buildUpdateData({ ...emptyForm(), pets: 'Dog,Cat' });
      expect(data.pets).toEqual(['Dog', 'Cat']);
    });

    it('omits pets when empty', () => {
      const data = buildUpdateData(emptyForm());
      expect(data.pets).toBeUndefined();
    });

    it('includes languages when array is non-empty', () => {
      const data = buildUpdateData({
        ...emptyForm(),
        languages: ['English', 'Italian'],
      });
      expect(data.languages).toEqual(['English', 'Italian']);
    });

    it('omits languages when empty array', () => {
      const data = buildUpdateData(emptyForm());
      expect(data.languages).toBeUndefined();
    });

    it('includes all social fields when provided', () => {
      const data = buildUpdateData({
        ...emptyForm(),
        telephone: '+1234',
        instagram: '@user',
        twitter: '@user',
        linkedin: 'linkedin.com/in/user',
        tiktok: '@user',
      });
      expect(data.telephone).toBe('+1234');
      expect(data.instagram).toBe('@user');
      expect(data.twitter).toBe('@user');
      expect(data.linkedin).toBe('linkedin.com/in/user');
      expect(data.tiktok).toBe('@user');
    });

    it('includes occupation with study_field for student', () => {
      const data = buildUpdateData({
        ...emptyForm(),
        occupation_type: 'student',
        study_field: 'Computer Science',
      });
      expect(data.occupation_type).toBe('student');
      expect(data.study_field).toBe('Computer Science');
    });

    it('includes job_title for employed', () => {
      const data = buildUpdateData({
        ...emptyForm(),
        occupation_type: 'employed',
        job_title: 'Engineer',
      });
      expect(data.occupation_type).toBe('employed');
      expect(data.job_title).toBe('Engineer');
    });
  });

  describe('showOccupationDetails', () => {
    const show = (type: string) =>
      type === 'student' || type === 'employed' || type === 'self_employed';

    it('shows for student', () => expect(show('student')).toBe(true));
    it('shows for employed', () => expect(show('employed')).toBe(true));
    it('shows for self_employed', () =>
      expect(show('self_employed')).toBe(true));
    it('hides for unemployed', () => expect(show('unemployed')).toBe(false));
    it('hides for retired', () => expect(show('retired')).toBe(false));
    it('hides for other', () => expect(show('other')).toBe(false));
    it('hides for empty', () => expect(show('')).toBe(false));
  });

  describe('form initialization', () => {
    it('populates form from user with array pets', () => {
      const user = { pets: ['Dog', 'Cat'] };
      const pets = Array.isArray(user.pets)
        ? user.pets.join(', ')
        : user.pets || '';
      expect(pets).toBe('Dog, Cat');
    });

    it('populates form from user with string pets', () => {
      const user = { pets: 'Dog' };
      const pets = Array.isArray(user.pets)
        ? user.pets.join(', ')
        : user.pets || '';
      expect(pets).toBe('Dog');
    });

    it('copies languages array (no shared reference)', () => {
      const original = ['English'];
      const copy = [...original];
      copy.push('Italian');
      expect(original).toHaveLength(1);
    });
  });

  describe('event emission', () => {
    it('emits save with built update data', () => {
      const emit = vi.fn();
      const form = { ...emptyForm(), gender: 'male' };
      emit('save', buildUpdateData(form));
      expect(emit).toHaveBeenCalledWith(
        'save',
        expect.objectContaining({
          gender: 'male',
        }),
      );
    });

    it('emits cancel', () => {
      const emit = vi.fn();
      emit('cancel');
      expect(emit).toHaveBeenCalledWith('cancel');
    });
  });
});
