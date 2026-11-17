import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How It Works | Nagrik Setu',
  description: 'Learn how Nagrik Setu processes civic grievances from submission to resolution using AI-powered analysis.',
};

const STEPS = [
  {
    step: '01',
    icon: '📸',
    title: 'Report with Photo & GPS',
    desc: 'Open the app, snap a photo of the civic issue, and your GPS location is automatically captured. Choose a category — pothole, garbage, broken streetlight — and add an optional description. Your complaint is instantly submitted with a unique tracking ID.',
    details: ['Auto GPS pinning with accuracy display', 'Category selection with smart suggestions', 'Anonymous reporting option available', 'Unique public ID for instant tracking'],
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    step: '02',
    icon: '🤖',
    title: 'AI Analysis & Verification',
    desc: 'Our machine learning pipeline runs image forensics to detect manipulated photos, checks for duplicate complaints using semantic and visual similarity matching, and scores the complaint severity. Fake or duplicate complaints are flagged automatically.',
    details: ['Error Level Analysis for image tampering', 'Perceptual & difference hash matching', 'Visual Language Model classification', 'Trust score computed from user history'],
    color: 'from-purple-500 to-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  {
    step: '03',
    icon: '🏛️',
    title: 'Smart Department Routing',
    desc: 'Based on the AI-detected category, location, and severity, the complaint is automatically routed to the correct municipal department. No manual triage needed — our routing engine matches complaints to departments handling those specific categories.',
    details: ['8 municipal departments supported', 'Category-based automatic routing', 'Ward-level geographic assignment', 'Escalation chains for high-severity issues'],
    color: 'from-indigo-500 to-indigo-600',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  {
    step: '04',
    icon: '👷',
    title: 'Officer Assignment & SLA',
    desc: 'A field officer is assigned to your complaint with strict SLA (Service Level Agreement) deadlines. The clock starts ticking — typically 48 hours for standard issues, less for critical ones. Overdue complaints are automatically escalated to senior officials.',
    details: ['Automatic officer assignment by ward', 'Configurable SLA per department', 'Multi-level escalation on breach', 'Real-time progress updates'],
    color: 'from-teal-500 to-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
  },
  {
    step: '05',
    icon: '✅',
    title: 'Resolution & Photo Proof',
    desc: 'Once the officer resolves the issue on ground, they upload resolution photos as proof of work. The before-and-after comparison is visible on your complaint timeline, ensuring verifiable accountability for every civic fix.',
    details: ['Mandatory resolution photo upload', 'Before/after visual comparison', 'Officer notes and work summary', 'GPS verification of resolution site'],
    color: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  {
    step: '06',
    icon: '⭐',
    title: 'Citizen Verification & Rating',
    desc: 'You receive a notification when your complaint is marked resolved. Rate the resolution quality on a 5-star scale and leave feedback. Not satisfied? Reopen the complaint within 7 days and it goes back to the officer with higher priority.',
    details: ['5-star resolution quality rating', 'Reopen within 7-day window', 'Appeal option for disputed decisions', 'Community upvote support'],
    color: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
];

const KEY_FEATURES = [
  {
    icon: '🛡️',
    title: 'Fake Complaint Detection',
    desc: 'AI-powered image forensics using Error Level Analysis, perceptual hashing, and EXIF metadata inspection to flag manipulated or stock photos.',
    accent: 'bg-red-50 border-red-100',
  },
  {
    icon: '🔍',
    title: 'Duplicate Detection',
    desc: 'Semantic text similarity and visual hash matching identify when multiple citizens report the same issue — clustering them for faster resolution.',
    accent: 'bg-blue-50 border-blue-100',
  },
  {
    icon: '⏱️',
    title: 'SLA Tracking',
    desc: 'Automated deadline enforcement with configurable SLA windows per department. Overdue complaints trigger multi-level escalation alerts.',
    accent: 'bg-amber-50 border-amber-100',
  },
  {
    icon: '📍',
    title: 'GPS Verification',
    desc: 'Real-time GPS coordinates are captured and cross-verified with EXIF data. Location accuracy is displayed to ensure geographic authenticity.',
    accent: 'bg-green-50 border-green-100',
  },
  {
    icon: '📋',
    title: 'Transparent Timeline',
    desc: 'Every status change — from submission to closure — is logged with timestamps, officer actions, and notes. Full audit trail for accountability.',
    accent: 'bg-purple-50 border-purple-100',
  },
  {
    icon: '👍',
    title: 'Community Upvotes',
    desc: 'Citizens can upvote issues that affect them too, helping prioritize complaints by community impact and driving faster resolution of widespread problems.',
    accent: 'bg-teal-50 border-teal-100',
  },
];

export default function HowItWorks() {
  return (
    <div className="space-y-20 py-4">
      {/* Hero */}
      <section className="text-center relative">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-blue-50 to-transparent rounded-full blur-3xl" />
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full mb-6">
          📖 Process Overview
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
          From Complaint to{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Resolution
          </span>
        </h1>
        <p className="mt-4 text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
          A fully transparent, AI-assisted pipeline that ensures every civic grievance
          is verified, routed, tracked, and resolved with accountability.
        </p>
      </section>

      {/* Timeline Steps */}
      <section className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-purple-200 to-amber-200 hidden lg:block" />

        <div className="space-y-8 lg:space-y-0">
          {STEPS.map((s, i) => {
            const isLeft = i % 2 === 0;
            return (
              <div key={s.step} className="relative lg:flex lg:items-center lg:min-h-[220px]">
                {/* Center dot */}
                <div className="absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white border-4 border-gray-200 hidden lg:flex items-center justify-center z-10 shadow-sm">
                  <span className="text-lg">{s.icon}</span>
                </div>

                {/* Card */}
                <div
                  className={`lg:w-[calc(50%-40px)] ${
                    isLeft ? 'lg:mr-auto lg:pr-10' : 'lg:ml-auto lg:pl-10'
                  }`}
                >
                  <div className={`bg-white border ${s.border} rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden`}>
                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${s.color}`} />
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center text-2xl shrink-0 lg:hidden`}>
                        {s.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          Step {s.step}
                        </span>
                        <h3 className="font-bold text-gray-900 text-lg mt-0.5">{s.title}</h3>
                        <p className="text-sm text-gray-600 mt-2 leading-relaxed">{s.desc}</p>
                        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {s.details.map((d) => (
                            <li key={d} className="flex items-center gap-1.5 text-xs text-gray-500">
                              <span className={`w-1 h-1 rounded-full bg-gradient-to-r ${s.color} shrink-0`} />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Key Features */}
      <section>
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full mb-4">
            🔬 Key Technologies
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">What Makes It Smart</h2>
          <p className="text-gray-500 text-sm mt-2 max-w-lg mx-auto">
            Advanced AI and machine learning capabilities that power every stage of the pipeline
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {KEY_FEATURES.map((f) => (
            <div
              key={f.title}
              className={`${f.accent} border rounded-2xl p-6 hover:shadow-md transition-shadow`}
            >
              <span className="text-3xl">{f.icon}</span>
              <h3 className="font-bold text-gray-900 mt-3 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to report a civic issue?</h2>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          Join the movement for transparent, accountable municipal governance.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/report"
            className="px-7 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-500/20 transition-all hover:-translate-y-0.5"
          >
            Report an Issue →
          </Link>
          <Link
            href="/nearby"
            className="px-7 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-white bg-white/80 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
          >
            🗺️ View Nearby Issues
          </Link>
        </div>
      </section>
    </div>
  );
}
