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
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg w-full text-left transition-all duration-150"
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
      <span className="font-medium text-sm tracking-wide">{label}</span>
    </button>
  );
}
