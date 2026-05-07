interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight">
          {title}
        </h1>
        <p className="text-slate-500 text-sm font-medium">Coming soon</p>
      </div>
    </div>
  );
}
