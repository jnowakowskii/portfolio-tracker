import { ReactNode } from "react";

interface NavItemProps {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export function NavItem({ icon, label, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex items-center justify-center p-2.5 rounded-lg transition-all duration-150"
      style={active
        ? { background: "var(--border-primary)", color: "var(--text-primary)", border: "1px solid #404040" }
        : { background: "transparent", color: "var(--text-tertiary)", border: "1px solid transparent" }
      }
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "var(--bg-hover)"; e.currentTarget.style.color = "#d4d4d4"; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)"; } }}
    >
      <div style={{ color: active ? "var(--text-primary)" : "var(--text-quaternary)" }}>
        {icon}
      </div>
      <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#262626] text-[#e5e5e5] text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
        {label}
      </span>
    </button>
  );
}
