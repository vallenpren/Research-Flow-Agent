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
  BarChart3,
  Download
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
    btn_export: "Export to Excel",
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
    placeholder: "Cth: 'Januari tanggal 3 pemasukan 20rb makan'...",
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
    col_date: "Tanggal",
    col_desc: "Keterangan",
    col_amt: "Jumlah",
    col_rem: "Sisa",
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
  const [financeInput, setFinanceInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('moneyflow_data');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('moneyflow_data', JSON.stringify(transactions));
  }, [transactions]);

  // --- IMPROVED NLP PARSING ---
  const processInput = (input: string) => {
    if (!input.trim()) return;

    const lower = input.toLowerCase();
    
    // 1. Extract Amount
    const amountMatch = input.match(/(\d+[\d,.]*)[\s.]*(rb|ribu|k|000|juta|jt|million|m)?/i);
    let amount = 0;
    if (amountMatch) {
      let rawNum = amountMatch[1].replace(/[,.]/g, '');
      amount = parseInt(rawNum);
      const suffix = (amountMatch[2] || '').toLowerCase();
      if (suffix.includes('rb') || suffix.includes('ribu') || suffix.includes('k')) amount *= 1000;
      if (suffix.includes('juta') || suffix.includes('jt') || suffix.includes('million') || suffix.includes('m')) amount *= 1000000;
    }

    // 2. Extract Date & Month
    let targetDate = new Date();
    const dayMatch = lower.match(/tanggal\s+(\d+)|date\s+(\d+)/i);
    const day = dayMatch ? parseInt(dayMatch[1] || dayMatch[2]) : targetDate.getDate();
    
    let monthFound = targetDate.getMonth();
    for (const m in monthsMap) {
      if (lower.includes(m)) {
        monthFound = monthsMap[m];
        break;
      }
    }
    targetDate.setMonth(monthFound);
    targetDate.setDate(day);

    // 3. Extract Type
    let type: 'income' | 'expense' = 'expense';
    const incWords = ['gaji', 'masuk', 'pemasukan', 'income', 'tambah', 'bonus', 'received', 'untung'];
    if (incWords.some(w => lower.includes(w))) type = 'income';

    // 4. Extract Description (Enhanced)
    let description = input
      .replace(/(\d+[\d,.]*)[\s.]*(rb|ribu|k|000|juta|jt|million|m)?/i, '') // Remove amount
      .replace(/tanggal\s+\d+|date\s+\d+|bulan|month/gi, '') // Remove date/month keywords
      .replace(new RegExp(Object.keys(monthsMap).join('|'), 'gi'), '') // Remove actual month names
      .replace(/pemasukan|pengeluaran|income|expense|masuk|keluar/gi, '') // Remove types
      .replace(/\s(dengan keterangan|dengan|keterangan|untuk|buat|for|about|rekap|catat)\s/gi, ' ') // Remove noise words
      .replace(/\s+/g, ' ') // Cleanup extra spaces
      .trim();

    if (!description || description.length < 2) {
      description = type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    }

    if (amount > 0) {
      const newTx: Transaction = {
        id: Date.now().toString(),
        date: targetDate.toISOString().split('T')[0],
        description,
        amount,
        type
      };
      setTransactions([newTx, ...transactions]);
      setFinanceInput('');
    } else {
      alert(lang === 'id' ? "Format tidak terbaca. Contoh: 'Gaji 5juta bulan Januari tanggal 2'" : "Format error. Example: 'Salary 5000 in January date 2'");
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
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

  // --- DATA EXPORT TO EXCEL (CSV) ---
  const exportToCSV = () => {
    const headers = ["Date", "Description", "Type", "Amount"];
    const rows = transactions.map(tx => [
      tx.date, 
      tx.description, 
      tx.type.toUpperCase(), 
      tx.amount
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MoneyFlow_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalIn = transactions.filter(tx => tx.type === 'income').reduce((s, tx) => s + tx.amount, 0);
  const totalOut = transactions.filter(tx => tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0);
  const balance = totalIn - totalOut;

  const groupedByDate = transactions.reduce((acc: any, tx) => {
    if (!acc[tx.date]) acc[tx.date] = { date: tx.date, in: 0, out: 0 };
    if (tx.type === 'income') acc[tx.date].in += tx.amount;
    else acc[tx.date].out += tx.amount;
    return acc;
  }, {});

  const sortedDates = Object.values(groupedByDate).sort((a: any, b: any) => a.date.localeCompare(b.date));
  let running = 0;
  const historyData = sortedDates.map((d: any) => {
    running += (d.in - d.out);
    return { ...d, balance: running };
  });

  return (
    <div className="container">
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="glass-card" style={{ padding: '0.6rem', borderRadius: '0.75rem', background: 'var(--primary-glow)' }}>
            <Wallet size={24} color="white" />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            <span style={{ color: '#ff4444', textShadow: '0 0 10px rgba(255, 68, 68, 0.3)' }}>{t.title}</span> 
            <span style={{ color: 'var(--primary)' }}> {t.agent}</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button 
            className="glass-card" 
            style={{ 
              padding: '0.6rem 1rem', 
              fontSize: '0.8rem', 
              fontWeight: 'bold', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              color: 'var(--secondary)', 
              border: '2px solid var(--secondary)',
              cursor: 'pointer',
              zIndex: 100
            }} 
            onClick={exportToCSV}
          >
            <Download size={18} /> {t.btn_export}
          </button>
          <button className="glass-card" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)', cursor: 'pointer' }} onClick={() => setLang(lang === 'id' ? 'en' : 'id')}>
             {lang.toUpperCase()}
          </button>
        </div>
      </nav>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>{t.tagline}</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
        <div className="glass-card">
          <TrendingUp color="var(--secondary)" size={20} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{t.inc}</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--secondary)' }}>Rp{totalIn.toLocaleString()}</h3>
        </div>
        <div className="glass-card">
          <TrendingDown color="var(--accent)" size={20} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{t.exp}</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent)' }}>Rp{totalOut.toLocaleString()}</h3>
        </div>
        <div className="glass-card" style={{ border: '1px solid var(--primary)' }}>
          <Wallet color="var(--primary)" size={20} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{t.bal}</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Rp{balance.toLocaleString()}</h3>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
        <div style={{ flex: 1, position: 'relative' }}>
           <input className="input-field" style={{ height: '4rem', paddingLeft: '1.25rem', fontSize: '1rem', borderRadius: '1.25rem' }} placeholder={isListening ? t.listening : t.placeholder} value={financeInput} onChange={(e) => setFinanceInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && processInput(financeInput)} />
           <button className="btn-primary" style={{ position: 'absolute', right: '8px', top: '8px', bottom: '8px', borderRadius: '1rem', padding: '0 1.5rem' }} onClick={() => processInput(financeInput)}>
             <Plus size={24} />
           </button>
        </div>
        <button className={`mic-btn ${isListening ? 'listening' : ''}`} onClick={toggleListening}>
          <Mic size={28} />
        </button>
      </div>

      <AnimatePresence>
        {transactions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card">
              <h4 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarChart3 size={18} /> {t.chart_title}</h4>
              <div style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={historyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '1rem' }} />
                    <Legend verticalAlign="top" height={36}/>
                    <Bar name={t.inc} dataKey="in" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                    <Bar name={t.exp} dataKey="out" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div className="glass-card">
                <h4 style={{ marginBottom: '1rem', color: 'var(--secondary)' }}>{t.table_in}</h4>
                <table className="finance-table">
                  <thead><tr><th>{t.col_date}</th><th>{t.col_desc}</th><th>{t.col_amt}</th></tr></thead>
                  <tbody>
                    {transactions.filter(tx => tx.type === 'income').slice(0, 10).map(tx => (
                      <tr key={tx.id}><td>{tx.date}</td><td>{tx.description}</td><td className="amount-in">+{tx.amount.toLocaleString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="glass-card">
                <h4 style={{ marginBottom: '1rem', color: 'var(--accent)' }}>{t.table_out}</h4>
                <table className="finance-table">
                  <thead><tr><th>{t.col_date}</th><th>{t.col_desc}</th><th>{t.col_amt}</th></tr></thead>
                  <tbody>
                    {transactions.filter(tx => tx.type === 'expense').slice(0, 10).map(tx => (
                      <tr key={tx.id}><td>{tx.date}</td><td>{tx.description}</td><td className="amount-out">-{tx.amount.toLocaleString()}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-card">
              <h4 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>{t.table_hist}</h4>
              <table className="finance-table">
                <thead><tr><th>{t.col_date}</th><th>{t.inc}</th><th>{t.exp}</th><th>{t.col_rem}</th></tr></thead>
                <tbody>
                  {historyData.slice().reverse().map((h, i) => (
                    <tr key={i}><td>{h.date}</td><td className="amount-in">{h.in > 0 ? `+${h.in.toLocaleString()}` : '-'}</td><td className="amount-out">{h.out > 0 ? `-${h.out.toLocaleString()}` : '-'}</td><td>Rp{h.balance.toLocaleString()}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ textAlign: 'center' }}>
               <button onClick={() => confirm("Hapus semua data?") && setTransactions([])} style={{ background: 'transparent', border: '1px solid rgba(244, 63, 94, 0.2)', color: 'var(--accent)', padding: '0.5rem 1rem', borderRadius: '0.5rem', cursor: 'pointer' }}>
                 <Trash2 size={16} /> {t.btn_clear}
               </button>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', opacity: 0.3 }}>{t.no_data}</div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
