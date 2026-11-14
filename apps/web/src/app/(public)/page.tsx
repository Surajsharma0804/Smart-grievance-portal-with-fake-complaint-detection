import Link from 'next/link';
import { QuickTrackForm } from './QuickTrackForm';

export default function HomePage() {
  return (
    <div className="space-y-16" suppressHydrationWarning>
      <section className="text-center py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
          Automated Civic Triage & SLA Tracking
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-gray-900">
          Report civic issues. <br className="hidden sm:inline" />
          <span className="text-blue-600">Get them resolved faster.</span>
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Submit municipal complaints with photos and location, track progress in real time,
          and verify transparent resolution across Chandigarh city wards.
        </p>

        <div className="mt-8 flex justify-center gap-4 flex-wrap" suppressHydrationWarning>
          <Link
            href="/report"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-sm"
          >
            Report an issue
          </Link>
          <Link
            href="/nearby"
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 bg-white shadow-sm"
          >
            View nearby issues
          </Link>
        </div>

        <div className="mt-8">
          <p className="text-xs text-gray-500 mb-2">Already filed a complaint? Track it instantly:</p>
          <QuickTrackForm />
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-8 border-t border-gray-200 pt-12">
        <div className="text-center p-6 bg-white border border-gray-100 rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-blue-600 text-xl font-bold">1</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Report with Photo & GPS</h3>
          <p className="text-sm text-gray-600">
            Take a live photo, pin your location, and describe the problem. AI assists in categorizing and verifying the issue.
          </p>
        </div>
        <div className="text-center p-6 bg-white border border-gray-100 rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-green-600 text-xl font-bold">2</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Track SLA & Milestones</h3>
          <p className="text-sm text-gray-600">
            Follow your complaint through every stage. Transparent public timeline ensures accountability with strict SLA windows.
          </p>
        </div>
        <div className="text-center p-6 bg-white border border-gray-100 rounded-xl shadow-sm">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-purple-600 text-xl font-bold">3</span>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Verified Resolution</h3>
          <p className="text-sm text-gray-600">
            Assigned municipal officers resolve the problem with photo proof of work. Reopen within 7 days if unsatisfied.
          </p>
        </div>
      </section>

      <section className="bg-slate-900 text-white rounded-2xl p-8 md:p-12">
        <div className="max-w-3xl">
          <span className="text-blue-400 text-xs uppercase font-semibold tracking-wider">Enterprise Redressal</span>
          <h3 className="text-2xl md:text-3xl font-bold mt-2">Municipal Staff & Officer Console</h3>
          <p className="text-slate-300 mt-2 text-sm leading-relaxed">
            Authorized municipal officers, department administrators, and reviewers manage complaint queues,
            inspect AI duplicate clusters, and verify photo proof in the dedicated staff dashboard.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/staff"
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500"
            >
              Open Staff Console →
            </Link>
            <Link
              href="/departments"
              className="px-5 py-2.5 bg-slate-800 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium hover:bg-slate-700"
            >
              View Service Standards (SLA)
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
