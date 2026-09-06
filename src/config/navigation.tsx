import { ReactNode } from "react";
import { House, History, Calendar, Eye, Settings, PieChart } from "lucide-react";

export interface NavSection {
  id: string;
  label: string;
  icon: ReactNode;
  /** bottom alignment */
  bottom?: boolean;
}

/**
 * navigation tabs
 */
export const NAV_ITEMS: NavSection[] = [
  { id: "dashboard", label: "Dashboard", icon: <House size={20} /> },
  { id: "allocation", label: "Allocation", icon: <PieChart size={20} /> },
  { id: "history", label: "History", icon: <History size={20} /> },
  { id: "dividends", label: "Dividends", icon: <Calendar size={20} /> },
  { id: "watchlist", label: "Watchlist", icon: <Eye size={20} /> },
  { id: "settings", label: "Settings", icon: <Settings size={20} />, bottom: true },
];
