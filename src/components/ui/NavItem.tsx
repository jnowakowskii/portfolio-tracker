

export function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex items-center gap-3 px-3 py-2 rounded-xl w-full transition-all ${active ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'}`}>
      {icon} <span className="font-medium">{label}</span>
    </button>
  );
}
