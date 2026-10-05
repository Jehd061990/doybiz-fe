'use client';

import { FormEvent, useEffect, useMemo, useState, type CSSProperties } from 'react';
import styles from './client-landing-page.module.css';
import { navigateTo } from './navigation';
import {
  WebsiteRenderer,
  type Branch,
  type Organization,
  type Service,
  type WebsiteValue,
} from './website-renderer';

type SiteResponse = {
  success: true;
  site: { organization: Organization; primaryDomain: string | null; website: WebsiteValue };
};

type Staff = {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
  branchId: string;
};

type Slot = { time: string; staffIds: string[] };

type Availability = {
  branch: { id: string; name: string };
  service: { id: string; name: string; durationMinutes: number };
  date: string;
  slots: Slot[];
};

const publicRequest = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`/api/public/${path}`, {
    ...options,
    headers: { 'content-type': 'application/json', ...(options?.headers || {}) },
    cache: 'no-store',
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload?.message || `Request failed (${response.status})`);
  return payload as T;
};

const getLocalToday = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
};

const today = getLocalToday();
const PREVIEW_STORAGE_KEY = 'doybiz:website-preview-draft';

const normalizeWebsite = (website: WebsiteValue): WebsiteValue => ({
  ...website,
  template: website.template === 'MODERN_LUXURY' ? 'MODERN_LUXURY' : website.template === 'MINIMAL_MODERN' ? 'MINIMAL_MODERN' : 'CLASSIC',
  branding: {
    ...website.branding,
    logoUrl: website.branding.logoUrl || '',
    brandDisplay: website.branding.brandDisplay || 'text',
    logoShape: website.branding.logoShape || 'square',
    logoSize: website.branding.logoSize || 'medium',
    brandLayout: website.branding.brandLayout || 'horizontal',
  },
});

