import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Facebook,
  FileText,
  HelpCircle,
  LogIn,
  Mail,
  MapPin,
  Megaphone,
  Phone,
  Search,
  ShieldCheck,
  Smartphone,
  Timer,
} from 'lucide-react';

const navLinks = [
  {
    label: 'Home',
    href: '#home',
    details: ['Public reporting overview', 'Start a complaint', 'Track existing reports'],
  },
  {
    label: 'Report Faults',
    to: '/report/new',
    details: ['Leaks and burst pipes', 'No water or low pressure', 'Meter and billing faults'],
  },
  {
    label: 'Track',
    to: '/track',
    details: ['Use complaint reference', 'Confirm phone number', 'View assignment progress'],
  },
  {
    label: 'Service Centres',
    href: '#service-centres',
    details: ['Fault desk', 'Customer support', 'District service offices'],
  },
  {
    label: 'Updates',
    href: '#updates',
    details: ['Service notices', 'Maintenance alerts', 'Community announcements'],
  },
  {
    label: 'Water Quality',
    href: '#water-quality',
    details: ['Dirty water reports', 'Smell or taste concerns', 'Suspected contamination'],
  },
  {
    label: 'Contact',
    href: '#contact',
    details: ['Public reporting desk', 'Phone support', 'Staff login access'],
  },
];

const serviceLinks = [
  { label: 'Report Faults', to: '/report/new' },
  { label: 'Track Complaints', to: '/track' },
  { label: 'Service Centres', href: '#service-centres' },
  { label: 'New Water Connection', href: '#new-connection' },
  { label: 'Water Quality Results', href: '#water-quality' },
];

const publicServices = [
  {
    title: 'Report water faults',
    body: 'Leaks, no supply, burst pipes, pressure changes, water quality, and meter problems.',
    icon: Droplets,
  },
  {
    title: 'Track progress',
    body: 'Use your reference and phone number to follow assignment, priority, and response status.',
    icon: Timer,
  },
  {
    title: 'Attach evidence',
    body: 'Share location details and optional photos so crews can reach the right place faster.',
    icon: ShieldCheck,
  },
];

const quickLinks = [
  {
    title: 'New connections',
    label: 'Apply for water',
    icon: Building2,
  },
  {
    title: 'Service alerts',
    label: 'Planned and unplanned works',
    icon: Bell,
  },
  {
    title: 'Help centre',
    label: 'Guidance and contacts',
    icon: HelpCircle,
  },
];

const heroSlides = [
  {
    title: 'Pipe repair in progress',
    body: 'Crews can respond faster when reports include landmarks and exact fault details.',
    image:
      'https://images.pexels.com/photos/12880833/pexels-photo-12880833.jpeg?auto=compress&cs=tinysrgb&w=900',
  },
  {
    title: 'Valve and pipe maintenance',
    body: 'Photos help teams assess the right tools, fittings, and priority before dispatch.',
    image:
      'https://images.pexels.com/photos/32588548/pexels-photo-32588548.jpeg?auto=compress&cs=tinysrgb&w=900',
  },
  {
    title: 'Fittings and service checks',
    body: 'Track reports from submission through assignment and field resolution.',
    image:
      'https://images.pexels.com/photos/6419128/pexels-photo-6419128.jpeg?auto=compress&cs=tinysrgb&w=900',
  },
  {
    title: 'Close-up pipe repair',
    body: 'Detailed fault photos help teams understand the affected pipe, fitting, or valve.',
    image:
      'https://images.pexels.com/photos/16509869/pexels-photo-16509869.jpeg?auto=compress&cs=tinysrgb&w=900',
  },
  {
    title: 'Prepared maintenance crews',
    body: 'Skilled crews can be routed with clearer priority when the issue is reported well.',
    image:
      'https://images.pexels.com/photos/8486975/pexels-photo-8486975.jpeg?auto=compress&cs=tinysrgb&w=900',
  },
  {
    title: 'Plumbing tools ready',
    body: 'Every report builds a practical field brief for repair, inspection, or follow-up.',
    image:
      'https://images.pexels.com/photos/840835/pexels-photo-840835.jpeg?auto=compress&cs=tinysrgb&w=900',
  },
];

