import React, { useState, useEffect, useRef } from 'react';
import { 
  Wallet,
  Mic,
  Plus,
  TrendingDown,
  TrendingUp,
  History,
  Trash2,
  BarChart3,
  Download,
  Zap,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

// --- TS MODELS ---
interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
}

// --- TRANSLATIONS ---
const translations = {
  en: {
    title: "MoneyFlow",
    agent: "Agent",
    tagline: "Your autonomous financial assistant. Speak or type to track.",
    placeholder_smart: "Type 'Spent 50k on coffee' or click mic...",
    listening: "Listening now...",
    inc: "Total Income",
    exp: "Total Expense",
    bal: "Current Balance",
    chart_title: "Financial Trends (Daily)",
    btn_clear: "Reset Data",
    btn_export: "Export to Excel",
    table_in: "Income Record",
    table_out: "Expense Record",
    table_hist: "Daily Balance History",
    mode_smart: "Smart Entry",
    mode_manual: "Manual Entry",
    label_date: "Date",
    label_desc: "Description",
    label_type: "Type",
    label_amt: "Amount",
    no_data: "No transactions recorded yet."
  },
  id: {
    title: "MoneyFlow",
    agent: "Agent",
    tagline: "Agen keuangan otomatis kamu. Ketik atau bicara untuk merekap.",
    placeholder_smart: "Cth: 'Januari tanggal 3 pemasukan 20rb makan'...",
    listening: "Mendengarkan...",
    inc: "Pemasukan",
    exp: "Pengeluaran",
    bal: "Sisa Saldo",
    chart_title: "Tren Keuangan (Harian)",
    btn_clear: "Reset Data",
    btn_export: "Unduh Excel (.csv)",
    table_in: "Tabel Pemasukan",
    table_out: "Tabel Pengeluaran",
    table_hist: "Tabel Riwayat Saldo",
    mode_smart: "Input Cerdas",
    mode_manual: "Input Kolom",
    label_date: "Tanggal",
    label_desc: "Keterangan",
    label_type: "Aksi",
    label_amt: "Nominal",
    no_data: "Belum ada transaksi tercatat."
  }
};

const monthsMap: { [key: string]: number } = {
  januari: 0, january: 0, february: 1, februari: 1, march: 2, maret: 2, 
  april: 3, may: 4, mei: 4, june: 5, juni: 5, july: 6, juli: 6, 
  august: 7, agustus: 7, september: 8, october: 9, oktober: 9, 
  november: 10, december: 11, desember: 11
};