export function ClientLandingPage({
  developmentTenant,
  bookingOnly = false,
  openBookingOnLoad = false,
  previewDraft = false,
}: {
  developmentTenant?: string;
  bookingOnly?: boolean;
  openBookingOnLoad?: boolean;
  previewDraft?: boolean;
}) {
  const tenantQuery = developmentTenant ? `?tenant=${encodeURIComponent(developmentTenant)}` : '';

  const [site, setSite] = useState<SiteResponse['site'] | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [bookingOpen, setBookingOpen] = useState(bookingOnly);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingError, setBookingError] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const [serviceId, setServiceId] = useState('');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(today);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [time, setTime] = useState('');

  const [customer, setCustomer] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    notes: '',
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [siteResult, branchResult, serviceResult] = await Promise.all([
          publicRequest<SiteResponse>(`site${tenantQuery}`),
          publicRequest<{ success: true; branches: Branch[] }>(`branches${tenantQuery}`),
          publicRequest<{ success: true; services: Service[] }>(`services${tenantQuery}`),
        ]);
        if (cancelled) return;
        let website = normalizeWebsite(siteResult.site.website);
        if (previewDraft && typeof window !== 'undefined') {
          try {
            const storedDraft = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
            if (storedDraft) {
              const parsedDraft = JSON.parse(storedDraft) as WebsiteValue;
              website = normalizeWebsite(parsedDraft);
            }
          } catch {
            // Ignore malformed preview data and fall back to the published website.
          }
        }
        setSite({ ...siteResult.site, website });
        setBranches(branchResult.branches);
        setServices(serviceResult.services);
        const firstBranchId = branchResult.branches[0]?.id || '';
        setSelectedBranch(firstBranchId);
        if (bookingOnly) {
          const firstService = serviceResult.services.find(
            service => !service.branchId || service.branchId === firstBranchId,
          );
          setServiceId(firstService?.id || '');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load this website.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [tenantQuery, bookingOnly]);

  useEffect(() => {
    if (bookingOnly || openBookingOnLoad) setBookingOpen(true);
  }, [bookingOnly, openBookingOnLoad]);

  const visibleServices = useMemo(
    () => selectedBranch ? services.filter(service => !service.branchId || service.branchId === selectedBranch) : services,
    [services, selectedBranch],
  );

  const selectedService = services.find(service => service.id === serviceId);

  const openBooking = (service?: Service) => {
    const initialBranch = selectedBranch || branches[0]?.id || '';
    const initialService = service && (!service.branchId || service.branchId === initialBranch)
      ? service
      : visibleServices.find(item => !item.branchId || item.branchId === initialBranch);
    setServiceId(initialService?.id || '');
    setSelectedBranch(initialBranch);
    setStaffId('');
    setDate(today);
    setTime('');
    setAvailability(null);
    setBookingError('');
    setConfirmation('');
    setBookingStep(1);
    setBookingOpen(true);
  };

  useEffect(() => {
    if (!bookingOpen || !selectedBranch || !serviceId) return;
    let cancelled = false;
    const loadStaff = async () => {
      try {
        const result = await publicRequest<{ success: true; staff: Staff[] }>(
          `staff?branchId=${encodeURIComponent(selectedBranch)}&serviceId=${encodeURIComponent(serviceId)}${developmentTenant ? `&tenant=${encodeURIComponent(developmentTenant)}` : ''}`,
        );
        if (!cancelled) setStaff(result.staff);
      } catch {
        if (!cancelled) setStaff([]);
      }
    };
    void loadStaff();
    return () => { cancelled = true; };
  }, [bookingOpen, selectedBranch, serviceId, developmentTenant]);

  useEffect(() => {
    if (!bookingOpen || !selectedBranch || !serviceId || !date) return;
    let cancelled = false;
    const loadAvailability = async () => {
      try {
        setBookingError('');
        setAvailability(null);
        setTime('');
        const params = new URLSearchParams({ branchId: selectedBranch, serviceId, date });
        if (staffId) params.set('staffId', staffId);
        if (developmentTenant) params.set('tenant', developmentTenant);
        const result = await publicRequest<{ success: true; availability: Availability }>(
          `availability?${params.toString()}`,
        );
        if (!cancelled) setAvailability(result.availability);
      } catch (err) {
        if (!cancelled) setBookingError(err instanceof Error ? err.message : 'Unable to load availability.');
      }
    };
    void loadAvailability();
    return () => { cancelled = true; };
  }, [bookingOpen, selectedBranch, serviceId, date, staffId, developmentTenant]);

  const submitBooking = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedBranch || !serviceId || !time) {
      setBookingError('Please select a branch, service, date, and available time.');
      return;
    }

    const slot = availability?.slots.find(item => item.time === time);
    const finalStaffId = staffId || slot?.staffIds?.[0];
    if (!finalStaffId) {
      setBookingError('No available staff member is assigned to this time slot.');
      return;
    }

    try {
      setBookingError('');
      const params = developmentTenant ? `?tenant=${encodeURIComponent(developmentTenant)}` : '';
      const result = await publicRequest<{ success: true; confirmationReference: string }>(
        `reservations${params}`,
        {
          method: 'POST',
          body: JSON.stringify({
            branchId: selectedBranch,
            serviceId,
            staffId: finalStaffId,
            appointmentDate: date,
            appointmentTime: time,
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: customer.phone,
            email: customer.email || undefined,
            notes: customer.notes || undefined,
          }),
        },
      );
      setConfirmation(result.confirmationReference);
      setBookingStep(3);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Unable to create reservation.');
    }
  };

  if (loading) {
    return <main className={styles.centerState}>Loading website…</main>;
  }

  if (error || !site) {
    return (
      <main className={styles.centerState}>
        <div>
          <strong>Website unavailable</strong>
          <p>{error || 'This business website could not be loaded.'}</p>
        </div>
      </main>
    );
  }

  const organization = site.organization;
  const website = site.website;
  const landingPageHref = tenantQuery ? `/site${tenantQuery}` : '/site';
  const bookingPageHref = tenantQuery ? `/site/book${tenantQuery}` : '/site/book';
  const siteStyle = {
    '--site-primary': website.branding.primaryColor,
    '--site-accent': website.branding.accentColor,
    '--site-background': website.branding.backgroundColor,
    '--site-text': website.branding.textColor,
    display: 'flex',
    flexDirection: 'column',
  } as CSSProperties;

  const handleBookingCta = () => {
    if (website.bookingCta.mode === 'page') {
      navigateTo(bookingPageHref);
      return;
    }
    openBooking();
  };

  return (
    <main
      className={bookingOnly ? `${styles.page} ${styles.bookingOnlyPage}` : styles.page}
      style={siteStyle}
    >
      <WebsiteRenderer
        organization={organization}
        website={website}
        branches={branches}
        visibleServices={visibleServices}
        selectedBranch={selectedBranch}
        bookingOnly={bookingOnly}
        landingPageHref={landingPageHref}
        bookingPageHref={bookingPageHref}
        handleBookingCta={handleBookingCta}
        openBooking={openBooking}
        setSelectedBranch={setSelectedBranch}
        navigateTo={navigateTo}
      />

      {bookingOpen && (
        <div className={bookingOnly ? styles.bookingPageContainer : styles.modalBackdrop} style={{ order: 100 }} role="presentation" onMouseDown={() => !bookingOnly && setBookingOpen(false)}>
          <div className={bookingOnly ? `${styles.modal} ${styles.bookingPageCard}` : styles.modal} role="dialog" aria-modal="true" aria-label="Book an appointment" onMouseDown={event => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div><span className={styles.eyebrow}>ONLINE BOOKING</span><h2>{bookingStep === 3 ? 'Reservation received' : 'Book an appointment'}</h2></div>
              {!bookingOnly && <button type="button" className={styles.closeButton} onClick={() => setBookingOpen(false)} aria-label="Close">×</button>}
            </div>

            {bookingStep === 3 ? (
              <div className={styles.confirmation}>
                <div className={styles.check}>✓</div>
                <h3>Your reservation is pending.</h3>
                <p>Please keep this confirmation reference:</p>
                <code>{confirmation}</code>
                <button type="button" className={styles.primaryButton} onClick={() => bookingOnly ? window.location.reload() : setBookingOpen(false)}>Done</button>
              </div>
            ) : (
              <form onSubmit={submitBooking}>
                <div className={styles.steps}><span className={bookingStep >= 1 ? styles.activeStep : ''}>1 Schedule</span><span className={bookingStep >= 2 ? styles.activeStep : ''}>2 Your details</span></div>
                {bookingStep === 1 ? (
                  <div className={styles.formGrid}>
                    <label>Branch<select value={selectedBranch} onChange={event => {
                      const nextBranchId = event.target.value;
                      const nextServices = services.filter(service => !service.branchId || service.branchId === nextBranchId);
                      setSelectedBranch(nextBranchId);
                      setServiceId(nextServices[0]?.id || '');
                      setStaffId('');
                      setTime('');
                      setAvailability(null);
                    }} required><option value="">Select branch</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                    <label>Service<select value={serviceId} onChange={event => { setServiceId(event.target.value); setTime(''); }} required><option value="">Select service</option>{visibleServices.map(service => <option key={service.id} value={service.id}>{service.name} — ₱{service.price.toLocaleString()}</option>)}</select></label>
                    <label>Date<input type="date" min={today} value={date} onChange={event => setDate(event.target.value)} required /></label>
                    <label>Staff<select value={staffId} onChange={event => { setStaffId(event.target.value); setTime(''); }}><option value="">Any available staff</option>{staff.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}{member.position ? ` — ${member.position}` : ''}</option>)}</select></label>
                    <div className={styles.slotField}><span>Available times</span><div className={styles.slotGrid}>{availability?.slots.length ? availability.slots.map(slot => <button key={slot.time} type="button" className={time === slot.time ? styles.selectedSlot : styles.slot} onClick={() => setTime(slot.time)}>{slot.time}</button>) : <small>{selectedService ? 'No available slots for this date.' : 'Select a service to see available times.'}</small>}</div></div>
                    {bookingError && <div className={styles.error}>{bookingError}</div>}
                    <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => bookingOnly ? navigateTo(`${landingPageHref}#top`) : setBookingOpen(false)}>Cancel</button><button type="button" className={styles.primaryButton} disabled={!time} onClick={() => setBookingStep(2)}>Continue</button></div>
                  </div>
                ) : (
                  <div className={styles.formGrid}>
                    <label>First name<input value={customer.firstName} onChange={event => setCustomer({ ...customer, firstName: event.target.value })} required /></label>
                    <label>Last name<input value={customer.lastName} onChange={event => setCustomer({ ...customer, lastName: event.target.value })} required /></label>
                    <label>Phone<input value={customer.phone} onChange={event => setCustomer({ ...customer, phone: event.target.value })} required /></label>
                    <label>Email<input type="email" value={customer.email} onChange={event => setCustomer({ ...customer, email: event.target.value })} /></label>
                    <label className={styles.fullField}>Notes<textarea value={customer.notes} onChange={event => setCustomer({ ...customer, notes: event.target.value })} rows={3} /></label>
                    {bookingError && <div className={styles.error}>{bookingError}</div>}
                    <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setBookingStep(1)}>Back</button><button type="submit" className={styles.primaryButton}>Confirm reservation</button></div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
