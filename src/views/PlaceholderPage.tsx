interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ color: "#ffffff" }}>
          {title}
        </h1>
        <p className="text-sm" style={{ color: "#525252" }}>Placeholder</p>
      </div>
    </div>
  );
}
