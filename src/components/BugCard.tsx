'use client';

import { useState, useTransition } from 'react';
import clsx from 'clsx';
import { voteBug, deleteBug } from '@/app/actions';
import type { Bug } from '@/db/schema';

const categoryColors: Record<string, string> = {
  frontend: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  backend: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  infra: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  human: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  ai: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
};

export function BugCard({ bug }: { bug: Bug }) {
  const [up, setUp] = useState(bug.upvotes);
  const [down, setDown] = useState(bug.downvotes);
  const [popUp, setPopUp] = useState(false);
  const [popDown, setPopDown] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const score = up - down;

  function vote(direction: 'up' | 'down') {
    setError(null);
    if (direction === 'up') {
      setUp((v) => v + 1);
      setPopUp(true);
      setTimeout(() => setPopUp(false), 220);
    } else {
      setDown((v) => v + 1);
      setPopDown(true);
      setTimeout(() => setPopDown(false), 220);
    }
    startTransition(async () => {
      const result = await voteBug({ id: bug.id, direction });
      if (!result.ok) {
        setError(result.error);
        if (direction === 'up') setUp((v) => v - 1);
        else setDown((v) => v - 1);
      }
    });
  }

  function handleDelete() {
    if (!confirm('Delete this bug forever?')) return;
    startTransition(async () => {
      const result = await deleteBug(bug.id);
      if (!result.ok) setError(result.error);
    });
  }

  const dateString = new Date(bug.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <article className="group flex gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-zinc-700">
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => vote('up')}
          disabled={pending}
          aria-label="Upvote"
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-900 hover:text-green-400 disabled:opacity-50"
        >
          <span className={clsx('block text-xl leading-none', popUp && 'pop')}>▲</span>
        </button>
        <span
          className={clsx(
            'min-w-[2.5ch] text-center text-sm font-bold tabular-nums',
            score > 0 && 'text-green-400',
            score < 0 && 'text-red-400',
            score === 0 && 'text-zinc-400',
          )}
        >
          {score}
        </span>
        <button
          type="button"
          onClick={() => vote('down')}
          disabled={pending}
          aria-label="Downvote"
          className="rounded-md p-1 text-zinc-500 hover:bg-zinc-900 hover:text-red-400 disabled:opacity-50"
        >
          <span className={clsx('block text-xl leading-none', popDown && 'pop')}>▼</span>
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span
            className={clsx(
              'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              categoryColors[bug.category] ?? 'border-zinc-700 bg-zinc-900 text-zinc-400',
            )}
          >
            {bug.category}
          </span>
          <h3 className="break-words text-base font-semibold text-zinc-100">{bug.title}</h3>
        </div>
        <p className="whitespace-pre-wrap break-words text-sm text-zinc-300">{bug.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span>by @{bug.author}</span>
          <span>·</span>
          <span>{dateString}</span>
          <span>·</span>
          <span className="text-green-500/70">+{up}</span>
          <span className="text-red-500/70">-{down}</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="ml-auto text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:text-red-400 disabled:opacity-50"
          >
            delete
          </button>
        </div>
        {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
      </div>
    </article>
  );
}
