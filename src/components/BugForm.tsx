'use client';

import { useState, useTransition } from 'react';
import { createBug } from '@/app/actions';
import { CATEGORIES } from '@/db/schema';

export function BugForm() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await createBug(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      const form = document.getElementById('bug-form') as HTMLFormElement | null;
      form?.reset();
      setTimeout(() => setSuccess(false), 2500);
    });
  }

  return (
    <form id="bug-form" action={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <input
        name="title"
        placeholder="Bug title (e.g. 'Date picker time-traveled')"
        required
        maxLength={120}
        className="col-span-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none sm:col-span-2"
      />
      <textarea
        name="description"
        placeholder="What happened? Be specific. Be funny. Be honest."
        required
        maxLength={2000}
        rows={3}
        className="col-span-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none sm:col-span-2"
      />
      <input
        name="author"
        placeholder="Your handle"
        required
        maxLength={40}
        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm placeholder:text-zinc-600 focus:border-violet-500 focus:outline-none"
      />
      <select
        name="category"
        required
        defaultValue="frontend"
        className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <div className="col-span-1 flex items-center justify-between gap-3 sm:col-span-2">
        <p className="text-xs text-zinc-500">
          {error ? <span className="text-red-400">{error}</span> : null}
          {success ? <span className="text-green-400">Saved. Thanks for the bug.</span> : null}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Post bug'}
        </button>
      </div>
    </form>
  );
}
