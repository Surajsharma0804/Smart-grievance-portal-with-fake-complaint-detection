import Link from 'next/link';
import { QuickTrackForm } from './QuickTrackForm';
import { LiveStats } from './LiveStats';

const FEATURES = [
  {
    step: '01',
    title: 'Report with Photo & GPS',
    desc: 'Snap a photo, pin your exact location, and describe the issue. Our AI auto-categorizes and checks for duplicates.',
    icon: '📸',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
  },
  {
    step: '02',
    title: 'AI Triage & Smart Routing',
    desc: 'Machine learning scores severity, detects fake complaints, and routes to the right municipal department — all within minutes.',
    icon: '🤖',
    color: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
  },
  {
    step: '03',
    title: 'Track SLA & Milestones',
    desc: 'Follow your complaint through every stage with a transparent timeline. Strict SLA windows ensure accountability.',
    icon: '📊',
    color: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    step: '04',
    title: 'Verified Resolution',
    desc: 'Officers upload before & after photo proof. Rate the fix quality and reopen within 7 days if unsatisfied.',
    icon: '✅',
    color: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
  },
];

const TRUST_BADGES = [
  { icon: '🛡️', label: 'AI-Powered Detection' },
  { icon: '📍', label: 'GPS Verified Location' },
  { icon: '⏱️', label: 'SLA Guaranteed' },
  { icon: '🔍', label: 'Transparent Tracking' },
  { icon: '📱', label: '24/7 Accessible' },
  { icon: '🏛️', label: '8 Municipal Depts' },
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
    <div className="space-y-20" suppressHydrationWarning>
      {/* ═══ Hero Section ═══ */}
      <section className="relative text-center pt-16 pb-12 overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-blue-50 via-blue-50/30 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-50 rounded-full blur-3xl opacity-60" />
          <div className="absolute top-20 right-10 w-72 h-72 bg-amber-50 rounded-full blur-3xl opacity-60" />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/60 text-blue-700 text-xs font-semibold mb-8 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
          </span>
          Smart Grievance Redressal & Fake Complaint Detection
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 leading-[1.1]">
          Report civic issues.
          <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Get them resolved faster.
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Submit complaints with photos and GPS location, track progress transparently,
          and hold your municipality accountable with AI-powered verification.
        </p>

        <div className="mt-10 flex justify-center gap-4 flex-wrap">
          <Link
            href="/report"
            className="group px-7 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
          >
            Report an Issue
            <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          <Link
            href="/nearby"
            className="px-7 py-3.5 border border-gray-300 rounded-xl font-semibold hover:bg-white bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            🗺️ View Nearby Issues
          </Link>
        </div>

        <div className="mt-10 max-w-md mx-auto">
          <p className="text-xs text-gray-500 mb-2 font-medium">Already filed? Track your complaint instantly:</p>
          <QuickTrackForm />
        </div>
      </section>

      {/* ═══ Trust Badges ═══ */}
      <section className="flex flex-wrap justify-center gap-3 md:gap-4 -mt-8">
        {TRUST_BADGES.map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-700 shadow-sm hover:shadow-md transition-shadow"
          >
            <span>{b.icon}</span>
            <span>{b.label}</span>
          </div>
        ))}
      </section>

      {/* ═══ Live Stats ═══ */}
      <section>
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600" />
            </span>
            Live from Database
          </span>
          <h2 className="text-2xl md:text-3xl font-bold mt-3 text-gray-900">City Grievance Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Real-time statistics from municipal complaint data</p>
        </div>
        <LiveStats />
      </section>

      {/* ═══ How It Works ═══ */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">How It Works</h2>
          <p className="text-gray-500 text-sm mt-2 max-w-lg mx-auto">
            From complaint to resolution — a fully transparent, AI-assisted pipeline
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.step}
              className="group relative bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${f.color}`} />
              <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
                {f.icon}
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Step {f.step}</span>
              <h3 className="font-bold text-gray-900 mt-1 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Testimonials ═══ */}
      <section className="bg-gradient-to-b from-gray-50 to-white rounded-3xl p-8 md:p-12 border border-gray-100">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">What Citizens Say</h2>
          <p className="text-gray-500 text-sm mt-2">Real experiences from residents using Nagrik Setu</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.name}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span key={i} className={i < t.rating ? 'text-amber-400' : 'text-gray-200'}>★</span>
                ))}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
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

      {/* ═══ Contractor Portal CTA ═══ */}
      <section className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-200/50 rounded-3xl p-8 md:p-12">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-4">
              🏗️ Now Live
            </span>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900">Contractor Bidding Portal</h3>
            <p className="text-gray-600 mt-3 leading-relaxed">
              Qualified contractors can bid on approved municipal repair projects.
              Transparent bidding, milestone tracking, before &amp; after photo proof — bringing
              accountability to every rupee spent on civic infrastructure.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center text-xs">💰</span>
                AI Cost Estimation
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center text-xs">📋</span>
                Open Bidding
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center text-xs">📸</span>
                Before/After Proof
              </div>
            </div>
            <div className="mt-6">
              <Link
                href="/contractors"
                className="inline-block px-6 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl text-sm font-semibold hover:from-amber-700 hover:to-orange-700 shadow-lg shadow-amber-500/20 transition-all"
              >
                Explore Contractor Portal →
              </Link>
            </div>
          </div>
          <div className="w-48 h-48 bg-gradient-to-br from-amber-200 to-orange-300 rounded-3xl flex items-center justify-center text-6xl shadow-lg shadow-amber-200/50">
            🏗️
          </div>
        </div>
      </section>

      {/* ═══ Staff Console CTA ═══ */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="relative max-w-3xl">
          <span className="text-blue-400 text-xs uppercase font-bold tracking-wider">Enterprise Redressal</span>
          <h3 className="text-2xl md:text-3xl font-bold mt-3">Municipal Staff &amp; Officer Console</h3>
          <p className="text-slate-400 mt-3 text-sm leading-relaxed max-w-2xl">
            Authorized officers, department heads, and reviewers manage complaint queues,
            inspect AI-flagged duplicate clusters, run analytics dashboards, and verify
            photo proof — all in a dedicated staff portal.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/staff"
              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-500 shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl"
            >
              Open Staff Console →
            </Link>
            <Link
              href="/departments"
              className="px-6 py-3 bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-600 transition-colors"
            >
              View SLA Standards
            </Link>
            <Link
              href="/stats"
              className="px-6 py-3 bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-600 transition-colors"
            >
              📊 Full Analytics
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ Final CTA ═══ */}
      <section className="text-center py-12">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
          Ready to make your city better?
        </h2>
        <p className="text-gray-500 mt-2 max-w-lg mx-auto">
          Join thousands of citizens holding their municipality accountable.
          Every complaint drives real change.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/register"
            className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            Create Free Account
          </Link>
          <Link
            href="/how-it-works"
            className="px-8 py-3.5 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Learn More
          </Link>
        </div>
      </section>
    </div>
  );
}
