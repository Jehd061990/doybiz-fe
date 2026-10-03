import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WebsiteManagementPage } from './website-management-page';

const mockRefetch = jest.fn();
const mockMutate = jest.fn().mockResolvedValue({});
const mockPublish = jest.fn().mockResolvedValue({});

const draft = {
  branding: { primaryColor: '#111111', accentColor: '#c59d5f', backgroundColor: '#f7f4ef', textColor: '#171717' },
  hero: { eyebrow: 'WELCOME', title: 'Test title', description: 'Test description', cardLabel: 'ONLINE RESERVATIONS', cardTitle: 'Choose your service.', backgroundImageUrl: '' },
  sections: {
    services: { enabled: true, eyebrow: 'OUR SERVICES', title: 'Services & pricing' },
    branches: { enabled: true, eyebrow: 'LOCATIONS', title: 'Visit us' },
    contact: { enabled: true, eyebrow: 'GET IN TOUCH', title: 'Ready when you are.' },
  },
  footer: { poweredByText: 'Powered by DoyBiz' },
};

let mutationCall = 0;

jest.mock('@refinedev/core', () => ({
  useCustom: () => ({
    result: { data: { success: true, draft, published: { ...draft }, publishedAt: null } },
    query: { isLoading: false, isError: false, refetch: mockRefetch },
  }),
  useCustomMutation: () => {
    mutationCall += 1;
    return {
      mutateAsync: mutationCall === 1 ? mockMutate : mockPublish,
      mutation: { isPending: false },
    };
  },
}));

describe('WebsiteManagementPage', () => {
  beforeEach(() => {
    mutationCall = 0;
    mockRefetch.mockReset();
    mockMutate.mockReset().mockResolvedValue({});
    mockPublish.mockReset().mockResolvedValue({});
  });

  it('renders the Website CMS editor', () => {
    render(<WebsiteManagementPage />);
    expect(screen.getByRole('heading', { name: 'Website' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Branding' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hero section' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sections' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Footer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Preview website' })).toHaveAttribute('href', '/site');
  });

  it('keeps edits local until Save Draft and sends the edited configuration', async () => {
    render(<WebsiteManagementPage />);
    const headline = screen.getByLabelText('Headline');

    fireEvent.change(headline, { target: { value: 'New salon headline' } });
    expect(headline).toHaveValue('New salon headline');
    expect(mockMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
      url: '/website',
      method: 'put',
      values: expect.objectContaining({
        hero: expect.objectContaining({ title: 'New salon headline' }),
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
