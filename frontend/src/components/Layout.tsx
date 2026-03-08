import { Link, NavLink } from 'react-router-dom';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
   <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-amber-100 to-amber-50">
      <header className="sticky top-0 z-20 border-b border-amber-200 bg-amber-50/90 backdrop-blur">
  <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-xs font-black tracking-tight text-amber-50 shadow">
              CG
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-semibold text-slate-900">Capability Gap AI</span>
              
            </div>
          </Link>
          <nav className="flex items-center gap-4 text-xs text-stone-700">
            <NavLink
              to="/roles"
              className={({ isActive }) =>
                `rounded-md px-3 py-1 transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-600 text-amber-50 shadow-sm'
                    : 'hover:bg-amber-100 hover:text-slate-900'
                }`
              }
            >
              Roles
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `rounded-md px-3 py-1 transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-600 text-amber-50 shadow-sm'
                    : 'hover:bg-amber-100 hover:text-slate-900'
                }`
              }
            >
              Dashboard
            </NavLink>
          </nav>
        </div>
      </header>
     <main className="mx-auto flex max-w-[1400px] flex-1 flex-col px-8 py-6">{children}</main>
      <footer className="border-t border-amber-200 bg-amber-50/90 py-4 text-center text-xs text-stone-600">
        Capability Gap AI · Adaptive Role Readiness
      </footer>
    </div>
  );
}

