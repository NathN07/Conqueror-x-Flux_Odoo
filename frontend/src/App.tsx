import { useState, FC } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from './routes';
import { UserRole } from './types/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

export const App: FC = () => {
  // Prototype role switcher for testing role-based routes and sidebar
  const [role, setRole] = useState<UserRole>('ADMIN');

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Prototype Dev Bar for easy testing between roles */}
        <div className="bg-slate-950 text-slate-300 text-xs px-4 py-1.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-slate-200">Brightloop Subscription System</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">Preview Persona:</span>
          </div>
          <div className="flex items-center gap-1.5">
            {(['ADMIN', 'STAFF', 'CUSTOMER'] as UserRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  role === r
                    ? 'bg-brand-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <AppRoutes userRole={role} />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
