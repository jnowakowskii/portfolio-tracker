import { useState } from "react";
import { MainLayout } from "./layout/MainLayout";
import { SummaryCard } from "./components/ui/SummaryCard";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <MainLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SummaryCard title="Total Value" value="124,500.00 PLN" change="+2.4%" isPositive={true} />
        <SummaryCard title="Monthly Div." value="450.00 PLN" change="+12% vs last mo." isPositive={true} />
        <SummaryCard title="Realized Profit" value="-1,200.00 PLN" change="-5.2%" isPositive={false} />
      </div>
      
      <div className="bg-slate-900 border border-slate-800 rounded-2xl h-80 flex items-center justify-center text-slate-500 italic">
        Chart Area (We will implement TradingView charts here)
      </div>
    </MainLayout>
  );
}

export default App;