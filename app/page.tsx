'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken, refreshAccessToken, clearTokens, getCurrentUser, logout } from '@/lib/auth';
import EpicsHierarchyPage from '@/components/hierarchy-table/EpicsHierarchyPage';
import FlowStatusDurationPage from '@/components/flow-status-duration/FlowStatusDurationPage';
import SprintPredictabilityPage from '@/components/sprint-predictability/SprintPredictabilityPage';
import ReleasePredictabilityPage from '@/components/release-predictability/ReleasePredictabilityPage';
import BugsByPriorityPage from '@/components/bugs-by-priority/BugsByPriorityPage';

export default function Home() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  
  useEffect(() => {
    // Bypass auth check on localhost or when BYPASS_AUTH is enabled
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1');
    const bypassAuthEnabled = process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
    
    if (isLocalhost || bypassAuthEnabled) {
      setAuthChecked(true);
      return;
    }

    (async () => {
      const token = getAccessToken();
      async function goLogin() {
        clearTokens();
        try { router.replace('/login'); } catch {}
        if (typeof window !== 'undefined') window.location.assign('/login');
      }
      if (!token) {
        const ok = await refreshAccessToken();
        if (!ok) return goLogin();
      }
      setAuthChecked(true);
    })();
  }, [router]);

  const [activeNavItem, setActiveNavItem] = useState('report-one');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const navigationItems = [
    { id: 'report-one', label: 'Flow Status Duration', icon: '📈' },
    { id: 'report-two', label: 'Epic/Story Hierarchy', icon: '📊' },
    { id: 'report-three', label: 'Sprint Predictability', icon: '📉' },
    { id: 'report-four', label: 'Release Predictability and Status', icon: '🚀' },
    { id: 'report-five', label: 'Open Bugs by Priority', icon: '🐛' },
  ];

  const renderMainContent = () => {
    switch (activeNavItem) {
      case 'report-one':
        return <FlowStatusDurationPage />;
      case 'report-two':
        return <EpicsHierarchyPage />;
      case 'report-three':
        return <SprintPredictabilityPage />;
      case 'report-four':
        return <ReleasePredictabilityPage />;
      case 'report-five':
        return <BugsByPriorityPage />;
      default:
        return (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <div className="text-4xl mb-3">🚧</div>
            <h2 className="text-lg font-semibold mb-2">Under Construction</h2>
            <p className="text-sm text-gray-600">
              {navigationItems.find(item => item.id === activeNavItem)?.label} is currently under development.
            </p>
          </div>
        );
    }
  };

  return authChecked ? (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileSidebarOpen(false)}></div>
          <div className="absolute inset-y-0 left-0 w-56 bg-white shadow-xl border-r border-gray-200 p-3 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-900">Report Collection</h2>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-2 text-gray-600 hover:text-gray-800"
                aria-label="Close sidebar"
              >
                ✕
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto">
              <div className="space-y-1">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveNavItem(item.id); setMobileSidebarOpen(false); }}
                    className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      activeNavItem === item.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={item.label}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Left Sidebar Navigation (desktop) */}
      <div className={`hidden md:block bg-white shadow-sm border-r border-gray-200 flex-shrink-0 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}>
        <div className="p-3 h-full flex flex-col">
          <div className="flex flex-col items-center mb-4">
            <h2 className={`text-lg font-bold text-gray-900 ${sidebarCollapsed ? 'hidden' : ''}`}>
              Report Collection
            </h2>
          </div>
          
          <nav className="flex-1 overflow-y-auto">
            {sidebarCollapsed ? (
              <div className="space-y-1">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveNavItem(item.id)}
                    className={`w-full flex items-center justify-center px-2 py-2 rounded-lg transition-colors ${
                      activeNavItem === item.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={item.label}
                  >
                    <span className="text-base">{item.icon}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveNavItem(item.id)}
                    className={`w-full flex items-center space-x-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                      activeNavItem === item.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    title={item.label}
                  >
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-xs font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </nav>

          <div className="mt-auto pt-2 border-t border-gray-200">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full text-gray-500 hover:text-gray-700 p-2 rounded hover:bg-gray-100 flex items-center justify-center"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                  sidebarCollapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"
                } />
              </svg>
              {!sidebarCollapsed && <span className="ml-2 text-xs font-medium">Collapse</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <div className="bg-white border-b border-gray-200 px-3 md:px-4 py-2.5 md:py-3 flex-shrink-0 relative z-30">
          <div className="flex items-center justify-between gap-2">
            {/* Left side: View title */}
            <div className="flex items-center gap-2 md:space-x-4 flex-1 min-w-0">
              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileSidebarOpen(true)}
                className="md:hidden p-2 rounded hover:bg-gray-100 text-gray-600"
                aria-label="Open sidebar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900 whitespace-nowrap">
                Report Collection
              </h1>
            </div>
            
            {/* Right side: user info */}
            <div className="flex items-center space-x-2 md:space-x-4 flex-1 justify-end">
              <div className="flex items-center space-x-3 text-sm text-gray-700">
                {(() => {
                  const u = getCurrentUser();
                  if (!u) return <span>Signed in</span>;
                  const fullName = (u.name || '').trim();
                  const firstName = fullName ? fullName.split(/\s+/)[0] : (u.email ? String(u.email).split('@')[0] : 'Signed in');
                  const desktopLabel = u.name && u.email ? `${u.name} (${u.email})` : (u.name || u.email || 'Signed in');
                  return (
                    <>
                      {/* Mobile: first name only, no email */}
                      <span className="md:hidden truncate max-w-[120px]" title={fullName || ''}>{firstName}</span>
                      {/* Desktop: name (email) */}
                      <span className="hidden md:inline" title={u.email || ''}>{desktopLabel}</span>
                    </>
                  );
                })()}
                <button
                  onClick={() => { logout(); try { location.assign('/login'); } catch {} }}
                  className="px-2 py-1 border rounded hover:bg-gray-50"
                  title="Logout"
                >Logout</button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-2 overflow-auto">
          {renderMainContent()}
        </div>
      </div>
    </div>
  ) : (
    <div className="min-h-screen flex items-center justify-center text-sm text-gray-600">
      Loading...
    </div>
  );
}