const App: React.FC = () => {
  const [lang, setLang] = useState<'id' | 'en'>('id');
  const t = translations[lang];
  const [inputMode, setInputMode] = useState<'smart' | 'manual'>('smart');
  const [financeInput, setFinanceInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('moneyflow_data');
    return saved ? JSON.parse(saved) : [];
  });

  // Manual Form States
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);
  const [mDesc, setMDesc] = useState('');
  const [mType, setMType] = useState<'income' | 'expense'>('expense');
  const [mAmt, setMAmt] = useState('');

  // Refs for auto-focus navigation
  const descRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const amtRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('moneyflow_data', JSON.stringify(transactions));
  }, [transactions]);

  // --- REAL-TIME THOUSAND SEPARATOR ---
  const formatNumber = (val: string) => {
    const num = val.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const handleAmtChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMAmt(formatNumber(e.target.value));
  };

  // --- SMART PARSING ---
  const processSmartInput = (input: string) => {
    if (!input.trim()) return;
    const lower = input.toLowerCase();
    
    const amountMatch = input.match(/(\d+[\d,.]*)[\s.]*(rb|ribu|k|000|juta|jt|million|m)?/i);
    let amount = 0;
    if (amountMatch) {
      amount = parseInt(amountMatch[1].replace(/[,.]/g, ''));
      const suffix = (amountMatch[2] || '').toLowerCase();
      if (suffix.includes('rb') || suffix.includes('ribu') || suffix.includes('k')) amount *= 1000;
      if (suffix.includes('juta') || suffix.includes('jt') || suffix.includes('million') || suffix.includes('m')) amount *= 1000000;
    }

    let targetDate = new Date();
    const dayMatch = lower.match(/tanggal\s+(\d+)|date\s+(\d+)/i);
    const day = dayMatch ? parseInt(dayMatch[1] || dayMatch[2]) : targetDate.getDate();
    let monthFound = targetDate.getMonth();
    for (const m in monthsMap) { if (lower.includes(m)) { monthFound = monthsMap[m]; break; } }
    targetDate.setMonth(monthFound); targetDate.setDate(day);

    let type: 'income' | 'expense' = lower.match(/gaji|masuk|pemasukan|income|tambah|bonus|untung/) ? 'income' : 'expense';
    let description = input.replace(/(\d+[\d,.]*)[\s.]*(rb|ribu|k|000|juta|jt|million|m)?/i, '')
      .replace(/tanggal\s+\d+|date\s+\d+|bulan|month/gi, '')
      .replace(new RegExp(Object.keys(monthsMap).join('|'), 'gi'), '')
      .replace(/pemasukan|pengeluaran|income|expense|masuk|keluar|dengan keterangan|dengan|keterangan|untuk|buat/gi, '')
      .trim();

    if (amount > 0) {
      setTransactions([{ id: Date.now().toString(), date: targetDate.toISOString().split('T')[0], description: description || (type === 'income' ? 'Income' : 'Expense'), amount, type }, ...transactions]);
      setFinanceInput('');
    }
  };

  // --- MANUAL ADD ---
  const handleManualAdd = () => {
    const rawAmt = parseInt(mAmt.replace(/\./g, ''));
    if (rawAmt > 0 && mDesc) {
      setTransactions([{ id: Date.now().toString(), date: mDate, description: mDesc, amount: rawAmt, type: mType }, ...transactions]);
      setMDesc(''); setMAmt(''); setMDate(new Date().toISOString().split('T')[0]);
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'id' ? 'id-ID' : 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => { processSmartInput(event.results[0][0].transcript); };
    recognition.start();
  };

  // --- EXPORT TO ACCOUNTING CSV ---
  const exportToCSV = () => {
    const headers = ["DATE", "DESCRIPTION", "TYPE", "INCOME (DR)", "EXPENSE (CR)", "REMAINING BALANCE"];
    let running = 0;
    
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    const rows = sorted.map(tx => {
      const inc = tx.type === 'income' ? tx.amount : 0;
      const exp = tx.type === 'expense' ? tx.amount : 0;
      running += (inc - exp);
      return [tx.date, tx.description, tx.type.toUpperCase(), inc, exp, running];
    });

    const totalInc = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExp = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const summaryRows = [
      [],
      ["SUMMARY REPORT"],
      ["Total Income", totalInc],
      ["Total Expense", totalExp],
      ["Final Net Balance", totalInc - totalExp]
    ];
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n") + "\n"
      + summaryRows.map(e => e.join(",")).join("\n");

    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Accounting_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const totalIn = transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const totalOut = transactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  
  const groupedByDate = transactions.reduce((acc: any, tx) => {
    if (!acc[tx.date]) acc[tx.date] = { date: tx.date, in: 0, out: 0 };
    if (tx.type === 'income') acc[tx.date].in += tx.amount;
    else acc[tx.date].out += tx.amount;
    return acc;
  }, {});
  const historyData = Object.values(groupedByDate).sort((a: any, b: any) => a.date.localeCompare(b.date));

  return (
    <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: '900px' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
           <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '12px', boxShadow: '0 8px 16px rgba(139, 92, 246, 0.4)' }}><Wallet color="white" size={24} /></div>
           <h2 style={{ fontSize: '1.4rem' }}>{t.title} <span style={{ color: 'var(--primary)', fontWeight: '400' }}>{t.agent}</span></h2>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button className="glass-card" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(16, 185, 129, 0.2)' }} onClick={exportToCSV}>
            <Download size={16} /> {t.btn_export}
          </button>
          <button className="glass-card" style={{ width: '40px', height: '40px', borderRadius: '50%', color: 'var(--primary)', fontWeight: 'bold' }} onClick={() => setLang(lang === 'id' ? 'en' : 'id')}>{lang.toUpperCase()}</button>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3.5rem' }}>
         <motion.div whileHover={{ scale: 1.02 }} className="glass-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
           <TrendingUp color="var(--secondary)" size={20} />
           <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{t.inc}</p>
           <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Rp{totalIn.toLocaleString('id-ID')}</h3>
         </motion.div>
         <motion.div whileHover={{ scale: 1.02 }} className="glass-card" style={{ borderLeft: '4px solid var(--accent)' }}>
           <TrendingDown color="var(--accent)" size={20} />
           <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{t.exp}</p>
           <h3 style={{ fontSize: '1.5rem', fontWeight: '800' }}>Rp{totalOut.toLocaleString('id-ID')}</h3>
         </motion.div>
         <motion.div whileHover={{ scale: 1.02 }} className="glass-card" style={{ background: 'var(--primary-glow)', border: '1px solid var(--primary)' }}>
           <Wallet color="white" size={20} />
           <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{t.bal}</p>
           <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'white' }}>Rp{(totalIn - totalOut).toLocaleString('id-ID')}</h3>
         </motion.div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '3.5rem', borderRadius: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button className={`tab-btn ${inputMode === 'smart' ? 'active' : ''}`} onClick={() => setInputMode('smart')} style={{ flex: 1, borderRadius: '1rem' }}>
            <Zap size={16} /> {t.mode_smart}
          </button>
          <button className={`tab-btn ${inputMode === 'manual' ? 'active' : ''}`} onClick={() => setInputMode('manual')} style={{ flex: 1, borderRadius: '1rem' }}>
            <LayoutGrid size={16} /> {t.mode_manual}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {inputMode === 'smart' ? (
            <motion.div key="smart" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', gap: '0.8rem' }}>
              <input className="input-field" style={{ flex: 1, height: '3.5rem', paddingLeft: '1.25rem', borderRadius: '1.2rem' }} placeholder={isListening ? t.listening : t.placeholder_smart} value={financeInput} onChange={(e) => setFinanceInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && processSmartInput(financeInput)} />
              <button className={`mic-btn ${isListening ? 'listening' : ''}`} onClick={toggleListening} style={{ width: '3.5rem', height: '3.5rem' }}><Mic size={24} /></button>
            </motion.div>
          ) : (
            <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1fr 1.5fr 0.5fr', gap: '0.8rem', alignItems: 'end' }}>
               <div>
                 <p style={{ fontSize: '0.7rem', paddingLeft: '0.5rem', color: 'var(--text-muted)' }}>{t.label_date}</p>
                 <input className="input-field" type="date" value={mDate} onChange={(e) => { setMDate(e.target.value); descRef.current?.focus(); }} style={{ fontSize: '0.8rem', height: '3rem' }} />
               </div>
               <div>
                 <p style={{ fontSize: '0.7rem', paddingLeft: '0.5rem', color: 'var(--text-muted)' }}>{t.label_desc}</p>
                 <input ref={descRef} className="input-field" placeholder="Bakso..." value={mDesc} onChange={(e) => setMDesc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && typeRef.current?.focus()} style={{ height: '3rem' }} />
               </div>
               <div>
                  <p style={{ fontSize: '0.7rem', paddingLeft: '0.5rem', color: 'var(--text-muted)' }}>{t.label_type}</p>
                  <select ref={typeRef} className="input-field" value={mType} onChange={(e) => { setMType(e.target.value as any); amtRef.current?.focus(); }} style={{ height: '3rem', cursor: 'pointer' }}>
                    <option value="expense">OUT</option>
                    <option value="income">IN</option>
                  </select>
               </div>
               <div>
                 <p style={{ fontSize: '0.7rem', paddingLeft: '0.5rem', color: 'var(--text-muted)' }}>{t.label_amt}</p>
                 <div style={{ position: 'relative' }}>
                   <span style={{ position: 'absolute', left: '10px', top: '12px', fontSize: '0.8rem', opacity: 0.5 }}>Rp</span>
                   <input ref={amtRef} className="input-field" style={{ height: '3rem', paddingLeft: '2rem' }} value={mAmt} onChange={handleAmtChange} onKeyDown={(e) => e.key === 'Enter' && handleManualAdd()} placeholder="0" />
                 </div>
               </div>
               <button className="btn-primary" onClick={handleManualAdd} style={{ height: '3rem', width: '3rem', padding: 0 }}><Plus /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {transactions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div className="glass-card">
             <h4 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><BarChart3 size={18} /> {t.chart_title}</h4>
             <div style={{ height: '280px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '1rem', color: 'white' }} />
                    <Bar name={t.inc} dataKey="in" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                    <Bar name={t.exp} dataKey="out" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
             <h4 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}><History size={18} /> {t.table_hist}</h4>
             <table className="finance-table">
               <thead><tr><th>{t.label_date}</th><th>{t.label_desc}</th><th>{t.label_type}</th><th>{t.label_amt}</th></tr></thead>
               <tbody>
                  {transactions.slice(0, 10).map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontSize: '0.8rem' }}>{tx.date}</td>
                      <td style={{ fontWeight: '600' }}>{tx.description}</td>
                      <td><span style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: tx.type === 'income' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', color: tx.type === 'income' ? 'var(--secondary)' : 'var(--accent)' }}>{tx.type.toUpperCase()}</span></td>
                      <td style={{ fontWeight: 'bold' }} className={tx.type === 'income' ? 'amount-in' : 'amount-out'}>{tx.type === 'income' ? '+' : '-'}{tx.amount.toLocaleString('id-ID')}</td>
                    </tr>
                  ))}
               </tbody>
             </table>
          </div>

          <button onClick={() => confirm("Hapus semua?") && setTransactions([])} style={{ margin: '0 auto', background: 'transparent', color: 'var(--accent)', border: '1px solid rgba(225,29,72,0.2)', padding: '0.6rem 1.2rem', borderRadius: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}>
            <Trash2 size={16} /> {t.btn_clear}
          </button>
        </div>
      )}

      <footer style={{ marginTop: '5rem', textAlign: 'center', padding: '2.5rem 0', borderTop: '1px solid var(--card-border)', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
         <p>&copy; 2026 MoneyFlow Agent • Professional Accounting Node v3.0</p>
      </footer>
    </div>
  );
};

export default App;
