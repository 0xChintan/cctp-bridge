import { useState } from 'react';
import type { CctpChain } from '../lib/cctp';

interface Props {
  chain: CctpChain;
  size?: number;
}

// DefiLlama hosts square JPG icons for every major chain.
function iconUrl(slug: string): string {
  return `https://icons.llamao.fi/icons/chains/rsz_${slug}.jpg`;
}

export function ChainIcon({ chain, size = 20 }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="inline-flex items-center justify-center rounded-full font-bold text-white shrink-0"
        style={{
          width: size,
          height: size,
          background: chain.color,
          fontSize: Math.max(8, size * 0.4),
          lineHeight: 1,
        }}
      >
        {chain.abbr.slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      src={iconUrl(chain.iconSlug)}
      alt={chain.label}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      loading="lazy"
      className="rounded-full shrink-0 object-cover bg-fg/5"
      style={{ width: size, height: size }}
    />
  );
}
