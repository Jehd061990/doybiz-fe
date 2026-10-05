import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ClientLandingPage } from './client-landing-page';
import { navigateTo } from './navigation';

const website = {
  template: 'CLASSIC' as const,
  sectionOrder: ['HERO', 'SERVICES', 'BRANCHES', 'CONTACT'],
  branding: { primaryColor: '#111111', accentColor: '#c59d5f', backgroundColor: '#f7f4ef', textColor: '#171717', logoUrl: '', brandDisplay: 'text' as const },
  hero: { eyebrow: 'WELCOME', title: 'Test title', description: 'Test description', cardLabel: 'ONLINE RESERVATIONS', cardTitle: 'Choose your service.', backgroundImageUrl: '' },
  bookingCta: { enabled: true, label: 'Book now', mode: 'modal' as const },
  sections: {
    services: { enabled: true, eyebrow: 'OUR SERVICES', title: 'Services & pricing' },
    branches: { enabled: true, eyebrow: 'LOCATIONS', title: 'Visit us' },
    contact: { enabled: true, eyebrow: 'GET IN TOUCH', title: 'Ready when you are.' },
  },
  footer: { poweredByText: 'Powered by DoyBiz' },
};

const sitePayload = {
  success: true,
  site: {
    organization: { id: 'org-1', name: 'One Piece Salon', email: 'hello@example.com', phone: '09170000000', address: 'Davao City' },
    primaryDomain: null,
    website,
  },
};

const branches = [{ id: 'branch-1', name: 'Main Branch', address: 'Davao City', contactNumber: '09170000000' }];
const services = [{ id: 'service-1', name: 'Haircut', description: 'Classic haircut', price: 500, durationMinutes: 60, branchId: 'branch-1', imageUrl: null }];

const mockResponse = (payload: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload,
});

function mockPublicApi(options: { bookingCtaMode?: 'modal' | 'page'; sectionOrder?: string[]; template?: 'CLASSIC' | 'MODERN_LUXURY' | 'MINIMAL_MODERN'; templateSettings?: any; heroBackgroundImageUrl?: string } = {}) {
  const currentWebsite = {
    ...website,
    bookingCta: { ...website.bookingCta, mode: options.bookingCtaMode ?? website.bookingCta.mode },
    sectionOrder: options.sectionOrder ?? website.sectionOrder,
    template: options.template ?? website.template,
    templateSettings: options.templateSettings,
    hero: { ...website.hero, backgroundImageUrl: options.heroBackgroundImageUrl ?? website.hero.backgroundImageUrl },
  };

  const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/public/site')) {
      return mockResponse({ ...sitePayload, site: { ...sitePayload.site, website: currentWebsite } });
    }
    if (url.includes('/api/public/branches')) {
      return mockResponse({ success: true, branches });
    }
    if (url.includes('/api/public/services')) {
      return mockResponse({ success: true, services });
    }
    if (url.includes('/api/public/staff')) {
      return mockResponse({ success: true, staff: [] });
    }
    if (url.includes('/api/public/availability')) {
      return mockResponse({
        success: true,
        availability: {
          branch: { id: 'branch-1', name: 'Main Branch' },
          service: { id: 'service-1', name: 'Haircut', durationMinutes: 60 },
          date: '2099-01-01',
          slots: [{ time: '10:00', staffIds: ['staff-1'] }],
        },
      });
    }
    return mockResponse({ success: true });
  });

  Object.defineProperty(global, 'fetch', {
    configurable: true,
    writable: true,
    value: fetchMock,
  });
}

jest.mock('./navigation', () => ({
  navigateTo: jest.fn(),
}));

jest.mock('@/components/services/service-image', () => ({
  ServiceImage: ({ alt }: { alt: string }) => <div data-testid="service-image">{alt}</div>,
}));

