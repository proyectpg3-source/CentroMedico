import { useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router";
import { LayoutChromeProvider } from "./LayoutContext";
import { Sidebar } from "./Sidebar";

const SIDEBAR_STORAGE_KEY = "centro-medico.sidebar-collapsed";

function getInitialSidebarState() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true";
}

export function Root() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getInitialSidebarState);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const chrome = useMemo(
    () => ({
      isSidebarCollapsed,
      isMobileSidebarOpen,
      toggleSidebar: () => setIsSidebarCollapsed((current) => !current),
      openMobileSidebar: () => setIsMobileSidebarOpen(true),
      closeMobileSidebar: () => setIsMobileSidebarOpen(false),
    }),
    [isMobileSidebarOpen, isSidebarCollapsed]
  );

  return (
    <LayoutChromeProvider value={chrome}>
      <div className="clinic-shell flex h-dvh overflow-hidden bg-background text-foreground">
        <a href="#main-content" className="clinic-skip-link">Saltar al contenido</a>
        <Sidebar />
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">

          <main id="main-content" tabIndex={-1} className="relative flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </LayoutChromeProvider>
  );
}
