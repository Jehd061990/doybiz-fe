import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { WebsiteManagementPage } from './website-management-page';

const mockRefetch = jest.fn();
const mockMutate = jest.fn().mockResolvedValue({});
const mockPublish = jest.fn().mockResolvedValue({});
const mockMutation = jest.fn((args: { url: string; method: string; values: unknown }) =>
  args.url === '/website' ? mockMutate(args) : mockPublish(args),
);

const draft = {
  template: 'CLASSIC',
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
  async function renderWebsiteManagementPage() {
    render(<WebsiteManagementPage />);
    await waitFor(() => expect(screen.getByText('No uploaded images yet.')).toBeInTheDocument());
  }

  beforeEach(() => {
    jest.spyOn(window, 'open').mockImplementation(() => null);
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ success: true, assets: [] }),
      })),
    });
    window.localStorage.clear();
    mockRefetch.mockReset();
    mockMutate.mockReset().mockResolvedValue({});
    mockPublish.mockReset().mockResolvedValue({});
    mockMutation.mockClear();
  });

  it('renders and persists the selected landing page template', async () => {
    await renderWebsiteManagementPage();

    expect(screen.getByRole('heading', { name: 'Landing Page Template' })).toBeInTheDocument();
    const templateRadios = screen.getAllByRole('radio', { name: 'Use this template' });
    expect(templateRadios).toHaveLength(2);
    const classic = templateRadios[0];
    const modernLuxury = templateRadios[1];
    expect(classic).toBeChecked();

    expect(modernLuxury).toBeInTheDocument();
    fireEvent.click(modernLuxury);
    expect(modernLuxury).toBeChecked();
    fireEvent.click(screen.getAllByRole('button', { name: 'Preview template' })[1]);
    expect(window.localStorage.getItem('doybiz:website-preview-draft')).toContain('MODERN_LUXURY');
    expect(window.open).toHaveBeenCalledWith('/site?preview=draft', '_blank', 'noopener,noreferrer');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
      url: '/website',
      method: 'put',
      values: expect.objectContaining({ template: 'MODERN_LUXURY' }),
    })));
  });

  it('restores a saved Modern Luxury draft as the selected template', async () => {
    draft.template = 'MODERN_LUXURY';
    await renderWebsiteManagementPage();
    const templateRadios = screen.getAllByRole('radio', { name: 'Use this template' });
    expect(templateRadios[1]).toBeChecked();
    expect(templateRadios[0]).not.toBeChecked();
    draft.template = 'CLASSIC';
  });

  it('edits selected template settings and keeps them in draft preview and save payload', async () => {
    draft.template = 'MODERN_LUXURY';
    await renderWebsiteManagementPage();

    fireEvent.change(screen.getByLabelText('Hero composition'), { target: { value: 'split' } });
    fireEvent.change(screen.getByLabelText('Image treatment'), { target: { value: 'cinematic' } });
    fireEvent.click(screen.getByLabelText('Show hero badge'));
    fireEvent.click(screen.getByRole('button', { name: 'Preview draft' }));

    const preview = JSON.parse(window.localStorage.getItem('doybiz:website-preview-draft') || '{}');
    expect(preview.templateSettings.modernLuxury).toEqual(expect.objectContaining({
      heroComposition: 'split',
      imageTreatment: 'cinematic',
      showHeroBadge: false,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
      url: '/website',
      method: 'put',
      values: expect.objectContaining({
        templateSettings: expect.objectContaining({
          modernLuxury: expect.objectContaining({
            heroComposition: 'split',
            imageTreatment: 'cinematic',
            showHeroBadge: false,
          }),
        }),
      }),
    })));
    draft.template = 'CLASSIC';
  });

  it('renders the Website CMS editor', async () => {
    await renderWebsiteManagementPage();
    expect(screen.getByRole('heading', { name: 'Website' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Branding' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Booking CTA' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Section Builder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse 1. Hero' })).toBeInTheDocument();
    expect(screen.getByLabelText('Hero headline')).toBeInTheDocument();
    expect(screen.getByText('Media Library')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Footer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview draft' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Live website' })).toHaveAttribute('href', '/site');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('previews the current draft locally without saving or publishing', async () => {
    await renderWebsiteManagementPage();
    const headline = screen.getByRole('textbox', { name: 'Hero headline' });
    fireEvent.change(headline, { target: { value: 'Preview headline' } });

    fireEvent.click(screen.getByRole('button', { name: 'Preview draft' }));

    expect(window.localStorage.getItem('doybiz:website-preview-draft')).toContain('Preview headline');
    expect(window.open).toHaveBeenCalledWith('/site?preview=draft', '_blank', 'noopener,noreferrer');
    expect(mockMutate).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it('keeps edits local until Save Draft and sends the edited configuration', async () => {
    await renderWebsiteManagementPage();
    const headline = screen.getByRole('textbox', { name: 'Hero headline' });

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

  it('publishes the current draft state before the dedicated publish action', async () => {
    await renderWebsiteManagementPage();
    const headline = screen.getByRole('textbox', { name: 'Hero headline' });
    fireEvent.change(headline, { target: { value: 'Published headline' } });

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
      url: '/website',
      method: 'put',
      values: expect.objectContaining({
        hero: expect.objectContaining({ title: 'Published headline' }),
      }),
    })));
    expect(mockPublish).toHaveBeenCalledWith({
      url: '/website/publish',
      method: 'post',
      values: {},
    });
  });

  it('publishes the complete current draft state, including section order and visibility', async () => {
    await renderWebsiteManagementPage();

    const servicesCard = screen.getByRole('button', { name: 'Collapse 2. Services' }).parentElement!;
    fireEvent.click(within(servicesCard).getByRole('checkbox', { name: /Enabled/i }));

    const heroRow = screen.getByRole('button', { name: 'Collapse 1. Hero' }).parentElement!;
    fireEvent.click(within(heroRow).getByRole('button', { name: 'Move down' }));

    fireEvent.change(screen.getByLabelText('Services title'), { target: { value: 'Published services' } });

    fireEvent.click(screen.getByRole('button', { name: 'Edit 3. Branches' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit 4. Contact' }));

    fireEvent.change(screen.getByLabelText('Branches title'), { target: { value: 'Published branches' } });
    fireEvent.change(screen.getByLabelText('Contact title'), { target: { value: 'Published contact' } });
    fireEvent.change(screen.getByLabelText('Primary color'), { target: { value: '#222222' } });
    fireEvent.change(screen.getByLabelText('Button text'), { target: { value: 'Reserve now' } });
    fireEvent.change(screen.getByDisplayValue('Powered by DoyBiz'), { target: { value: 'Published footer' } });

    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
      url: '/website',
      method: 'put',
      values: expect.objectContaining({
        sectionOrder: ['SERVICES', 'HERO', 'BRANCHES', 'CONTACT'],
        branding: expect.objectContaining({ primaryColor: '#222222' }),
        bookingCta: expect.objectContaining({ label: 'Reserve now' }),
        sections: expect.objectContaining({
          services: expect.objectContaining({ enabled: false, title: 'Published services' }),
          branches: expect.objectContaining({ title: 'Published branches' }),
          contact: expect.objectContaining({ title: 'Published contact' }),
        }),
        footer: expect.objectContaining({ poweredByText: 'Published footer' }),
      }),
    })));

    expect(mockPublish).toHaveBeenCalledWith({
      url: '/website/publish',
      method: 'post',
      values: {},
    });
  });

  it('reorders and removes a section, then adds it back before saving', async () => {
    await renderWebsiteManagementPage();

    const heroRow = screen.getByRole('button', { name: 'Collapse 1. Hero' }).parentElement!;
    fireEvent.click(within(heroRow).getByRole('button', { name: 'Move down' }));
    const servicesRow = screen.getByRole('button', { name: 'Collapse 1. Services' }).parentElement!;
    fireEvent.click(within(servicesRow).getByRole('button', { name: 'Remove' }));
    expect(screen.getByRole('button', { name: 'Add Services' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Services' }));

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
      values: expect.objectContaining({
        sectionOrder: ['HERO', 'BRANCHES', 'CONTACT', 'SERVICES'],
      }),
    })));
  });

  it('edits section content from its builder card and keeps the change in draft', async () => {
    await renderWebsiteManagementPage();

    const servicesCard = screen.getByRole('button', { name: 'Collapse 2. Services' }).parentElement?.parentElement;
    expect(servicesCard).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Services title'), { target: { value: 'Our signature services' } });
    expect(screen.getByLabelText('Services title')).toHaveValue('Our signature services');

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
      values: expect.objectContaining({
        sections: expect.objectContaining({
          services: expect.objectContaining({ title: 'Our signature services' }),
        }),
      }),
    })));
  });

  it('collapses and expands section content without changing the draft', async () => {
    await renderWebsiteManagementPage();

    expect(screen.getByLabelText('Services title')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Collapse 2. Services' }));
    expect(screen.queryByLabelText('Services title')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit 2. Services' }));
    expect(screen.getByLabelText('Services title')).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('shows disabled sections as hidden in the builder', async () => {
    await renderWebsiteManagementPage();

    const servicesCard = screen.getByRole('button', { name: 'Collapse 2. Services' }).parentElement?.parentElement;
    expect(servicesCard).toBeTruthy();
    fireEvent.click(within(servicesCard!).getByRole('checkbox', { name: /Enabled/i }));

    expect(within(servicesCard!).getByText('Hidden')).toBeInTheDocument();
  });

  it('preserves section content when a section is removed and added back', async () => {
    await renderWebsiteManagementPage();

    const servicesTitle = screen.getByLabelText('Services title');
    fireEvent.change(servicesTitle, { target: { value: 'Our signature services' } });

    const servicesToggle = screen.getByRole('button', { name: 'Collapse 2. Services' });
    const servicesCard = servicesToggle.parentElement?.parentElement;
    expect(servicesCard).toBeTruthy();

    fireEvent.click(within(servicesCard as HTMLElement).getByRole('button', { name: 'Remove' }));

    expect(screen.getByRole('button', { name: 'Add Services' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Services' }));

    expect(screen.getByLabelText('Services title')).toHaveValue('Our signature services');

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
      values: expect.objectContaining({
        sectionOrder: expect.arrayContaining(['SERVICES']),
        sections: expect.objectContaining({
          services: expect.objectContaining({
            enabled: true,
            title: 'Our signature services',
          }),
        }),
      }),
    })));
  });

  it('preserves section content when a section is disabled and re-enabled', async () => {
    await renderWebsiteManagementPage();

    const servicesTitle = screen.getByLabelText('Services title');
    fireEvent.change(servicesTitle, { target: { value: 'Our signature services' } });
    expect(servicesTitle).toHaveValue('Our signature services');

    const servicesCard = screen.getByRole('button', { name: 'Collapse 2. Services' }).parentElement?.parentElement;
    expect(servicesCard).toBeTruthy();

    const enabledCheckbox = within(servicesCard as HTMLElement).getByRole('checkbox', { name: /Enabled/i });
    fireEvent.click(enabledCheckbox);

    expect(within(servicesCard as HTMLElement).getByText('Hidden')).toBeInTheDocument();
    expect(screen.getByLabelText('Services title')).toHaveValue('Our signature services');
    expect(mockMutate).not.toHaveBeenCalled();

    fireEvent.click(enabledCheckbox);

    expect(within(servicesCard as HTMLElement).getByText('Visible')).toBeInTheDocument();
    expect(screen.getByLabelText('Services title')).toHaveValue('Our signature services');
    expect(mockMutate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({
      values: expect.objectContaining({
        sectionOrder: expect.arrayContaining(['SERVICES']),
        sections: expect.objectContaining({
          services: expect.objectContaining({
            enabled: true,
            title: 'Our signature services',
          }),
        }),
      }),
    })));
  });

  it('keeps Hero as the mandatory core section', async () => {
    await renderWebsiteManagementPage();

    const heroCard = screen.getByRole('button', { name: 'Collapse 1. Hero' }).parentElement?.parentElement;
    expect(heroCard).toBeTruthy();
    expect(within(heroCard as HTMLElement).getByText('Core section')).toBeInTheDocument();
    expect(within(heroCard as HTMLElement).queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Hero' })).not.toBeInTheDocument();
  });

  it('shows a clear Add Section area only after a section is removed', async () => {
    await renderWebsiteManagementPage();

    expect(screen.queryByRole('heading', { name: 'Add Section' })).not.toBeInTheDocument();

    const servicesCard = screen.getByRole('button', { name: 'Collapse 2. Services' }).parentElement?.parentElement;
    expect(servicesCard).toBeTruthy();
    fireEvent.click(within(servicesCard as HTMLElement).getByRole('button', { name: 'Remove' }));

    expect(screen.getByRole('heading', { name: 'Add Section' })).toBeInTheDocument();
    expect(screen.getByText('Add a removed section back to the page. Its saved content will be restored.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Services' })).toBeInTheDocument();
  });

  it('surfaces a Save Draft failure', async () => {
    mockMutate.mockRejectedValueOnce(new Error('Save failed'));
    await renderWebsiteManagementPage();

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
  });
});