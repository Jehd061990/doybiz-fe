import { render, screen } from '@testing-library/react';
import { WebsiteManagementPage } from './website-management-page';

const mockRefetch = jest.fn();
const mockMutate = jest.fn();

jest.mock('@refinedev/core', () => ({
  useCustom: () => ({
    result: { data: {
      success: true,
      draft: {
        branding: { primaryColor: '#111111', accentColor: '#c59d5f', backgroundColor: '#f7f4ef', textColor: '#171717' },
        hero: { eyebrow: 'WELCOME', title: 'Test title', description: 'Test description', cardLabel: 'ONLINE RESERVATIONS', cardTitle: 'Choose your service.', backgroundImageUrl: '' },
        sections: {
          services: { enabled: true, eyebrow: 'OUR SERVICES', title: 'Services & pricing' },
          branches: { enabled: true, eyebrow: 'LOCATIONS', title: 'Visit us' },
          contact: { enabled: true, eyebrow: 'GET IN TOUCH', title: 'Ready when you are.' },
        },
        footer: { poweredByText: 'Powered by DoyBiz' },
      },
      published: {} as never,
      publishedAt: null,
    } },
    query: { isLoading: false, isError: false, refetch: mockRefetch },
  }),
  useCustomMutation: () => ({ mutateAsync: mockMutate, mutation: { isPending: false } }),
}));

describe('WebsiteManagementPage', () => {
  it('renders website CMS editing sections', () => {
    render(<WebsiteManagementPage />);
    expect(screen.getByRole('heading', { name: 'Website' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Branding' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hero section' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sections' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
  });
});
