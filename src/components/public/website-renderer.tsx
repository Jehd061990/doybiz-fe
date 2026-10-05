'use client';

import { ServiceImage } from '@/components/services/service-image';
import styles from './client-landing-page.module.css';

export type WebsiteTemplateKey = 'CLASSIC' | 'MODERN_LUXURY';

export type WebsiteTemplateSettings = {
  classic: {
    heroAlignment: 'left' | 'center';
    navigationStyle: 'standard' | 'minimal';
    sectionSpacing: 'comfortable' | 'compact';
    heroImagePosition: 'center' | 'top' | 'bottom';
    ctaStyle: 'solid' | 'outline';
  };
  modernLuxury: {
    heroComposition: 'full-bleed' | 'split';
    navigationStyle: 'editorial' | 'minimal';
    sectionSpacing: 'airy' | 'compact';
    imageTreatment: 'natural' | 'cinematic';
    overlayIntensity: 'soft' | 'strong';
    showHeroBadge: boolean;
  };
};

const DEFAULT_TEMPLATE_SETTINGS: WebsiteTemplateSettings = {
  classic: {
    heroAlignment: 'left',
    navigationStyle: 'standard',
    sectionSpacing: 'comfortable',
    heroImagePosition: 'center',
    ctaStyle: 'solid',
  },
  modernLuxury: {
    heroComposition: 'full-bleed',
    navigationStyle: 'editorial',
    sectionSpacing: 'airy',
    imageTreatment: 'natural',
    overlayIntensity: 'strong',
    showHeroBadge: true,
  },
};

export type Organization = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

export type WebsiteValue = {
  template: WebsiteTemplateKey;
  templateSettings?: WebsiteTemplateSettings;
  sectionOrder: Array<'HERO' | 'SERVICES' | 'BRANCHES' | 'CONTACT'>;
  branding: { primaryColor: string; accentColor: string; backgroundColor: string; textColor: string };
  hero: { eyebrow: string; title: string; description: string; cardLabel: string; cardTitle: string; backgroundImageUrl: string };
  bookingCta: { enabled: boolean; label: string; mode: 'modal' | 'page' };
  sections: {
    services: { enabled: boolean; eyebrow: string; title: string };
    branches: { enabled: boolean; eyebrow: string; title: string };
    contact: { enabled: boolean; eyebrow: string; title: string };
  };
  footer: { poweredByText: string };
};

export type Branch = {
  id: string;
  name: string;
  address?: string;
  contactNumber?: string;
};

export type Service = {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  branchId?: string | null;
  imageUrl?: string | null;
};

type ClassicTemplateProps = {
  organization: Organization;
  website: WebsiteValue;
  branches: Branch[];
  visibleServices: Service[];
  selectedBranch: string;
  bookingOnly: boolean;
  landingPageHref: string;
  bookingPageHref: string;
  handleBookingCta: () => void;
  openBooking: (service?: Service) => void;
  setSelectedBranch: (branchId: string) => void;
  navigateTo: (url: string) => void;
};

export const WEBSITE_TEMPLATES: Record<WebsiteTemplateKey, { name: string; description: string }> = {
  CLASSIC: {
    name: 'Classic',
    description: 'Clean and professional layout for service businesses.',
  },
  MODERN_LUXURY: {
    name: 'Modern Luxury',
    description: 'Editorial, premium presentation for brands that want a more elevated feel.',
  },
};

const sectionOrderIndex = (website: WebsiteValue, key: WebsiteValue['sectionOrder'][number]) =>
  website.sectionOrder?.indexOf(key) ?? -1;

const sectionVisible = (website: WebsiteValue, key: 'SERVICES' | 'BRANCHES' | 'CONTACT') =>
  sectionOrderIndex(website, key) >= 0 &&
  website.sections[key.toLowerCase() as keyof WebsiteValue['sections']].enabled;

