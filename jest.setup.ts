import '@testing-library/jest-dom';
import { createElement } from 'react';

jest.mock('@/components/public/modern-luxury-3d-hero', () => ({
  ModernLuxury3DHero: () =>
    createElement('div', {
      'data-testid': 'modern-luxury-3d-hero',
      'aria-hidden': 'true',
    }),
}));
