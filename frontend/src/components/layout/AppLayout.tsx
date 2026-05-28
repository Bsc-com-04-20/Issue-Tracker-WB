import { Outlet, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppLayout() {
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <main
          key={location.pathname}
          className="flex-1 overflow-y-auto p-6 lg:p-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
