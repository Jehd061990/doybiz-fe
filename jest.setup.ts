import '@testing-library/jest-dom';

jest.mock('@/components/public/modern-luxury-3d-hero', () => ({
  ModernLuxury3DHero: () => <div data-testid="modern-luxury-3d-hero" aria-hidden="true" />,
}));
