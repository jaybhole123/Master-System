'use client';

import { ThemeProvider as NextThemesProvider, useTheme } from 'next-themes';
import type * as React from 'react';
import { useEffect } from 'react';

/** Browser bar colour (`theme-color`) per theme — brand blue (--primary) in both themes.
 * Keep in sync with `viewport.themeColor` in app/layout.tsx and app/manifest.ts. */
export const THEME_COLOR = { light: '#1447e6', dark: '#1447e6' } as const;

/**
 * Keeps the browser's bar colour (`<meta name="theme-color">`) in step with
 * the app's own light/dark toggle. The static tags in the root layout only
 * follow the OS setting; this switches them when the user flips the app theme,
 * re-applies it if Next re-renders the <head> tags on navigation, and adds a
 * tag if none is present.
 */
function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const color = resolvedTheme === 'dark' ? THEME_COLOR.dark : THEME_COLOR.light;

    const apply = () => {
      const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
      if (metas.length === 0) {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = color;
        document.head.appendChild(meta);
        return;
      }
      for (const meta of metas) {
        if (meta.content !== color) meta.content = color;
      }
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['content'],
    });
    return () => observer.disconnect();
  }, [resolvedTheme]);

  return null;
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider {...props}>
      <ThemeColorSync />
      {children}
    </NextThemesProvider>
  );
}