describe('ClientLandingPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the selected Classic template renderer', async () => {
    mockPublicApi();

    render(<ClientLandingPage developmentTenant="onepiecesalon" />);

    expect(await screen.findByRole('heading', { name: 'Test title' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Services' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Haircut' })).toBeInTheDocument();
  });

  it('renders the Modern Luxury template with the shared booking CTA and content', async () => {
    mockPublicApi({ template: 'MODERN_LUXURY' });

    render(<ClientLandingPage developmentTenant="onepiecesalon" />);

    expect(await screen.findByRole('heading', { name: 'Test title' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Services' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Haircut' })).toBeInTheDocument();
    expect(document.querySelector('.luxuryShell')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Book now' })[0]);
    expect(screen.getByRole('dialog', { name: 'Book an appointment' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '10:00' })).toBeInTheDocument();
    });
  });

  it('renders the Minimal Modern template with the shared booking CTA and content', async () => {
    mockPublicApi({ template: 'MINIMAL_MODERN' });

    render(<ClientLandingPage developmentTenant="onepiecesalon" />);

    expect(await screen.findByRole('heading', { name: 'Test title' })).toBeInTheDocument();
    expect(document.querySelector('.minimalModernShell')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Haircut' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Book now' })[0]);
    expect(screen.getByRole('dialog', { name: 'Book an appointment' })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '10:00' })).toBeInTheDocument();
    });
  });


  it('applies Modern Luxury presentation settings to the public renderer', async () => {
    mockPublicApi({
      template: 'MODERN_LUXURY',
      heroBackgroundImageUrl: 'https://example.com/hero.jpg',
      templateSettings: {
        classic: { heroAlignment: 'left', navigationStyle: 'standard', sectionSpacing: 'comfortable', heroImagePosition: 'center', ctaStyle: 'solid' },
        modernLuxury: { heroComposition: 'full-bleed', navigationStyle: 'editorial', sectionSpacing: 'airy', imageTreatment: 'cinematic', overlayIntensity: 'strong', showHeroBadge: true },
      },
    });

    render(<ClientLandingPage developmentTenant="onepiecesalon" />);

    expect(await screen.findByRole('heading', { name: 'Test title' })).toBeInTheDocument();
    const heroMedia = document.querySelector('.luxuryHeroMedia');
    expect(heroMedia).toHaveClass('luxuryCinematic');
    expect(heroMedia).toHaveAttribute('data-image-treatment', 'cinematic');
    expect(heroMedia?.getAttribute('style')).toContain('url("https://example.com/hero.jpg")');
    expect(heroMedia?.getAttribute('style')).toContain('grayscale(1)');
    expect(document.querySelector('.luxuryCinematicFrame')).toBeInTheDocument();
  });

  it('renders the configured navigation logo and text together', async () => {
    mockPublicApi();
    const responseWebsite = {
      ...website,
      branding: {
        ...website.branding,
        logoUrl: 'https://example.com/logo.png',
        brandDisplay: 'both' as const,
      },
    };
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: jest.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/api/public/site')) return mockResponse({ ...sitePayload, site: { ...sitePayload.site, website: responseWebsite } });
        if (url.includes('/api/public/branches')) return mockResponse({ success: true, branches });
        if (url.includes('/api/public/services')) return mockResponse({ success: true, services });
        if (url.includes('/api/public/staff')) return mockResponse({ success: true, staff: [] });
        if (url.includes('/api/public/availability')) return mockResponse({ success: true, availability: { branch: { id: 'branch-1', name: 'Main Branch' }, service: { id: 'service-1', name: 'Haircut', durationMinutes: 60 }, date: '2099-01-01', slots: [{ time: '10:00', staffIds: ['staff-1'] }] } });
        return mockResponse({ success: true });
      }),
    });

    render(<ClientLandingPage developmentTenant="onepiecesalon" />);

    expect(await screen.findByRole('link', { name: /One Piece Salon/ })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Navigation logo' })).toHaveAttribute('src', 'https://example.com/logo.png');
    expect(screen.getByText('One Piece Salon')).toBeInTheDocument();
  });

  it('renders the published landing page with tenant-aware content', async () => {
    mockPublicApi();

    render(<ClientLandingPage developmentTenant="onepiecesalon" />);

    expect(await screen.findByRole('heading', { name: 'Test title' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '#services');
    expect(screen.getByRole('link', { name: 'Branches' })).toHaveAttribute('href', '#branches');
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '#contact');
    expect(screen.getByRole('heading', { name: 'Haircut' })).toBeInTheDocument();

    const requests = (global.fetch as jest.Mock).mock.calls.map(([input]) => String(input));
    expect(requests.some(url => url.includes('/api/public/site?tenant=onepiecesalon'))).toBe(true);
    expect(requests.some(url => url.includes('/api/public/branches?tenant=onepiecesalon'))).toBe(true);
    expect(requests.some(url => url.includes('/api/public/services?tenant=onepiecesalon'))).toBe(true);
  });

  it('renders the dedicated booking page while keeping landing navigation visible', async () => {
    mockPublicApi();

    render(<ClientLandingPage developmentTenant="onepiecesalon" bookingOnly />);

    expect(await screen.findByRole('heading', { name: 'Book an appointment' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'One Piece Salon' })).toHaveAttribute('href', '/site?tenant=onepiecesalon#top');
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/site?tenant=onepiecesalon#services');
    expect(screen.getByRole('link', { name: 'Branches' })).toHaveAttribute('href', '/site?tenant=onepiecesalon#branches');
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '/site?tenant=onepiecesalon#contact');
    expect(screen.queryByRole('heading', { name: 'Test title' })).not.toBeInTheDocument();
    expect(screen.queryByText('Services & pricing')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '10:00' })).toBeInTheDocument();
    });
  });

  it('renders enabled public sections in the configured order', async () => {
    mockPublicApi({ sectionOrder: ['HERO', 'CONTACT', 'SERVICES', 'BRANCHES'] });

    render(<ClientLandingPage developmentTenant="onepiecesalon" />);

    await screen.findByRole('heading', { name: 'Test title' });
    const sections = Array.from(document.querySelectorAll('main > section')) as HTMLElement[];
    const orderedIds = sections
      .sort((a, b) => Number(a.style.order) - Number(b.style.order))
      .map(section => section.id);
    expect(orderedIds).toEqual(['top', 'contact', 'services', 'branches']);
  });

  it('opens the booking modal when the CTA mode is modal', async () => {
    mockPublicApi({ bookingCtaMode: 'modal' });

    render(<ClientLandingPage developmentTenant="onepiecesalon" />);

    await screen.findByRole('heading', { name: 'Test title' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Book now' })[0]);

    expect(screen.getByRole('dialog', { name: 'Book an appointment' })).toBeInTheDocument();
    expect(screen.getByText('1 Schedule')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '10:00' })).toBeInTheDocument();
    });
  });

  it('navigates to the dedicated booking page when the CTA mode is page', async () => {
    mockPublicApi({ bookingCtaMode: 'page' });

    render(<ClientLandingPage developmentTenant="onepiecesalon" />);

    await screen.findByRole('heading', { name: 'Test title' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Book now' })[0]);

    expect(navigateTo).toHaveBeenCalledWith('/site/book?tenant=onepiecesalon');
  });

  it('does not render a redundant booking CTA button inside the booking page navigation', async () => {
    mockPublicApi();

    render(<ClientLandingPage developmentTenant="onepiecesalon" bookingOnly />);

    await screen.findByRole('heading', { name: 'Book an appointment' });
    expect(screen.queryByRole('button', { name: 'Book now' })).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '10:00' })).toBeInTheDocument();
    });
  });

  it('loads availability after selecting the default booking service', async () => {
    mockPublicApi();

    render(<ClientLandingPage developmentTenant="onepiecesalon" bookingOnly />);

    await waitFor(() => {
      const requests = (global.fetch as jest.Mock).mock.calls.map(([input]) => String(input));
      expect(requests.some(url => url.includes('/api/public/availability?') && url.includes('tenant=onepiecesalon'))).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '10:00' })).toBeInTheDocument();
    });
  });
  it('renders the generic Three.js hero layer for Modern Luxury', async () => {
    mockPublicApi({ template: 'MODERN_LUXURY' });

    render(<ClientLandingPage developmentTenant="onepiecesalon" />);

    expect(await screen.findByRole('heading', { name: 'Test title' })).toBeInTheDocument();
    expect(document.querySelector('[data-testid="modern-luxury-3d-hero"]')).toBeInTheDocument();
  });

});
