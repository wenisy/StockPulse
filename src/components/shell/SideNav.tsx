'use client';

import { cn } from '@/lib/utils';
import { useAppNavigation } from '@/hooks/useAppNavigation';

export function SideNav({ className }: { className?: string }) {
  const { activeSection, setActiveSection, sections } = useAppNavigation();

  return (
    <aside
      data-slot="side-nav"
      className={cn(
        'hidden w-56 shrink-0 border-r border-border-subtle bg-bg md:sticky md:top-14 md:block md:h-[calc(100dvh-3.5rem)]',
        className,
      )}
    >
      <nav className="flex flex-col gap-0.5 p-3">
        {sections.map(({ id, label, icon: Icon }) => {
          const active = id === activeSection;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSection(id)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors duration-[var(--motion-fast)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                active
                  ? 'bg-brand/10 text-brand font-medium'
                  : 'text-fg-muted hover:bg-bg-subtle hover:text-fg',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
