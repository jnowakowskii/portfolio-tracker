import { useState } from "react";
import Database from "@tauri-apps/plugin-sql";
import { X, Search, Hash, DollarSign, Calendar as CalendarIcon } from "lucide-react";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function AddTransactionModal({ isOpen, onClose, onSave }: AddTransactionModalProps) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const db = await Database.load("sqlite:portfolio.db");
      
      const qtyNum = parseFloat(quantity);
      const priceNum = parseFloat(price);
      
      if (!symbol || isNaN(qtyNum) || isNaN(priceNum) || !date) {
        alert("Please fill all required fields correctly.");
        return;
      }

      await db.execute(
        "INSERT INTO transactions (symbol, side, quantity, price, commission, date) VALUES ($1, $2, $3, $4, $5, $6)",
        [symbol.toUpperCase(), side, qtyNum, priceNum, 0, new Date(date).toISOString()]
      );
      
      setSymbol("");
      setSide("BUY");
      setQuantity("");
      setPrice("");
      setDate(new Date().toISOString().split('T')[0]);
      
      onSave();
      onClose();
    } catch (error) {
      console.error("Failed to add transaction:", error);
      alert("Failed to save transaction.");
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/80 backdrop-blur-md"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
    >
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_0_50px_-12px_rgba(59,130,246,0.15)] relative z-[10000]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80 bg-[#0f172a]">
          <h2 className="text-xl font-bold text-slate-50 tracking-tight">Add Transaction</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {/* Form Area */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-gradient-to-b from-[#0f172a] to-[#020617]">
          {/* Symbol */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Symbol</label>
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
              <input 
                type="text" 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="AAPL"
                className="w-full bg-[#020617] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all uppercase placeholder:text-slate-700 font-mono shadow-inner"
                required
              />
            </div>
          </div>

          {/* Side (Buy/Sell) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Side</label>
            <div className="flex bg-[#020617] border border-slate-800 rounded-xl p-1 shadow-inner">
              <button 
                type="button"
                onClick={() => setSide("BUY")}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  side === 'BUY' 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.15)]' 
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                BUY
              </button>
              <button 
                type="button"
                onClick={() => setSide("SELL")}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  side === 'SELL' 
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_-3px_rgba(244,63,94,0.15)]' 
                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                }`}
              >
                SELL
              </button>
            </div>
          </div>

          {/* Qty & Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quantity</label>
              <div className="relative group">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                <input 
                  type="number" 
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#020617] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-slate-700 font-mono shadow-inner"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Price</label>
              <div className="relative group">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
                <input 
                  type="number" 
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#020617] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all placeholder:text-slate-700 font-mono shadow-inner"
                  required
                />
              </div>
            </div>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</label>
            <div className="relative group">
              <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" size={16} />
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#020617] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all font-mono shadow-inner [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert hover:[&::-webkit-calendar-picker-indicator]:opacity-100 cursor-pointer"
                required
              />
            </div>
          </div>
          
          {/* Actions */}
          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-transparent border border-slate-800 hover:border-slate-700 text-slate-300 hover:bg-slate-800/50 hover:text-white transition-all font-semibold"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white transition-all font-bold shadow-lg shadow-blue-500/25 border border-blue-400/20 active:scale-[0.98]"
            >
              Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
