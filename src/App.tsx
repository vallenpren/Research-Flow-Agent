import React, { useState, useEffect } from 'react';
import { 
  Wallet,
  Mic,
  Plus,
  TrendingDown,
  TrendingUp,
  History,
  Languages,
  Trash2,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
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
    placeholder: "Type 'Spent 50k on coffee' or click mic...",
    listening: "Listening now...",
    inc: "Total Income",
    exp: "Total Expense",
    bal: "Current Balance",
    chart_title: "Financial Trends (Daily)",
    btn_clear: "Reset Data",
    table_in: "Income Record",
    table_out: "Expense Record",
    table_hist: "Daily Balance History",
    col_date: "Date",
    col_desc: "Description",
    col_amt: "Amount",
    col_rem: "Remaining",
    no_data: "No transactions recorded yet."
  },
  id: {
    title: "MoneyFlow",
    agent: "Agent",
    tagline: "Agen keuangan otomatis kamu. Ketik atau bicara untuk merekap.",
    placeholder: "Ketik 'Makan bakso 20rb' atau klik mic...",
    listening: "Mendengarkan...",
    inc: "Pemasukan",
    exp: "Pengeluaran",
    bal: "Sisa Saldo",
    chart_title: "Tren Keuangan (Harian)",
    btn_clear: "Reset Data",
    table_in: "Tabel Pemasukan",
    table_out: "Tabel Pengeluaran",
    table_hist: "Tabel Riwayat Saldo",
    col_date: "Tanggal",
    col_desc: "Keterangan",
    col_amt: "Jumlah",
    col_rem: "Sisa",
    no_data: "Belum ada transaksi tercatat."
  }
};

