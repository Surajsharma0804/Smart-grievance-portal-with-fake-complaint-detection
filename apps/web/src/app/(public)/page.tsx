import Link from 'next/link';
import { QuickTrackForm } from './QuickTrackForm';
import { LiveStats } from './LiveStats';

const FEATURES = [
  {
    step: '01',
    title: 'Report with Photo & GPS',
    desc: 'Snap a photo, pin your location, and describe the issue. Auto-categorization and duplicate checking happens in the background.',
    icon: '📸',
  },
  {
    step: '02',
    title: 'Triage & Routing',
    desc: 'Severity scoring, fake complaint detection, and automatic routing to the right municipal department — within minutes.',
    icon: '⚡',
  },
  {
    step: '03',
    title: 'Track SLA & Milestones',
    desc: 'Follow your complaint through every stage with a transparent timeline. Strict SLA windows ensure accountability.',
    icon: '📊',
  },
  {
    step: '04',
    title: 'Verified Resolution',
    desc: 'Officers upload before & after photo proof. Rate the fix and reopen within 7 days if unsatisfied.',
    icon: '✅',
  },
];

const TRUST_BADGES = [
  { icon: '🛡️', label: 'Fraud Detection' },
  { icon: '📍', label: 'GPS Verified' },
  { icon: '⏱️', label: 'SLA Guaranteed' },
  { icon: '🔍', label: 'Transparent Tracking' },
  { icon: '📱', label: '24/7 Accessible' },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Resident, Sector 22',
    text: 'Reported a broken streetlight near my colony. Got fixed in 36 hours! The tracking was so transparent — I could see exactly when the officer picked it up.',
    rating: 5,
  },
  {
    name: 'Rajesh Kumar',
    role: 'Shop Owner, Sector 17',
    text: 'The pothole outside my shop was there for months. Filed on Nagrik Setu and it was repaired within the SLA. The before-and-after photos gave me confidence.',
    rating: 5,
  },
  {
    name: 'Anita Verma',
    role: 'Teacher, Sector 35',
    text: 'What impressed me most is the duplicate detection. Someone had already reported the same drain issue — the system linked them and prioritized it.',
    rating: 4,
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16" suppressHydrationWarning>
      {/* Hero */}
      <section className="text-center pt-14 pb-10">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
          Report civic issues.
          <br className="hidden sm:inline" />
          <span className="text-teal-700">
            Get them resolved faster.
          </span>
        </h1>

        <p className="mt-6 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Submit complaints with photos and GPS location, track progress transparently,
          and hold your municipality accountable with verified photo evidence.
        </p>

        <div className="mt-8 flex justify-center gap-4 flex-wrap">
          <Link
            href="/report"
            className="px-7 py-3 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 transition-colors"
          >
            Report an Issue →
          </Link>
          <Link
            href="/nearby"
            className="px-7 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            🗺️ View Nearby Issues
          </Link>
        </div>

        <div className="mt-8 max-w-md mx-auto">
          <p className="text-xs text-gray-500 mb-2 font-medium">Already filed? Track your complaint:</p>
          <QuickTrackForm />
        </div>
      </section>

      {/* Trust Badges */}
      <section className="flex flex-wrap justify-center gap-3 -mt-6">
        {TRUST_BADGES.map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700"
          >
            <span>{b.icon}</span>
            <span>{b.label}</span>
          </div>
        ))}
      </section>

      {/* Live Stats */}
      <section>
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">City Grievance Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Real-time statistics from municipal complaint data</p>
        </div>
        <LiveStats />
      </section>

      {/* How It Works */}
      <section>
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">How It Works</h2>
          <p className="text-gray-500 text-sm mt-2">From complaint to resolution — a fully transparent process</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.step}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 transition-colors"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl mb-4">
                {f.icon}
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Step {f.step}</span>
              <h3 className="font-bold text-gray-900 mt-1 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gray-50 rounded-2xl p-8 md:p-10 border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">What Citizens Say</h2>
          <p className="text-gray-500 text-sm mt-2">Real experiences from residents using Nagrik Setu</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white border border-gray-200 rounded-xl p-5"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < t.rating ? 'text-amber-400' : 'text-gray-200'}>★</span>
                ))}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-700 flex items-center justify-center text-white font-bold text-xs">
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contractor Portal */}
      <section className="bg-amber-50 border border-amber-200 rounded-2xl p-8 md:p-10">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-gray-900">Contractor Bidding Portal</h3>
            <p className="text-gray-600 mt-3 leading-relaxed">
              Qualified contractors can bid on approved municipal repair projects.
              Transparent bidding, milestone tracking, and before &amp; after photo proof
              for every rupee spent on civic infrastructure.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm text-gray-700">
              <span>💰 Cost Estimation</span>
              <span>📋 Open Bidding</span>
              <span>📸 Before/After Proof</span>
            </div>
            <div className="mt-5">
              <Link
                href="/contractors"
                className="inline-block px-5 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 transition-colors"
              >
                Explore Contractor Portal →
              </Link>
            </div>
          </div>
          <div className="w-40 h-40 bg-amber-100 rounded-2xl flex items-center justify-center text-5xl">
            🏗️
          </div>
        </div>
      </section>

      {/* Staff Console */}
      <section className="bg-slate-900 text-white rounded-2xl p-8 md:p-10">
        <div className="max-w-3xl">
          <span className="text-teal-400 text-xs uppercase font-bold tracking-wider">Staff Portal</span>
          <h3 className="text-2xl font-bold mt-2">Municipal Staff &amp; Officer Console</h3>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-2xl">
            Authorized officers, department heads, and reviewers manage complaint queues,
            inspect flagged duplicate clusters, run analytics dashboards, and verify
            photo proof — all in a dedicated staff portal.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/staff"
              className="px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-semibold hover:bg-teal-500 transition-colors"
            >
              Open Staff Console →
            </Link>
            <Link
              href="/departments"
              className="px-5 py-2.5 bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-600 transition-colors"
            >
              View SLA Standards
            </Link>
            <Link
              href="/stats"
              className="px-5 py-2.5 bg-slate-700 text-slate-200 border border-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-600 transition-colors"
            >
              Full Analytics
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-10">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
          Ready to make your city better?
        </h2>
        <p className="text-gray-500 mt-2 max-w-lg mx-auto">
          Join citizens holding their municipality accountable.
          Every complaint drives real change.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <Link
            href="/register"
            className="px-7 py-3 bg-teal-700 text-white rounded-lg font-semibold hover:bg-teal-800 transition-colors"
          >
            Create Free Account
          </Link>
          <Link
            href="/how-it-works"
            className="px-7 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Learn More
          </Link>
        </div>
      </section>
    </div>
  );
}
