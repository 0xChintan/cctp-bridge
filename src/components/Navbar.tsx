import { Link, NavLink } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  return (
    <header className="mb-8 flex items-center justify-between gap-4 flex-wrap">
      <Link to="/" className="group">
        <h1 className="text-2xl font-semibold text-fg tracking-tight group-hover:text-fg/90">
          CCTP Bridge
        </h1>
        <p className="text-sm text-fg/50 mt-0.5">
          Native USDC across chains via Circle's CCTP.
        </p>
      </Link>
      <div className="flex items-center gap-2">
        <NavLink
          to="/docs"
          className={({ isActive }) =>
            [
              'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
              isActive
                ? 'bg-panel border-border text-fg'
                : 'bg-transparent border-border/60 text-fg/60 hover:text-fg/90',
            ].join(' ')
          }
        >
          Docs
        </NavLink>
        <ThemeToggle />
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
      </div>
    </header>
  );
}
