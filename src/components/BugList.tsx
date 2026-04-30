import type { Bug } from '@/db/schema';
import { BugCard } from './BugCard';

export function BugList({ bugs }: { bugs: Bug[] }) {
  if (bugs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-800 p-10 text-center text-zinc-500">
        No bugs here yet. Suspicious. Post one above.
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3">
      {bugs.map((bug) => (
        <li key={bug.id}>
          <BugCard bug={bug} />
        </li>
      ))}
    </ul>
  );
}
