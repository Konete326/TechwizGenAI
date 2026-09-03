import { Outlet, Link } from "react-router-dom";
import { Sparkle, ShieldCheck, Cpu } from "@phosphor-icons/react";

export const RootLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkle size={20} weight="fill" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold tracking-tight text-white leading-tight">Techwiz GenAI</span>
              <span className="text-[10px] font-mono text-zinc-400">PWA Ready</span>
            </div>
          </Link>

          <nav className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              API Runtime Active
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <Cpu size={16} className="text-zinc-400" />
            <span>Techwiz GenAI Platform</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-500" />
            <span>Enterprise Security Hardened</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RootLayout;
