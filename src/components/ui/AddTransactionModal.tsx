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
      
      // Clear form
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
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(2, 6, 23, 0.9)' }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative z-[10000]">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-slate-100">Add Transaction</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Symbol</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g. AAPL"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors uppercase"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Side</label>
            <div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button 
                type="button"
                onClick={() => setSide("BUY")}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${side === 'BUY' ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                BUY
              </button>
              <button 
                type="button"
                onClick={() => setSide("SELL")}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${side === 'SELL' ? 'bg-rose-600/20 text-rose-400' : 'text-slate-400 hover:text-slate-200'}`}
              >
                SELL
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Quantity</label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="number" 
                  step="any"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Price</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input 
                  type="number" 
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Date</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors [&::-webkit-calendar-picker-indicator]:opacity-50 [&::-webkit-calendar-picker-indicator]:invert"
                required
              />
            </div>
          </div>
          
          <div className="pt-4 flex gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors font-medium"
            >
              Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
