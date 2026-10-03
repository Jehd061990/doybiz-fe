import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ClientLandingPage } from './client-landing-page';

const website = {
  branding: { primaryColor: '#111111', accentColor: '#c59d5f', backgroundColor: '#f7f4ef', textColor: '#171717' },
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

function mockPublicApi(options: { bookingCtaMode?: 'modal' | 'page' } = {}) {
  const currentWebsite = {
    ...website,
    bookingCta: { ...website.bookingCta, mode: options.bookingCtaMode ?? website.bookingCta.mode },
  };

  const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/api/public/site')) {
      return new Response(JSON.stringify({ ...sitePayload, site: { ...sitePayload.site, website: currentWebsite } }), { status: 200 });
    }
    if (url.includes('/api/public/branches')) {
      return new Response(JSON.stringify({ success: true, branches }), { status: 200 });
    }
    if (url.includes('/api/public/services')) {
      return new Response(JSON.stringify({ success: true, services }), { status: 200 });
    }
    if (url.includes('/api/public/staff')) {
      return new Response(JSON.stringify({ success: true, staff: [] }), { status: 200 });
    }
    if (url.includes('/api/public/availability')) {
      return new Response(JSON.stringify({
        success: true,
        availability: {
          branch: { id: 'branch-1', name: 'Main Branch' },
          service: { id: 'service-1', name: 'Haircut', durationMinutes: 60 },
          date: '2099-01-01',
          slots: [{ time: '10:00', staffIds: ['staff-1'] }],
        },
      }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  });

  Object.defineProperty(global, 'fetch', {
    configurable: true,
    writable: true,
    value: fetchMock,
  });
}

jest.mock('@/components/services/service-image', () => ({
  ServiceImage: ({ alt }: { alt: string }) => <div data-testid="service-image">{alt}</div>,
}));

describe('ClientLandingPage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the published landing page with tenant-aware content', async () => {
    mockPublicApi();

    render(<ClientLandingPage developmentTenant="onepiecesalon" />);

    expect(await screen.findByRole('heading', { name: 'Test title' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '#services');
    expect(screen.getByRole('link', { name: 'Branches' })).toHaveAttribute('href', '#branches');
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '#contact');
    expect(screen.getByText('Haircut')).toBeInTheDocument();

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
  });

  it('opens the booking modal when the CTA mode is modal', async () => {
    mockPublicApi({ bookingCtaMode: 'modal' });

    render(<ClientLandingPage developmentTenant="onepiecesalon" />);

    await screen.findByRole('heading', { name: 'Test title' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Book now' })[0]);

    expect(screen.getByRole('dialog', { name: 'Book an appointment' })).toBeInTheDocument();
    expect(screen.getByText('1 Schedule')).toBeInTheDocument();
  });

  it('navigates to the dedicated booking page when the CTA mode is page', async () => {
    mockPublicApi({ bookingCtaMode: 'page' });

    const assign = jest.spyOn(window.location, 'assign').mockImplementation(() => {});

    render(<ClientLandingPage developmentTenant="onepiecesalon" />);

    await screen.findByRole('heading', { name: 'Test title' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Book now' })[0]);

    expect(assign).toHaveBeenCalledWith('/site/book?tenant=onepiecesalon');
  });

  it('does not render a redundant booking CTA button inside the booking page navigation', async () => {
    mockPublicApi();

    render(<ClientLandingPage developmentTenant="onepiecesalon" bookingOnly />);

    await screen.findByRole('heading', { name: 'Book an appointment' });
    expect(screen.queryByRole('button', { name: 'Book now' })).not.toBeInTheDocument();
  });

  it('loads availability after selecting the default booking service', async () => {
    mockPublicApi();

    render(<ClientLandingPage developmentTenant="onepiecesalon" bookingOnly />);

    await waitFor(() => {
      const requests = (global.fetch as jest.Mock).mock.calls.map(([input]) => String(input));
      expect(requests.some(url => url.includes('/api/public/availability?') && url.includes('tenant=onepiecesalon'))).toBe(true);
    });

    expect(screen.getByRole('dialog', { name: 'Book an appointment' })).toBeInTheDocument();
  });
});
