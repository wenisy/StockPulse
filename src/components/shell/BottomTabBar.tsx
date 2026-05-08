'use client';

import { cn } from '@/lib/utils';
import { useAppNavigation } from '@/hooks/useAppNavigation';

export function BottomTabBar() {
  const { activeSection, setActiveSection, sections } = useAppNavigation();

  return (
    <nav
      data-slot="bottom-tab-bar"
      aria-label="主导航"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-border-subtle bg-bg-elevated/90 backdrop-blur-md',
        'md:hidden',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      {sections.map(({ id, label, icon: Icon }) => {
        const active = id === activeSection;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveSection(id)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors duration-[var(--motion-fast)]',
              active ? 'text-brand' : 'text-fg-subtle hover:text-fg',
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
