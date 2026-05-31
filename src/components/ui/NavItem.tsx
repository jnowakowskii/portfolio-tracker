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
        ? { background: "#262626", color: "#ffffff", border: "1px solid #404040" }
        : { background: "transparent", color: "#737373", border: "1px solid transparent" }
      }
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#1c1c1c"; e.currentTarget.style.color = "#d4d4d4"; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#737373"; } }}
    >
      <div style={{ color: active ? "#ffffff" : "#525252" }}>
        {icon}
      </div>
      <span className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#262626] text-[#e5e5e5] text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
        {label}
      </span>
    </button>
  );
}
