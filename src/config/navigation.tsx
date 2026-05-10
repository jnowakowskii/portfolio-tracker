import { ReactNode } from "react";
import { LayoutDashboard, History, Calendar, BarChart3, Eye, Settings, PieChart } from "lucide-react";

export interface NavSection {
  id: string;
  label: string;
  icon: ReactNode;
  /** If true, the item is pushed to the bottom of the sidebar */
  bottom?: boolean;
}

/**
 * Single source of truth for all navigation tabs.
 * To add a new section, just append an entry here and create
 * its corresponding page component.
 */
export const NAV_ITEMS: NavSection[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { id: "allocation", label: "Allocation", icon: <PieChart size={18} /> },
  { id: "history", label: "History", icon: <History size={18} /> },
  { id: "dividends", label: "Dividends", icon: <Calendar size={18} /> },
  { id: "analytics", label: "Analytics", icon: <BarChart3 size={18} /> },
  { id: "watchlist", label: "Watchlist", icon: <Eye size={18} /> },
  { id: "settings", label: "Settings", icon: <Settings size={18} />, bottom: true },
];
