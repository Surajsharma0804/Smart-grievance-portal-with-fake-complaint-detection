'use client';

import { useState, useOptimistic, useTransition } from 'react';
import {
  upvoteComplaintAction,
  reopenComplaintAction,
  submitFeedbackAction,
  appealComplaintAction,
} from '@/lib/complaint-actions';

interface TrackActionsProps {
  publicId: string;
  initialUpvotes: number;
  status: string;
  isOwner?: boolean;
}

export function TrackActions({
  publicId,
  initialUpvotes,
  status,
  isOwner,
}: TrackActionsProps) {
  const [optimisticUpvotes, setOptimisticUpvotes] = useOptimistic(
    initialUpvotes,
    (state, change: number) => state + change,
  );
  const [isPending, startTransition] = useTransition();
  const [upvoteError, setUpvoteError] = useState<string | null>(null);

  // Reopen state
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenMsg, setReopenMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Feedback state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Appeal state
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  const [appealMsg, setAppealMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function handleUpvote() {
    setUpvoteError(null);
    startTransition(async () => {
      setOptimisticUpvotes(1);
      const res = await upvoteComplaintAction(publicId);
      if (!res.success && res.error) {
        setUpvoteError(res.error);
        setOptimisticUpvotes(-1);
      }
    });
  }

  function handleReopen(e: React.FormEvent) {
    e.preventDefault();
    setReopenMsg(null);
    startTransition(async () => {
      const res = await reopenComplaintAction(publicId, reopenReason);
      if (res.success) {
        setReopenMsg({ text: 'Complaint reopened successfully.', ok: true });
        setReopenOpen(false);
      } else {
        setReopenMsg({ text: res.error || 'Failed to reopen', ok: false });
      }
    });
  }

  function handleFeedback(e: React.FormEvent) {
    e.preventDefault();
    setFeedbackMsg(null);
    startTransition(async () => {
      const res = await submitFeedbackAction(publicId, rating, comment);
      if (res.success) {
        setFeedbackDone(true);
        setFeedbackMsg('Thank you for rating our resolution!');
      } else {
        setFeedbackMsg(res.error || 'Failed to submit feedback');
      }
    });
  }

  function handleAppeal(e: React.FormEvent) {
    e.preventDefault();
    setAppealMsg(null);
    startTransition(async () => {
      const res = await appealComplaintAction(publicId, appealReason);
      if (res.success) {
        setAppealMsg({
          text: 'Appeal submitted. An administrative officer will re-examine the grievance.',
          ok: true,
        });
        setAppealOpen(false);
      } else {
        setAppealMsg({ text: res.error || 'Failed to submit appeal', ok: false });
      }
    });
  }

  return (
    <div className="space-y-4 my-6">
      {/* Upvote & Quick Actions bar */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending || isOwner}
          onClick={handleUpvote}
          title={isOwner ? 'Cannot upvote your own grievance' : 'Support this issue'}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <span>👍 Upvote</span>
          <span className="bg-gray-100 text-gray-700 font-semibold px-2 py-0.5 rounded text-xs">
            {optimisticUpvotes}
          </span>
        </button>

        {isOwner && (
          <span className="text-xs text-gray-500 italic">
            You filed this complaint
          </span>
        )}
      </div>

      {upvoteError && (
        <p className="text-xs text-red-600">{upvoteError}</p>
      )}

      {/* Appeal section for LINKED_DUPLICATE or NEEDS_REVIEW */}
      {isOwner && (status === 'LINKED_DUPLICATE' || status === 'NEEDS_REVIEW') && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-amber-900">
                {status === 'LINKED_DUPLICATE'
                  ? 'Grievance linked as a duplicate'
                  : 'Grievance flagged for manual verification'}
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                If you believe this determination was made in error, you can submit an appeal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAppealOpen((o) => !o)}
              className="text-xs px-3 py-1.5 bg-amber-700 text-white rounded font-medium hover:bg-amber-800"
            >
              {appealOpen ? 'Cancel' : 'Appeal Decision'}
            </button>
          </div>

          {appealMsg && (
            <p className={`text-xs mt-2 ${appealMsg.ok ? 'text-green-700' : 'text-red-700'}`}>
              {appealMsg.text}
            </p>
          )}

          {appealOpen && (
            <form onSubmit={handleAppeal} className="mt-3 space-y-2">
              <textarea
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                required
                minLength={10}
                maxLength={1000}
                placeholder="Explain why your grievance is unique or provide additional context..."
                className="w-full text-xs border rounded p-2 focus:ring-1 focus:ring-amber-500 bg-white"
                rows={3}
              />
              <button
                type="submit"
                disabled={isPending || appealReason.trim().length < 10}
                className="px-3 py-1 bg-amber-800 text-white rounded text-xs hover:bg-amber-900 disabled:opacity-50"
              >
                {isPending ? 'Submitting appeal...' : 'Submit Appeal'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Resolved Actions: Citizen Feedback & Reopen */}
      {isOwner && status === 'RESOLVED' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-semibold text-green-900">
            Issue Marked as Resolved
          </h4>

          {/* Feedback Form */}
          {!feedbackDone ? (
            <form onSubmit={handleFeedback} className="space-y-2">
              <label className="text-xs text-green-800 block">
                How satisfied are you with the resolution?
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-lg ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={500}
                placeholder="Optional feedback comment..."
                className="w-full text-xs border rounded px-2 py-1 bg-white"
              />
              <button
                type="submit"
                disabled={isPending}
                className="px-3 py-1 bg-green-700 text-white rounded text-xs hover:bg-green-800 disabled:opacity-50"
              >
                {isPending ? 'Submitting...' : 'Submit Rating'}
              </button>
            </form>
          ) : (
            <p className="text-xs text-green-800 font-medium">{feedbackMsg}</p>
          )}

          {/* Reopen form */}
          <div className="pt-2 border-t border-green-200">
            <button
              type="button"
              onClick={() => setReopenOpen((o) => !o)}
              className="text-xs text-gray-700 underline hover:text-red-600"
            >
              {reopenOpen ? 'Hide Reopen Option' : 'Problem still persists? Reopen within 7 days'}
            </button>

            {reopenMsg && (
              <p className={`text-xs mt-1 ${reopenMsg.ok ? 'text-green-700' : 'text-red-700'}`}>
                {reopenMsg.text}
              </p>
            )}

            {reopenOpen && (
              <form onSubmit={handleReopen} className="mt-2 space-y-2">
                <input
                  type="text"
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  required
                  minLength={5}
                  maxLength={500}
                  placeholder="State why the grievance was not resolved adequately..."
                  className="w-full text-xs border rounded px-2 py-1 bg-white"
                />
                <button
                  type="submit"
                  disabled={isPending || reopenReason.trim().length < 5}
                  className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending ? 'Reopening...' : 'Confirm Reopen'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
