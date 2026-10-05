import '@testing-library/jest-dom';

jest.mock('@/components/public/modern-luxury-3d-hero', () => ({
  ModernLuxury3DHero: () => null,
}));
