import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WebsiteManagementPage } from './website-management-page';

const mockRefetch = jest.fn();
const mockMutate = jest.fn().mockResolvedValue({});
const mockPublish = jest.fn().mockResolvedValue({});
const mockMutation = jest.fn((args: { url: string; method: string; values: unknown }) =>
  args.url === '/website' ? mockMutate(args) : mockPublish(args),
);

const draft = {
  sectionOrder: ['HERO', 'SERVICES', 'BRANCHES', 'CONTACT'],
  branding: { primaryColor: '#111111', accentColor: '#c59d5f', backgroundColor: '#f7f4ef', textColor: '#171717' },
  hero: { eyebrow: 'WELCOME', title: 'Test title', description: 'Test description', cardLabel: 'ONLINE RESERVATIONS', cardTitle: 'Choose your service.', backgroundImageUrl: '' },
  bookingCta: { enabled: true, label: 'Book an appointment', mode: 'modal' },
  sections: {
    services: { enabled: true, eyebrow: 'OUR SERVICES', title: 'Services & pricing' },
    branches: { enabled: true, eyebrow: 'LOCATIONS', title: 'Visit us' },
    contact: { enabled: true, eyebrow: 'GET IN TOUCH', title: 'Ready when you are.' },
  },
  footer: { poweredByText: 'Powered by DoyBiz' },
};

jest.mock('@refinedev/core', () => ({
  useCustom: () => ({
    result: { data: { success: true, draft, published: { ...draft }, publishedAt: null } },
    query: { isLoading: false, isError: false, refetch: mockRefetch },
  }),
  useCustomMutation: () => ({
    mutateAsync: mockMutation,
    mutation: { isPending: false },
  }),
}));

describe('WebsiteManagementPage', () => {
  beforeEach(() => {
    jest.spyOn(window, 'open').mockImplementation(() => null);
    window.localStorage.clear();
    mockRefetch.mockReset();
    mockMutate.mockReset().mockResolvedValue({});
    mockPublish.mockReset().mockResolvedValue({});
    mockMutation.mockClear();
  });

  it('renders the Website CMS editor', () => {
    render(<WebsiteManagementPage />);
    expect(screen.getByRole('heading', { name: 'Website' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Branding' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hero section' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Booking CTA' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sections' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Footer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview draft' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Live website' })).toHaveAttribute('href', '/site');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('previews the current draft locally without saving or publishing', () => {
    render(<WebsiteManagementPage />);
    const headline = screen.getByLabelText('Headline');
    fireEvent.change(headline, { target: { value: 'Preview headline' } });

    fireEvent.click(screen.getByRole('button', { name: 'Preview draft' }));

    expect(window.localStorage.getItem('doybiz:website-preview-draft')).toContain('Preview headline');
    expect(window.open).toHaveBeenCalledWith('/site?preview=draft', '_blank', 'noopener,noreferrer');
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('keeps edits local until Save Draft and sends the edited configuration', async () => {
    render(<WebsiteManagementPage />);
    const headline = screen.getByLabelText('Headline');

    fireEvent.change(headline, { target: { value: 'New salon headline' } });
    expect(headline).toHaveValue('New salon headline');
    expect(mockMutate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Button text'), { target: { value: 'Reserve your time' } });
    fireEvent.change(screen.getByLabelText('Booking behavior'), { target: { value: 'page' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
      url: '/website',
      method: 'put',
      values: expect.objectContaining({
        hero: expect.objectContaining({ title: 'New salon headline' }),
        bookingCta: expect.objectContaining({ label: 'Reserve your time', mode: 'page' }),
      }),
    })));
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('publishes through the dedicated publish action without sending editable fields', async () => {
    render(<WebsiteManagementPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(mockPublish).toHaveBeenCalledWith({
      url: '/website/publish',
      method: 'post',
      values: {},
    }));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('surfaces a Save Draft failure', async () => {
    mockMutate.mockRejectedValueOnce(new Error('Save failed'));
    render(<WebsiteManagementPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
  });
});
