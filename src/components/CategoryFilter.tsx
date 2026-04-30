import Link from 'next/link';
import clsx from 'clsx';
import { CATEGORIES, type Category } from '@/db/schema';

export function CategoryFilter({
  active,
  sort,
}: {
  active: Category | null;
  sort: 'top' | 'new';
}) {
  const items: { label: string; value: Category | null }[] = [
    { label: 'all', value: null },
    ...CATEGORIES.map((c) => ({ label: c, value: c })),
  ];

  function href(value: Category | null) {
    const params = new URLSearchParams();
    if (sort !== 'top') params.set('sort', sort);
    if (value) params.set('category', value);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
  }

  return (
    <div className="flex flex-wrap gap-1.5 text-xs">
      {items.map((item) => {
        const isActive = item.value === active;
        return (
          <Link
            key={item.label}
            href={href(item.value)}
            scroll={false}
            className={clsx(
              'rounded-full border px-3 py-1 transition',
              isActive
                ? 'border-violet-500 bg-violet-500/20 text-violet-200'
                : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
