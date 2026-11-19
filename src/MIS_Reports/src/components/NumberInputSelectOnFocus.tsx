'use client';

import { useEffect } from 'react';

export default function NumberInputSelectOnFocus() {
  useEffect(() => {
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLInputElement;
      if (target.type === 'number') target.select();
    };
    document.addEventListener('focus', handleFocus, true);
    return () => document.removeEventListener('focus', handleFocus, true);
  }, []);

  return null;
}
