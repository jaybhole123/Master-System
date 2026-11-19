'use client';

import { useState } from 'react';

// A person's profile photo, or their initials when there is none. The MIS
// API sends a generated ui-avatars.com URL for people without a photo; that is
// drawn locally instead (no extra request per person).
const PALETTE = ['#2563eb', '#7c3aed', '#0e9384', '#c4320a', '#475467', '#dd2590', '#0284c7'];

const initialsOf = (name?: string | null) =>
  (name ?? '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

const colourOf = (name?: string | null) => {
  let h = 0;
  for (const ch of name ?? '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

export const isRealPhoto = (src?: string | null) => !!src && !src.includes('ui-avatars.com');

const PersonAvatar = ({
  src,
  name,
  size = 36,
  className = '',
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size };
  if (isRealPhoto(src) && !failed) {
    return (
      // biome-ignore lint/performance/noImgElement: user photo from storage, any host
      <img
        src={src as string}
        alt={name ?? ''}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        style={style}
        className={`shrink-0 rounded-full object-cover ring-2 ring-background ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        ...style,
        background: colourOf(name),
        fontSize: Math.max(10, Math.round(size * 0.36)),
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-background ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
};

export default PersonAvatar;
