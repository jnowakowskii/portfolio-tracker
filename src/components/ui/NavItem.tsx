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
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl w-full transition-all duration-200 ${
        active 
          ? 'bg-gradient-to-r from-blue-600/20 to-blue-600/5 text-blue-400 border border-blue-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]' 
          : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
      }`}
    >
      <div className={`${active ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`}>
        {icon}
      </div>
      <span className="font-medium tracking-wide text-sm">{label}</span>
    </button>
  );
}
