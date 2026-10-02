'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ServiceImage } from '@/components/services/service-image';
import styles from './client-landing-page.module.css';

type Organization = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

type SiteResponse = {
  success: true;
  site: { organization: Organization; primaryDomain: string | null };
};

type Branch = {
  id: string;
  name: string;
  address?: string;
  contactNumber?: string;
};

type Service = {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  branchId?: string | null;
  imageUrl?: string | null;
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

const today = new Date().toISOString().slice(0, 10);

export function ClientLandingPage({ developmentTenant, bookingOnly = false, openBookingOnLoad = false }: { developmentTenant?: string; bookingOnly?: boolean; openBookingOnLoad?: boolean }) {
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
        setSite(siteResult.site);
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
    const initialService = service || visibleServices[0];
    setServiceId(initialService?.id || '');
    setSelectedBranch(selectedBranch || branches[0]?.id || '');
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
  const landingPageHref = tenantQuery ? `/site${tenantQuery}` : '/site';

  return (
    <main className={bookingOnly ? `${styles.page} ${styles.bookingOnlyPage}` : styles.page}>
      <header className={styles.header}>
        <a href={bookingOnly ? `${landingPageHref}#top` : '#top'} className={styles.brand}>{organization.name}</a>
        <nav className={styles.nav}>
          <a href={bookingOnly ? `${landingPageHref}#services` : '#services'}>Services</a>
          <a href={bookingOnly ? `${landingPageHref}#branches` : '#branches'}>Branches</a>
          <a href={bookingOnly ? `${landingPageHref}#contact` : '#contact'}>Contact</a>
          <button type="button" className={styles.navButton} onClick={() => openBooking()}>Book now</button>
        </nav>
      </header>

      {!bookingOnly && <section id="top" className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>WELCOME</span>
          <h1>Quality service, made easy to book.</h1>
          <p>Explore our services, choose a branch, and reserve your preferred schedule online.</p>
          <div className={styles.heroActions}>
            <button type="button" className={styles.primaryButton} onClick={() => openBooking()}>Book an appointment</button>
            <a href="#services" className={styles.secondaryButton}>View services</a>
          </div>
        </div>
        <div className={styles.heroCard}>
          <div className={styles.heroOrb} />
          <span>ONLINE RESERVATIONS</span>
          <strong>Choose your service.<br />Pick your schedule.</strong>
        </div>
      </section>}

      {!bookingOnly && <section id="services" className={styles.section}>
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>OUR SERVICES</span><h2>Services & pricing</h2></div>
          {branches.length > 1 && (
            <select value={selectedBranch} onChange={event => setSelectedBranch(event.target.value)} className={styles.select}>
              <option value="">All branches</option>
              {branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          )}
        </div>
        {visibleServices.length ? (
          <div className={styles.serviceGrid}>
            {visibleServices.map(service => (
              <article className={styles.serviceCard} key={service.id}>
                <ServiceImage src={service.imageUrl} alt={service.name} className={styles.serviceImage} loading="lazy" />
                <div className={styles.serviceBody}>
                  <div className={styles.serviceTop}><h3>{service.name}</h3><span>₱{service.price.toLocaleString()}</span></div>
                  {service.description && <p>{service.description}</p>}
                  <div className={styles.serviceMeta}>{service.durationMinutes} min <button type="button" onClick={() => openBooking(service)}>Book</button></div>
                </div>
              </article>
            ))}
          </div>
        ) : <p className={styles.empty}>No services are currently available.</p>}
      </section>}

      {!bookingOnly && <section id="branches" className={styles.sectionAlt}>
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>LOCATIONS</span><h2>Visit us</h2></div></div>
        <div className={styles.branchGrid}>
          {branches.map(branch => (
            <article className={styles.branchCard} key={branch.id}>
              <span className={styles.branchNumber}>{String(branches.indexOf(branch) + 1).padStart(2, '0')}</span>
              <h3>{branch.name}</h3>
              <p>{branch.address || 'Address available at the branch.'}</p>
              {branch.contactNumber && <a href={`tel:${branch.contactNumber}`}>{branch.contactNumber}</a>}
            </article>
          ))}
        </div>
      </section>}

      {!bookingOnly && <section id="contact" className={styles.contactSection}>
        <div><span className={styles.eyebrow}>GET IN TOUCH</span><h2>Ready when you are.</h2><p>{organization.address}</p></div>
        <div className={styles.contactDetails}>
          {organization.phone && <a href={`tel:${organization.phone}`}>{organization.phone}</a>}
          {organization.email && <a href={`mailto:${organization.email}`}>{organization.email}</a>}
          <button type="button" className={styles.primaryButton} onClick={() => openBooking()}>Book now</button>
        </div>
      </section>}

      {!bookingOnly && <footer className={styles.footer}><span>{organization.name}</span><span>Powered by DoyBiz</span></footer>}

      {bookingOpen && (
        <div className={bookingOnly ? styles.bookingPageContainer : styles.modalBackdrop} role="presentation" onMouseDown={() => !bookingOnly && setBookingOpen(false)}>
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
                    <label>Branch<select value={selectedBranch} onChange={event => { setSelectedBranch(event.target.value); setTime(''); }} required><option value="">Select branch</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                    <label>Service<select value={serviceId} onChange={event => { setServiceId(event.target.value); setTime(''); }} required><option value="">Select service</option>{visibleServices.map(service => <option key={service.id} value={service.id}>{service.name} — ₱{service.price.toLocaleString()}</option>)}</select></label>
                    <label>Date<input type="date" min={today} value={date} onChange={event => setDate(event.target.value)} required /></label>
                    <label>Staff<select value={staffId} onChange={event => { setStaffId(event.target.value); setTime(''); }}><option value="">Any available staff</option>{staff.map(member => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}{member.position ? ` — ${member.position}` : ''}</option>)}</select></label>
                    <div className={styles.slotField}><span>Available times</span><div className={styles.slotGrid}>{availability?.slots.length ? availability.slots.map(slot => <button key={slot.time} type="button" className={time === slot.time ? styles.selectedSlot : styles.slot} onClick={() => setTime(slot.time)}>{slot.time}</button>) : <small>{selectedService ? 'No available slots for this date.' : 'Select a service to see available times.'}</small>}</div></div>
                    {bookingError && <div className={styles.error}>{bookingError}</div>}
                    <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => bookingOnly ? window.location.assign(`${landingPageHref}#top`) : setBookingOpen(false)}>Cancel</button><button type="button" className={styles.primaryButton} disabled={!time} onClick={() => setBookingStep(2)}>Continue</button></div>
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