export function PublicReportPage() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 5500);
    return () => window.clearInterval(id);
  }, []);

  const slide = heroSlides[activeSlide];
  const previousSlide = () => {
    setActiveSlide((current) => (current === 0 ? heroSlides.length - 1 : current - 1));
  };
  const nextSlide = () => {
    setActiveSlide((current) => (current + 1) % heroSlides.length);
  };

  return (
    <div className="min-h-screen bg-[#f4f9ff] text-slate-950">
      <header className="shadow-sm">
        <div className="bg-[#0b3f73] text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-xs font-semibold sm:text-sm">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4" />
                01 525 311
              </span>
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Public water reporting desk
              </span>
            </div>
            <Link
              to="/login?switch=1"
              className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-white/95 hover:bg-white/10"
            >
              <LogIn className="h-4 w-4" />
              Staff Login
            </Link>
          </div>
        </div>

        <div className="bg-[#1577c8]">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 md:flex-row md:items-center md:justify-between">
            <Link to="/report" className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white bg-white text-center shadow-lg">
                <div className="rounded-full bg-[#0b3f73] px-3 py-2 text-xs font-black uppercase leading-tight text-white">
                  MWB
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/80">
                  National service access
                </p>
                <h1 className="text-2xl font-semibold text-white md:text-3xl">
                  Malawi Water Board Public Reporting
                </h1>
              </div>
            </Link>

            <div className="flex w-full max-w-md overflow-hidden rounded-lg bg-white shadow-lg">
              <input
                aria-label="Search"
                placeholder="Search"
                className="min-w-0 flex-1 px-4 py-3 text-sm text-slate-700 outline-none"
              />
              <button
                type="button"
                className="flex w-16 items-center justify-center bg-[#0b3f73] text-white hover:bg-[#07325d]"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <nav className="relative z-30 bg-[#0b5fa5] text-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
            <div className="flex min-w-0 overflow-x-auto lg:overflow-visible">
              {navLinks.map((item, index) =>
                item.to ? (
                  <div key={item.label} className="group relative shrink-0">
                    <Link
                      to={item.to}
                      className="flex items-center gap-1 whitespace-nowrap px-4 py-4 text-sm font-medium hover:bg-[#1577c8]"
                    >
                      {item.label}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Link>
                    <div className="invisible absolute left-0 top-full w-72 border-t-2 border-[#1577c8] bg-white p-5 text-slate-700 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                      <p className="text-sm font-bold uppercase tracking-wide text-[#0b5fa5]">
                        {item.label}
                      </p>
                      <ul className="mt-4 space-y-3 text-sm">
                        {item.details.map((detail) => (
                          <li key={detail} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#1577c8]" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div key={item.label} className="group relative shrink-0">
                    <a
                      href={item.href}
                      className={`flex items-center gap-1 whitespace-nowrap px-4 py-4 text-sm font-medium hover:bg-[#1577c8] ${
                        index === 0 ? 'bg-[#1577c8]' : ''
                      }`}
                    >
                      {item.label}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </a>
                    <div className="invisible absolute left-0 top-full w-72 border-t-2 border-[#1577c8] bg-white p-5 text-slate-700 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                      <p className="text-sm font-bold uppercase tracking-wide text-[#0b5fa5]">
                        {item.label}
                      </p>
                      <ul className="mt-4 space-y-3 text-sm">
                        {item.details.map((detail) => (
                          <li key={detail} className="flex gap-2">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 bg-[#1577c8]" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ),
              )}
            </div>
            <div className="hidden items-center gap-2 pl-4 md:flex">
              <button type="button" className="rounded bg-white p-1.5 text-[#0b5fa5]" aria-label="Facebook">
                <Facebook className="h-4 w-4" />
              </button>
              <button type="button" className="rounded bg-white p-1.5 text-[#0b5fa5]" aria-label="Mobile updates">
                <Smartphone className="h-4 w-4" />
              </button>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <section id="home" className="relative overflow-hidden bg-[#0b3f73]">
          <div className="absolute inset-0">
            {heroSlides.map((item, index) => (
              <img
                key={item.image}
                src={item.image}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                  index === activeSlide ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-r from-[#052d55]/95 via-[#083d70]/68 to-[#052d55]/18" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#052d55]/80 via-transparent to-transparent" />
          </div>

          <button
            type="button"
            onClick={previousSlide}
            className="absolute left-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#0b5fa5] shadow-lg hover:bg-white md:flex"
            aria-label="Previous field-service image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={nextSlide}
            className="absolute right-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-[#0b5fa5] shadow-lg hover:bg-white md:flex"
            aria-label="Next field-service image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="relative mx-auto flex min-h-[520px] max-w-7xl flex-col justify-center px-4 py-14 md:min-h-[610px] lg:py-20">
            <div className="max-w-3xl text-white">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] ring-1 ring-white/25 backdrop-blur">
                <Megaphone className="h-4 w-4" />
                Malawi Water Board Public Reporting
              </span>
              <h2 className="mt-5 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
                Tell us what is happening with your water service.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/88 md:text-lg">
                A guided assistant captures your district, account clues, location, evidence,
                and issue type so the right Water Board team can act with better context.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/report/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-[#0b5fa5] shadow-lg hover:bg-[#eef7ff]"
                >
                  Start a report
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/track"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/45 bg-white/10 px-5 py-3 text-sm font-bold text-white shadow-sm backdrop-blur hover:bg-white/20"
                >
                  <FileText className="h-4 w-4" />
                  Track complaint
                </Link>
              </div>
            </div>

            <div className="mt-12 max-w-xl text-white">
              <p className="text-sm font-bold">{slide.title}</p>
              <p className="mt-2 max-w-lg text-sm leading-6 text-white/82">{slide.body}</p>
              <div className="mt-5 flex gap-2" aria-label="Field-service image slides">
                {heroSlides.map((item, index) => (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setActiveSlide(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeSlide ? 'w-9 bg-white' : 'w-2.5 bg-white/45'
                    }`}
                    aria-label={`Show ${item.title}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="relative bg-[#0b5fa5] px-4 py-6">
            <div className="mx-auto grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {serviceLinks.slice(0, 4).map((item, index) => {
                const content = (
                  <>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/12">
                      {index === 0 ? (
                        <Droplets className="h-5 w-5" />
                      ) : index === 1 ? (
                        <FileText className="h-5 w-5" />
                      ) : index === 2 ? (
                        <MapPin className="h-5 w-5" />
                      ) : (
                        <Building2 className="h-5 w-5" />
                      )}
                    </span>
                    <span className="text-sm font-bold">{item.label}</span>
                  </>
                );

                return item.to ? (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="flex items-center gap-3 rounded-lg bg-[#084f8b] px-4 py-4 text-white shadow-lg ring-1 ring-white/10 hover:bg-[#073f70]"
                  >
                    {content}
                  </Link>
                ) : (
                  <a
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg bg-[#084f8b] px-4 py-4 text-white shadow-lg ring-1 ring-white/10 hover:bg-[#073f70]"
                  >
                    {content}
                  </a>
                );
              })}
            </div>
          </div>
        </section>

        <section id="updates" className="mx-auto max-w-7xl px-4 py-8">
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.title}
                  href={
                    item.title === 'Service alerts'
                      ? '#updates'
                      : item.title === 'Help centre'
                        ? '#contact'
                        : '#new-connection'
                  }
                  className="group flex items-center gap-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-slate-200 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#e8f4ff] text-[#0b5fa5]">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-bold text-slate-950">{item.title}</span>
                    <span className="mt-1 block text-sm text-slate-600">{item.label}</span>
                  </span>
                  <ArrowRight className="ml-auto h-4 w-4 text-slate-400 group-hover:text-[#0b5fa5]" />
                </a>
              );
            })}
          </div>

          <div className="flex overflow-hidden rounded-none bg-[#ebe8e8] text-sm font-semibold shadow-sm">
            <div className="bg-[#0b5fa5] px-5 py-4 text-white">Feeds :</div>
            <div className="flex min-w-0 flex-1 items-center gap-5 overflow-hidden px-4 text-slate-950">
              <span className="whitespace-nowrap">
                Water boards expand digital service channels for faster public reporting
              </span>
              <span className="text-[#0b5fa5]">|</span>
              <span className="whitespace-nowrap">
                Report leaks early to reduce water loss in your community
              </span>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {publicServices.map((service) => {
              const Icon = service.icon;
              return (
                <article
                  key={service.title}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#e8f4ff] text-[#155a91]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-slate-950">{service.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{service.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="service-centres" className="bg-white px-4 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0b5fa5]">
                  Service access
                </p>
                <h2 className="mt-2 text-3xl font-bold text-slate-950">
                  Service centres and public support
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Use the online tools first, then visit or call a water-board office when your
                  case needs in-person help.
                </p>
              </div>
              <Link
                to="/track"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0b5fa5] px-5 py-3 text-sm font-bold text-white hover:bg-[#084f8b]"
              >
                Track a complaint
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                ['Fault desk', 'Report leaks, bursts, no water, meter faults, and pressure issues.'],
                ['Customer service', 'Ask about account details, new connections, and complaint references.'],
                ['Field dispatch', 'Share location landmarks and photos so crews can find the issue faster.'],
              ].map(([title, body]) => (
                <article key={title} className="rounded-lg border border-slate-200 bg-[#f8fbff] p-5">
                  <h3 className="text-base font-bold text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="new-connection" className="bg-[#edf5fb] px-4 py-10">
          <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0b5fa5]">
                New connections
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">
                Need a new water connection?
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Start by contacting customer service with your district, plot or account details,
                nearest landmark, and phone number.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {['Prepare location details', 'Confirm customer contact', 'Visit nearest office'].map(
                (step, index) => (
                  <div key={step} className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200">
                    <p className="text-2xl font-black text-[#0b5fa5]">{index + 1}</p>
                    <p className="mt-2 text-sm font-bold text-slate-800">{step}</p>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <section id="water-quality" className="bg-white px-4 py-10">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-lg border border-blue-100 bg-[#f8fbff] p-6">
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#0b5fa5]">
                Water quality
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">
                Report water quality concerns quickly
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                If water is dirty, has an unusual smell, taste, colour, or suspected contamination,
                submit a report with the affected area, start time, and any supporting photo.
              </p>
              <Link
                to="/report/new"
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0b5fa5] px-5 py-3 text-sm font-bold text-white hover:bg-[#084f8b]"
              >
                Report water quality issue
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="bg-[#0b3f73] px-4 py-6 text-sm text-white/80">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 md:flex-row md:items-center">
          <p>Malawi Water Board Public Reporting</p>
          <div className="flex flex-wrap gap-4">
            <span className="inline-flex items-center gap-2">
              <Phone className="h-4 w-4" />
              01 525 311
            </span>
            <span className="inline-flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Public water reporting desk
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
