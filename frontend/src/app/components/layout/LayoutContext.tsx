import { createContext, useContext, type ReactNode } from "react";

export interface LayoutChromeContextValue {
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const noop = () => undefined;

const defaultValue: LayoutChromeContextValue = {
  isSidebarCollapsed: false,
  isMobileSidebarOpen: false,
  toggleSidebar: noop,
  openMobileSidebar: noop,
  closeMobileSidebar: noop,
};

const LayoutChromeContext = createContext<LayoutChromeContextValue>(defaultValue);

export function LayoutChromeProvider({
  value,
  children,
}: {
  value: LayoutChromeContextValue;
  children: ReactNode;
}) {
  return <LayoutChromeContext.Provider value={value}>{children}</LayoutChromeContext.Provider>;
}

export function useLayoutChrome() {
  return useContext(LayoutChromeContext);
}
