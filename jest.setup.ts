import '@testing-library/jest-dom';

jest.mock('@/components/public/modern-luxury-3d-hero', () => ({
  ModernLuxury3DHero: () => {
    const React = require('react') as typeof import('react');
    return React.createElement('div', {
      'data-testid': 'modern-luxury-3d-hero',
      'aria-hidden': 'true',
    });
  },
}));