export function ClassicTemplate({
  organization,
  website,
  branches,
  visibleServices,
  selectedBranch,
  bookingOnly,
  landingPageHref,
  bookingPageHref,
  handleBookingCta,
  openBooking,
  setSelectedBranch,
  navigateTo,
}: ClassicTemplateProps) {
  const settings = website.templateSettings?.classic || DEFAULT_TEMPLATE_SETTINGS.classic;
  const navClass = settings.navigationStyle === 'minimal' ? styles.header + ' ' + styles.headerMinimal : styles.header;
  const heroClass = settings.sectionSpacing === 'compact' ? styles.hero + ' ' + styles.heroCompact : styles.hero;
  const heroImagePosition = settings.heroImagePosition;
  const buttonClass = settings.ctaStyle === 'outline' ? styles.secondaryButton : styles.primaryButton;

  return (
    <>
      <header className={navClass} style={{ order: 0 }}>
        <a href={bookingOnly ? `${landingPageHref}#top` : '#top'} className={styles.brand}>{organization.name}</a>
        <nav className={styles.nav}>
          {sectionVisible(website, 'SERVICES') && <a href={bookingOnly ? `${landingPageHref}#services` : '#services'}>Services</a>}
          {sectionVisible(website, 'BRANCHES') && <a href={bookingOnly ? `${landingPageHref}#branches` : '#branches'}>Branches</a>}
          {sectionVisible(website, 'CONTACT') && <a href={bookingOnly ? `${landingPageHref}#contact` : '#contact'}>Contact</a>}
          {website.bookingCta.enabled && !bookingOnly && <button type="button" className={styles.navButton} onClick={handleBookingCta}>{website.bookingCta.label}</button>}
        </nav>
      </header>

      {!bookingOnly && <section id="top" className={heroClass} style={{ order: sectionOrderIndex(website, 'HERO') + 1 }}>

        <div className={styles.heroCopy} style={{ textAlign: settings.heroAlignment }}>
          <span className={styles.eyebrow}>{website.hero.eyebrow}</span>
          <h1>{website.hero.title}</h1>
          <p>{website.hero.description}</p>
          <div className={styles.heroActions}>
            {website.bookingCta.enabled && <button type="button" className={buttonClass} onClick={handleBookingCta}>{website.bookingCta.label}</button>}
            <a href="#services" className={styles.secondaryButton}>View services</a>
          </div>
        </div>
        <div className={styles.heroCard} style={website.hero.backgroundImageUrl ? { backgroundImage: `linear-gradient(rgba(0,0,0,.25), rgba(0,0,0,.35)), url(${website.hero.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: heroImagePosition } : undefined}>
          <div className={styles.heroOrb} />
          <span>{website.hero.cardLabel}</span>
          <strong>{website.hero.cardTitle.split('\\n').map((line, index) => <span key={line + index}>{index ? <br /> : null}{line}</span>)}</strong>
        </div>
      </section>}

      {!bookingOnly && sectionVisible(website, 'SERVICES') && <section id="services" className={styles.section} style={{ order: sectionOrderIndex(website, 'SERVICES') + 1 }}>
        <div className={styles.sectionHeading}>
          <div><span className={styles.eyebrow}>{website.sections.services.eyebrow}</span><h2>{website.sections.services.title}</h2></div>
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
                  <div className={styles.serviceMeta}>{service.durationMinutes} min {website.bookingCta.enabled && <button type="button" onClick={() => website.bookingCta.mode === 'page' ? navigateTo(bookingPageHref) : openBooking(service)}>{website.bookingCta.label}</button>}</div>
                </div>
              </article>
            ))}
          </div>
        ) : <p className={styles.empty}>No services are currently available.</p>}
      </section>}

      {!bookingOnly && sectionVisible(website, 'BRANCHES') && <section id="branches" className={styles.sectionAlt} style={{ order: sectionOrderIndex(website, 'BRANCHES') + 1 }}>
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>{website.sections.branches.eyebrow}</span><h2>{website.sections.branches.title}</h2></div></div>
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

      {!bookingOnly && sectionVisible(website, 'CONTACT') && <section id="contact" className={styles.contactSection} style={{ order: sectionOrderIndex(website, 'CONTACT') + 1 }}>
        <div><span className={styles.eyebrow}>{website.sections.contact.eyebrow}</span><h2>{website.sections.contact.title}</h2><p>{organization.address}</p></div>
        <div className={styles.contactDetails}>
          {organization.phone && <a href={`tel:${organization.phone}`}>{organization.phone}</a>}
          {organization.email && <a href={`mailto:${organization.email}`}>{organization.email}</a>}
          {website.bookingCta.enabled && <button type="button" className={buttonClass} onClick={handleBookingCta}>{website.bookingCta.label}</button>}
        </div>
      </section>}

      {!bookingOnly && <footer className={styles.footer} style={{ order: 10 }}><span>{organization.name}</span><span>{website.footer.poweredByText}</span></footer>}
    </>
  );
}

export function ModernLuxuryTemplate({
  organization, website, branches, visibleServices, selectedBranch, bookingOnly, landingPageHref, bookingPageHref,
  handleBookingCta, openBooking, setSelectedBranch, navigateTo,
}: ClassicTemplateProps) {
  const settings = website.templateSettings?.modernLuxury || DEFAULT_TEMPLATE_SETTINGS.modernLuxury;
  const heroClass = settings.heroComposition === 'split'
    ? styles.luxuryHero + ' ' + styles.luxuryHeroSplit
    : styles.luxuryHero;
  const shellClass = settings.sectionSpacing === 'compact'
    ? styles.luxuryShell + ' ' + styles.luxuryCompact
    : styles.luxuryShell;
  const navClass = settings.navigationStyle === 'minimal'
    ? styles.luxuryHeader + ' ' + styles.luxuryHeaderMinimal
    : styles.luxuryHeader;
  const overlay = settings.overlayIntensity === 'soft'
    ? 'linear-gradient(180deg, rgba(12,12,12,.04), rgba(12,12,12,.48))'
    : 'linear-gradient(180deg, rgba(12,12,12,.08), rgba(12,12,12,.72))';
  const imageTreatmentClass = settings.imageTreatment === 'cinematic' ? styles.luxuryCinematic : '';

  return (
    <div className={shellClass}>
      <header className={navClass}>
        <a href={bookingOnly ? landingPageHref + '#top' : '#top'} className={styles.luxuryBrand}>{organization.name}</a>
        <nav className={styles.luxuryNav}>
          {sectionVisible(website, 'SERVICES') && <a href={bookingOnly ? landingPageHref + '#services' : '#services'}>Services</a>}
          {sectionVisible(website, 'BRANCHES') && <a href={bookingOnly ? landingPageHref + '#branches' : '#branches'}>Locations</a>}
          {sectionVisible(website, 'CONTACT') && <a href={bookingOnly ? landingPageHref + '#contact' : '#contact'}>Contact</a>}
          {website.bookingCta.enabled && !bookingOnly && <button type='button' className={styles.luxuryCta} onClick={handleBookingCta}>{website.bookingCta.label}</button>}
        </nav>
      </header>
      {!bookingOnly && <section id='top' className={heroClass} style={{ order: sectionOrderIndex(website, 'HERO') + 1 }}>
        <div className={styles.luxuryHeroImage}>
          {website.hero.backgroundImageUrl ? (
            <div
              className={`${styles.luxuryHeroMedia} ${imageTreatmentClass}`}
              style={{ backgroundImage: overlay + ', url(' + website.hero.backgroundImageUrl + ')' }}
              aria-hidden="true"
            />
          ) : <div className={styles.luxuryHeroGlow} />}
          <div className={styles.luxuryHeroContent}>
            <span className={styles.luxuryKicker}>{website.hero.eyebrow}</span>
            <h1>{website.hero.title}</h1>
            <p>{website.hero.description}</p>
            {website.bookingCta.enabled && <button type='button' className={styles.luxuryHeroButton} onClick={handleBookingCta}>{website.bookingCta.label}<span>↗</span></button>}
          </div>
          {settings.showHeroBadge && <div className={styles.luxuryHeroBadge}><span>{website.hero.cardLabel}</span><strong>{website.hero.cardTitle.split('\\n').map((line, index) => <span key={line + index}>{index ? <br /> : null}{line}</span>)}</strong></div>}
        </div>
      </section>}
      {!bookingOnly && sectionVisible(website, 'SERVICES') && <section id='services' className={styles.luxurySection} style={{ order: sectionOrderIndex(website, 'SERVICES') + 1 }}>
        <div className={styles.luxuryHeading}><div><span className={styles.luxuryKicker}>{website.sections.services.eyebrow}</span><h2>{website.sections.services.title}</h2></div>{branches.length > 1 && <select value={selectedBranch} onChange={event => setSelectedBranch(event.target.value)} className={styles.luxurySelect}><option value=''>All branches</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>}</div>
        {visibleServices.length ? <div className={styles.luxuryServiceGrid}>{visibleServices.map((service, index) => <article className={styles.luxuryServiceCard} key={service.id}>
          <div className={styles.luxuryServiceImageWrap}><span>{String(index + 1).padStart(2, '0')}</span><ServiceImage src={service.imageUrl} alt={service.name} className={styles.luxuryServiceImage} loading='lazy' /></div>
          <div className={styles.luxuryServiceBody}><div><h3>{service.name}</h3>{service.description && <p>{service.description}</p>}</div><div className={styles.luxuryServiceFooter}><span>₱{service.price.toLocaleString()} · {service.durationMinutes} min</span>{website.bookingCta.enabled && <button type='button' onClick={() => website.bookingCta.mode === 'page' ? navigateTo(bookingPageHref) : openBooking(service)}>{website.bookingCta.label} ↗</button>}</div></div>
        </article>)}</div> : <p className={styles.luxuryEmpty}>No services are currently available.</p>}
      </section>}
      {!bookingOnly && sectionVisible(website, 'BRANCHES') && <section id='branches' className={styles.luxuryDarkSection} style={{ order: sectionOrderIndex(website, 'BRANCHES') + 1 }}>
        <div className={styles.luxuryHeading}><div><span className={styles.luxuryKicker}>{website.sections.branches.eyebrow}</span><h2>{website.sections.branches.title}</h2></div></div>
        <div className={styles.luxuryBranchGrid}>{branches.map((branch, index) => <article className={styles.luxuryBranchCard} key={branch.id}><span>{String(index + 1).padStart(2, '0')}</span><h3>{branch.name}</h3><p>{branch.address || 'Address available at the branch.'}</p>{branch.contactNumber && <a href={'tel:' + branch.contactNumber}>{branch.contactNumber}</a>}</article>)}</div>
      </section>}
      {!bookingOnly && sectionVisible(website, 'CONTACT') && <section id='contact' className={styles.luxuryContact} style={{ order: sectionOrderIndex(website, 'CONTACT') + 1 }}>
        <div><span className={styles.luxuryKicker}>{website.sections.contact.eyebrow}</span><h2>{website.sections.contact.title}</h2><p>{organization.address}</p></div>
        <div className={styles.luxuryContactDetails}>{organization.phone && <a href={'tel:' + organization.phone}>{organization.phone}</a>}{organization.email && <a href={'mailto:' + organization.email}>{organization.email}</a>}{website.bookingCta.enabled && <button type='button' className={styles.luxuryCta} onClick={handleBookingCta}>{website.bookingCta.label}</button>}</div>
      </section>}
      {!bookingOnly && <footer className={styles.luxuryFooter}><span>{organization.name}</span><span>{website.footer.poweredByText}</span></footer>}
    </div>
  );
}

export function WebsiteRenderer(props: ClassicTemplateProps) {
  switch (props.website.template) {
    case 'MODERN_LUXURY':
      return <ModernLuxuryTemplate {...props} />;
    case 'CLASSIC':
    default:
      return <ClassicTemplate {...props} />;
  }
}
