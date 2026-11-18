import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'How It Works | Nagrik Setu',
  description: 'Step-by-step guide to filing and tracking civic grievances on Nagrik Setu.',
};

const STEPS = [
  {
    step: '01',
    icon: '📸',
    title: 'Report with Photo & GPS',
    desc: 'Open the app, snap a photo of the civic issue, and your GPS location is automatically captured. Choose a category (pothole, garbage, broken streetlight) and add an optional description. Your complaint is instantly submitted with a unique tracking ID.',
    details: ['Auto GPS pinning with accuracy display', 'Category selection with smart suggestions', 'Anonymous reporting option available', 'Unique public ID for instant tracking'],
  },
  {
    step: '02',
    icon: '🔬',
    title: 'Analysis & Verification',
    desc: 'The system runs image forensics to detect manipulated photos, checks for duplicate complaints using semantic and visual similarity matching, and scores complaint severity. Fake or duplicate complaints are flagged automatically.',
    details: ['Error Level Analysis for image tampering', 'Perceptual & difference hash matching', 'Visual Language Model classification', 'Trust score computed from user history'],
  },
  {
    step: '03',
    icon: '🏛️',
    title: 'Department Routing',
    desc: 'Based on the detected category, location, and severity, the complaint is automatically routed to the correct municipal department. The routing engine matches complaints to departments handling those specific categories.',
    details: ['8 municipal departments supported', 'Category-based automatic routing', 'Ward-level geographic assignment', 'Escalation chains for high-severity issues'],
  },
  {
    step: '04',
    icon: '👷',
    title: 'Officer Assignment & SLA',
    desc: 'A field officer is assigned to your complaint with strict SLA deadlines. The clock starts: typically 48 hours for standard issues, less for critical ones. Overdue complaints are automatically escalated to senior officials.',
    details: ['Automatic officer assignment by ward', 'Configurable SLA per department', 'Multi-level escalation on breach', 'Real-time progress updates'],
  },
  {
    step: '05',
    icon: '✅',
    title: 'Resolution & Photo Proof',
    desc: 'Once the officer resolves the issue on ground, they upload resolution photos as proof of work. The before-and-after comparison is visible on your complaint timeline, ensuring verifiable accountability.',
    details: ['Mandatory resolution photo upload', 'Before/after visual comparison', 'Officer notes and work summary', 'GPS verification of resolution site'],
  },
  {
    step: '06',
    icon: '⭐',
    title: 'Citizen Verification & Rating',
    desc: 'You receive a notification when your complaint is marked resolved. Rate the resolution on a 5-star scale and leave feedback. Not satisfied? Reopen the complaint within 7 days and it goes back to the officer with higher priority.',
    details: ['5-star resolution quality rating', 'Reopen within 7-day window', 'Appeal option for disputed decisions', 'Community upvote support'],
  },
];

const KEY_FEATURES = [
  {
    icon: '🛡️',
    title: 'Fake Complaint Detection',
    desc: 'Image forensics using Error Level Analysis, perceptual hashing, and EXIF metadata inspection to flag manipulated or stock photos.',
  },
  {
    icon: '🔍',
    title: 'Duplicate Detection',
    desc: 'Semantic text similarity and visual hash matching identify when multiple citizens report the same issue, clustering them for faster resolution.',
  },
  {
    icon: '⏱️',
    title: 'SLA Tracking',
    desc: 'Automated deadline enforcement with configurable SLA windows per department. Overdue complaints trigger multi-level escalation alerts.',
  },
  {
    icon: '📍',
    title: 'GPS Verification',
    desc: 'Real-time GPS coordinates captured and cross-verified with EXIF data. Location accuracy is displayed to ensure geographic authenticity.',
  },
  {
    icon: '📋',
    title: 'Transparent Timeline',
    desc: 'Every status change, from submission to closure, is logged with timestamps, officer actions, and notes. Full audit trail for accountability.',
  },
  {
    icon: '👍',
    title: 'Community Upvotes',
    desc: 'Citizens can upvote issues that affect them too, helping prioritize complaints by community impact and driving faster resolution.',
  },
];

export default function HowItWorks() {
  return (
    <div className="space-y-16 py-4">
      {/* Hero */}
      <section className="text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
          From Complaint to Resolution
        </h1>
        <p className="mt-4 text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
          A transparent process that ensures every civic grievance
          is verified, routed, tracked, and resolved with accountability.
        </p>
      </section>

      {/* Timeline Steps */}
      <section>
        <div className="space-y-5">
          {STEPS.map((s) => (
            <div key={s.step} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center text-xl shrink-0">
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
                        <span className="w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Features */}
      <section>
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Key Capabilities</h2>
          <p className="text-gray-500 text-sm mt-2 max-w-lg mx-auto">
            Technologies and techniques that power each stage
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {KEY_FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="font-bold text-gray-900 mt-3 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Ready to report a civic issue?</h2>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Join the movement for transparent, accountable municipal governance.
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
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
      </section>
    </div>
  );
}