const App: React.FC = () => {
  const [lang, setLang] = useState<'id' | 'en'>('id');
  const t = translations[lang];
  const [financeInput, setFinanceInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('moneyflow_data');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist Data
  useEffect(() => {
    localStorage.setItem('moneyflow_data', JSON.stringify(transactions));
  }, [transactions]);

  // --- CORE LOGIC: PARSING ---
  const processInput = (input: string) => {
    if (!input.trim()) return;

    // Detection logic for Indonesian & English amounts
    // Supports 20rb, 20.000, 20k, 1juta, etc.
    const amountMatch = input.match(/(\d+[\d,.]*)[\s.]*(rb|ribu|k|000|juta|jt|million|m)?/i);
    let amount = 0;
    
    if (amountMatch) {
      let rawNum = amountMatch[1].replace(/[,.]/g, '');
      amount = parseInt(rawNum);
      const suffix = (amountMatch[2] || '').toLowerCase();
      
      if (suffix.includes('rb') || suffix.includes('ribu') || suffix.includes('k')) amount *= 1000;
      if (suffix.includes('juta') || suffix.includes('jt') || suffix.includes('million') || suffix.includes('m')) amount *= 1000000;
    }

    const lower = input.toLowerCase();
    let type: 'income' | 'expense' = 'expense';
    // Income keywords
    const incWords = ['gaji', 'masuk', 'pemasukan', 'income', 'tambah', 'bonus', 'salary', 'received'];
    if (incWords.some(w => lower.includes(w))) {
      type = 'income';
    }

    if (amount > 0) {
      const newTx: Transaction = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        description: input.replace(/(\d+).*/, '').trim() || (type === 'income' ? 'Income' : 'Expense'),
        amount,
        type
      };
      setTransactions([newTx, ...transactions]);
      setFinanceInput('');
    } else {
      alert(lang === 'id' ? "Duh, nominal uangnya tidak terbaca. Coba ketik: 'Bakso 20rb'" : "Amount not detected. Try: 'Lunch 50k'");
    }
  };

  // --- VOICE ACTION ---
  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'id' ? 'id-ID' : 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setFinanceInput(text);
      processInput(text);
    };
    recognition.start();
  };

  // --- CALCULATIONS ---
  const totalIn = transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const totalOut = transactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const balance = totalIn - totalOut;

  const groupedByDate = transactions.reduce((acc: any, tx) => {
    if (!acc[tx.date]) acc[tx.date] = { date: tx.date, in: 0, out: 0 };
    if (tx.type === 'income') acc[tx.date].in += tx.amount;
    else acc[tx.date].out += tx.amount;
    return acc;
  }, {});

  const chartData = Object.values(groupedByDate).sort((a: any, b: any) => a.date.localeCompare(b.date));
  
  // Running Balance Calculation
  let running = 0;
  const historyData = chartData.map((d: any) => {
    running += (d.in - d.out);
    return { ...d, balance: running };
  });

  return (
    <div className="container">
      {/* Top Navbar */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="glass-card" style={{ padding: '0.6rem', borderRadius: '0.75rem', background: 'var(--primary-glow)' }}>
            <Wallet size={24} color="white" />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{t.title} <span style={{ color: 'var(--primary)' }}>{t.agent}</span></span>
        </div>
        <button 
          className="glass-card" 
          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--primary-glow)', color: 'var(--primary)' }}
          onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
        >
          <Languages size={16} /> {lang.toUpperCase()}
        </button>
      </nav>

      {/* Hero Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>{t.tagline}</p>
      </motion.div>

      {/* Main Stats Card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <motion.div whileHover={{ y: -5 }} className="glass-card">
          <TrendingUp color="var(--secondary)" size={22} style={{ marginBottom: '0.75rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.inc}</p>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--secondary)' }}>Rp{totalIn.toLocaleString()}</h3>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="glass-card">
          <TrendingDown color="var(--accent)" size={22} style={{ marginBottom: '0.75rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.exp}</p>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent)' }}>Rp{totalOut.toLocaleString()}</h3>
        </motion.div>
        <motion.div whileHover={{ y: -5 }} className="glass-card" style={{ border: '1px solid var(--primary)' }}>
          <Wallet color="var(--primary)" size={22} style={{ marginBottom: '0.75rem' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{t.bal}</p>
          <h3 style={{ fontSize: '1.4rem', fontWeight: '700' }}>Rp{balance.toLocaleString()}</h3>
        </motion.div>
      </div>

      <main>
        {/* Input Control Center */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
             <input 
               className="input-field"
               style={{ height: '4rem', paddingLeft: '1.25rem', fontSize: '1rem', borderRadius: '1.25rem' }}
               placeholder={isListening ? t.listening : t.placeholder}
               value={financeInput}
               onChange={(e) => setFinanceInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && processInput(financeInput)}
             />
             <motion.button 
               whileTap={{ scale: 0.95 }}
               className="btn-primary" 
               style={{ position: 'absolute', right: '8px', top: '8px', bottom: '8px', borderRadius: '1rem', padding: '0 1.5rem' }}
               onClick={() => processInput(financeInput)}
             >
               <Plus size={24} />
             </motion.button>
          </div>
          <button className={`mic-btn ${isListening ? 'listening' : ''}`} onClick={toggleListening}>
            <Mic size={28} />
          </button>
        </div>

        {/* Charts & Reports */}
        <AnimatePresence>
          {transactions.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
              
              {/* Chart Card */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <h4 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <BarChart3 size={20} color="var(--primary)" /> {t.chart_title}
                </h4>
                <div style={{ height: '300px', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }} />
                      <Legend verticalAlign="top" height={36}/>
                      <Bar name={t.inc} dataKey="in" fill="var(--secondary)" radius={[6, 6, 0, 0]} />
                      <Bar name={t.exp} dataKey="out" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grid for Tables (Record In & Record Out) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div className="glass-card">
                  <h4 style={{ marginBottom: '1rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingUp size={18} /> {t.table_in}</h4>
                  <table className="finance-table">
                    <thead><tr><th>{t.col_date}</th><th>{t.col_desc}</th><th>{t.col_amt}</th></tr></thead>
                    <tbody>
                      {transactions.filter(tx => tx.type === 'income').slice(0, 5).map(tx => (
                        <tr key={tx.id}><td>{tx.date}</td><td>{tx.description}</td><td className="amount-in">+{tx.amount.toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="glass-card">
                  <h4 style={{ marginBottom: '1rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TrendingDown size={18} /> {t.table_out}</h4>
                  <table className="finance-table">
                    <thead><tr><th>{t.col_date}</th><th>{t.col_desc}</th><th>{t.col_amt}</th></tr></thead>
                    <tbody>
                      {transactions.filter(tx => tx.type === 'expense').slice(0, 5).map(tx => (
                        <tr key={tx.id}><td>{tx.date}</td><td>{tx.description}</td><td className="amount-out">-{tx.amount.toLocaleString()}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* History Table (Summary) */}
              <div className="glass-card">
                <h4 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <History size={18} color="var(--primary)" /> {t.table_hist}
                </h4>
                <table className="finance-table">
                  <thead><tr><th>{t.col_date}</th><th>{t.inc}</th><th>{t.exp}</th><th>{t.col_rem}</th></tr></thead>
                  <tbody>
                    {historyData.slice().reverse().map((h, i) => (
                      <tr key={i}>
                        <td>{h.date}</td>
                        <td className="amount-in">{h.in > 0 ? `+${h.in.toLocaleString()}` : '-'}</td>
                        <td className="amount-out">{h.out > 0 ? `-${h.out.toLocaleString()}` : '-'}</td>
                        <td style={{ fontWeight: '700' }}>Rp{h.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Danger Zone */}
              <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                 <button 
                  onClick={() => confirm("Reset all data?") && setTransactions([])}
                  style={{ background: 'transparent', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--accent)', padding: '0.6rem 1.2rem', borderRadius: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
                 >
                   <Trash2 size={16} /> {t.btn_clear}
                 </button>
              </div>

            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
               <AlertCircle size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
               <p>{t.no_data}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer style={{ marginTop: '5rem', textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', borderTop: '1px solid var(--card-border)' }}>
        <p>&copy; 2026 MoneyFlow Agent • Your Personal Economy Intelligence</p>
      </footer>
    </div>
  );
};

export default App;
