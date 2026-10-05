import '@testing-library/jest-dom';

jest.mock('@/components/public/modern-luxury-3d-hero', () => ({
  ModernLuxury3DHero: () => {
    const element = document.createElement('div');
    element.setAttribute('data-testid', 'modern-luxury-3d-hero');
    element.setAttribute('aria-hidden', 'true');
    return element;
  },
}));
