import Link from 'next/link';
import clsx from 'clsx';
import type { Category } from '@/db/schema';

export function SortToggle({
  sort,
  category,
}: {
  sort: 'top' | 'new';
  category: Category | null;
}) {
  function href(value: 'top' | 'new') {
    const params = new URLSearchParams();
    if (value !== 'top') params.set('sort', value);
    if (category) params.set('category', category);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-950 p-1 text-xs">
      {(['top', 'new'] as const).map((value) => (
        <Link
          key={value}
          href={href(value)}
          scroll={false}
          className={clsx(
            'rounded-full px-3 py-1 transition',
            sort === value ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200',
          )}
        >
          {value}
        </Link>
      ))}
    </div>
  );
}
