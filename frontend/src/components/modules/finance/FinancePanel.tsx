"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/layout/language-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type TxType = "income" | "expense";

interface Transaction {
  id: string;
  type: TxType;
  category: string;
  amount: number;
  note: string;
  date: string;
}

interface Budget {
  month: string;
  amount: number;
}

interface Debt {
  id: string;
  type: "lent" | "borrowed";
  person_name: string;
  amount: number;
  description?: string;
  status: "pending" | "settled";
  created_at?: string;
}

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  created_at?: string;
}

// ─── i18n ─────────────────────────────────────────────────────────────────────

const T = {
  en: {
    title: "Student Finance Tracker",
    subtitle: "Track your income & expenses in BDT",
    budget: "Monthly Budget",
    setBudget: "Set Budget",
    income: "Total Income",
    expenses: "Total Expenses",
    balance: "Balance",
    adherence: "Budget Used",
    debtsTitle: "Debts & Loans",
    addDebt: "Add Debt / Loan",
    lend: "Lent",
    borrow: "Borrowed",
    person: "Person",
    settle: "Settle",
    settleAction: "Mark settled",
    savingsTitle: "Savings Goals",
    addGoal: "Add Goal",
    target: "Target",
    progress: "Progress",
    contribute: "Contribute",
    addTx: "Add Transaction",
    type: "Type",
    category: "Category",
    amount: "Amount (BDT)",
    note: "Note (optional)",
    date: "Date",
    add: "Add",
    cancel: "Cancel",
    noTx: "No transactions yet. Add one above!",
    overspend: "⚠️ You've exceeded your monthly budget!",
    nearLimit: "⚠️ You're near your budget limit (80%+).",
    categories: {
      income: ["Allowance", "Part-time Job", "Scholarship", "Gift", "Other Income"],
      expense: ["Food", "Transport", "Books", "Tuition", "Rent", "Entertainment", "Health", "Clothing", "Other"],
    },
    months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    history: "Transaction History",
    filter: "Filter",
    all: "All",
    budgetPlaceholder: "Enter monthly budget",
    save: "Save",
  },
  bn: {
    title: "শিক্ষার্থী অর্থ ট্র্যাকার",
    subtitle: "আপনার আয় ও ব্যয় ট্র্যাক করুন (টাকায়)",
    budget: "মাসিক বাজেট",
    setBudget: "বাজেট নির্ধারণ করুন",
    income: "মোট আয়",
    expenses: "মোট ব্যয়",
    balance: "ব্যালেন্স",
    adherence: "বাজেট ব্যবহার",
    addTx: "লেনদেন যোগ করুন",
    type: "ধরন",
    category: "বিভাগ",
    amount: "পরিমাণ (টাকা)",
    note: "নোট (ঐচ্ছিক)",
    date: "তারিখ",
    add: "যোগ করুন",
    cancel: "বাতিল",
    noTx: "এখনো কোনো লেনদেন নেই। উপরে যোগ করুন!",
    overspend: "⚠️ আপনি মাসিক বাজেট অতিক্রম করেছেন!",
    nearLimit: "⚠️ আপনি বাজেটের সীমার কাছাকাছি (৮০%+)।",
    categories: {
      income: ["হাত খরচ", "পার্ট-টাইম চাকরি", "বৃত্তি", "উপহার", "অন্যান্য আয়"],
      expense: ["খাবার", "যাতায়াত", "বই", "টিউশন ফি", "বাড়িভাড়া", "বিনোদন", "স্বাস্থ্য", "পোশাক", "অন্যান্য"],
    },
    months: ["জানু","ফেব্রু","মার্চ","এপ্রিল","মে","জুন","জুলাই","আগস্ট","সেপ্টে","অক্টো","নভে","ডিসে"],
    history: "লেনদেনের ইতিহাস",
    filter: "ফিল্টার",
    all: "সব",
    budgetPlaceholder: "মাসিক বাজেট লিখুন",
    save: "সংরক্ষণ করুন",
    debtsTitle: "ঋণ ও ধার",
    addDebt: "ঋণ/ধার যোগ করুন",
    lend: "ঋণ দিয়েছি",
    borrow: "ঋণ নিয়েছি",
    person: "ব্যক্তি",
    settle: "পরিশোধ",
    settleAction: "পরিশোধ হিসাবে চিহ্নিত করুন",
    savingsTitle: "সঞ্চয় লক্ষ্য",
    addGoal: "লক্ষণ যোগ করুন",
    target: "লক্ষ্য",
    progress: "অগ্রগতি",
    contribute: "অবদান"
  },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  "৳" + n.toLocaleString("en-BD", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const toMonthKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const LOCAL_TX_KEY = "finance_transactions_local";
const LOCAL_BG_KEY = "finance_budgets_local";
const LOCAL_DEBTS_KEY = "finance_debts_local";
const LOCAL_GOALS_KEY = "finance_goals_local";

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// ─── Category badge colours ───────────────────────────────────────────────────

const CAT_COLORS: Record<string, string> = {
  Food: "#fbbf24", খাবার: "#fbbf24",
  Transport: "#34d399", যাতায়াত: "#34d399",
  Books: "#8b5cf6", বই: "#8b5cf6",
  Tuition: "#f472b6", "টিউশন ফি": "#f472b6",
  Rent: "#fb923c", বাড়িভাড়া: "#fb923c",
  Entertainment: "#60a5fa", বিনোদন: "#60a5fa",
  Health: "#4ade80", স্বাস্থ্য: "#4ade80",
  Clothing: "#e879f9", পোশাক: "#e879f9",
  Allowance: "#fbbf24", "হাত খরচ": "#fbbf24",
  Scholarship: "#34d399", বৃত্তি: "#34d399",
};

const catColor = (cat: string) => CAT_COLORS[cat] ?? "#94a3b8";

// ─── Component ────────────────────────────────────────────────────────────────

export function FinancePanel() {
  const { lang } = useLanguage();
  const t = T[lang];

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(toMonthKey(now));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Record<string, number>>({});
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showDebtForm, setShowDebtForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [filterType, setFilterType] = useState<"all" | TxType>("all");
  const [userId, setUserId] = useState<string | null>(null);

  // form state
  const [fType, setFType] = useState<TxType>("expense");
  const [fCategory, setFCategory] = useState("");
  const [fAmount, setFAmount] = useState("");
  const [fNote, setFNote] = useState("");
  const [fDate, setFDate] = useState(now.toISOString().slice(0, 10));
  const [budgetInput, setBudgetInput] = useState("");
  // debt form
  const [dType, setDType] = useState<"lent" | "borrowed">("borrowed");
  const [dPerson, setDPerson] = useState("");
  const [dAmount, setDAmount] = useState("");
  const [dDesc, setDDesc] = useState("");
  // goal form
  const [gName, setGName] = useState("");
  const [gTarget, setGTarget] = useState("");
  const [gCurrent, setGCurrent] = useState("");
  const [gDeadline, setGDeadline] = useState("");

  // ── Load user & data ──────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);

      if (uid) {
        try {
          // load from supabase
          const [
            { data: txData, error: txError },
            { data: bgData, error: bgError },
            { data: debtsData, error: debtsError },
            { data: goalsData, error: goalsError },
          ] = await Promise.all([
            supabase.from("transactions").select("*").eq("user_id", uid).order("date", { ascending: false }),
            supabase.from("budgets").select("*").eq("user_id", uid),
            supabase.from("debts").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
            supabase.from("savings_goals").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
          ]);
          
          if (txError) {
            console.warn("Failed to load transactions from Supabase:", txError);
            setTransactions(loadLocal<Transaction[]>(LOCAL_TX_KEY, []));
          } else if (txData) {
            setTransactions(txData as Transaction[]);
            saveLocal(LOCAL_TX_KEY, txData);
          }
          
          if (bgError) {
            console.warn("Failed to load budgets from Supabase:", bgError);
            setBudgets(loadLocal<Record<string, number>>(LOCAL_BG_KEY, {}));
          } else if (bgData) {
            const map: Record<string, number> = {};
            (bgData as Array<{ month: string; limit_amount: number }>).forEach((b) => { map[b.month.slice(0, 7)] = b.limit_amount; });
            setBudgets(map);
            saveLocal(LOCAL_BG_KEY, map);
          }
          
          if (debtsError) {
            console.warn("Failed to load debts from Supabase:", debtsError);
            setDebts(loadLocal<Debt[]>(LOCAL_DEBTS_KEY, []));
          } else if (debtsData) {
            setDebts(debtsData as Debt[]);
            saveLocal(LOCAL_DEBTS_KEY, debtsData);
          }

          if (goalsError) {
            console.warn("Failed to load savings goals from Supabase:", goalsError);
            setGoals(loadLocal<SavingsGoal[]>(LOCAL_GOALS_KEY, []));
          } else if (goalsData) {
            setGoals(goalsData as SavingsGoal[]);
            saveLocal(LOCAL_GOALS_KEY, goalsData);
          }
        } catch (err) {
          console.warn("Error loading from Supabase, using localStorage fallback:", err);
          setTransactions(loadLocal<Transaction[]>(LOCAL_TX_KEY, []));
          setBudgets(loadLocal<Record<string, number>>(LOCAL_BG_KEY, {}));
        }
      } else {
        // fallback to localStorage
        setTransactions(loadLocal<Transaction[]>(LOCAL_TX_KEY, []));
        setBudgets(loadLocal<Record<string, number>>(LOCAL_BG_KEY, {}));
      }
    };
    void init();
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────

  const monthTx = useMemo(
    () => transactions.filter((tx) => tx.date.startsWith(currentMonth)),
    [transactions, currentMonth],
  );

  const totalIncome = useMemo(
    () => monthTx.filter((tx) => tx.type === "income").reduce((s, tx) => s + tx.amount, 0),
    [monthTx],
  );

  const totalExpenses = useMemo(
    () => monthTx.filter((tx) => tx.type === "expense").reduce((s, tx) => s + tx.amount, 0),
    [monthTx],
  );

  const balance = totalIncome - totalExpenses;
  const budget = budgets[currentMonth] ?? 0;
  const adherencePct = budget > 0 ? Math.min(100, Math.round((totalExpenses / budget) * 100)) : 0;

  const filteredTx = useMemo(
    () => (filterType === "all" ? monthTx : monthTx.filter((tx) => tx.type === filterType)),
    [monthTx, filterType],
  );

  // ── Category breakdown ────────────────────────────────────────────────────

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    monthTx.filter((tx) => tx.type === "expense").forEach((tx) => {
      map[tx.category] = (map[tx.category] ?? 0) + tx.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthTx]);

  // ── Month navigation ──────────────────────────────────────────────────────

  const changeMonth = (dir: -1 | 1) => {
    const [y, m] = currentMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCurrentMonth(toMonthKey(d));
  };

  const monthLabel = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    return `${t.months[m - 1]} ${y}`;
  };

  // ── Add transaction ───────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!fCategory || !fAmount || Number(fAmount) <= 0) return;
    const tx: Transaction = {
      id: crypto.randomUUID(),
      type: fType,
      category: fCategory,
      amount: Number(fAmount),
      note: fNote.trim(),
      date: fDate,
    };

    const next = [tx, ...transactions];
    setTransactions(next);
    saveLocal(LOCAL_TX_KEY, next);
    setShowForm(false);
    setFAmount(""); setFNote(""); setFCategory("");

    if (userId) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("transactions").insert({ 
          id: tx.id,
          user_id: userId, 
          type: tx.type,
          category: tx.category,
          amount: tx.amount,
          description: tx.note,
          date: tx.date,
        });
        if (error) {
          console.error("Failed to save transaction to Supabase:", error);
        }
      } catch (err) {
        console.error("Error saving transaction:", err);
      }
    }
  };

  // ── Delete transaction ────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    const next = transactions.filter((tx) => tx.id !== id);
    setTransactions(next);
    saveLocal(LOCAL_TX_KEY, next);
    if (userId) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("transactions").delete().eq("id", id);
        if (error) {
          console.error("Failed to delete transaction from Supabase:", error);
        }
      } catch (err) {
        console.error("Error deleting transaction:", err);
      }
    }
  };

  // ── Save budget ───────────────────────────────────────────────────────────

  const handleSaveBudget = async () => {
    const val = Number(budgetInput);
    if (!val || val <= 0) return;
    const next = { ...budgets, [currentMonth]: val };
    setBudgets(next);
    saveLocal(LOCAL_BG_KEY, next);
    setShowBudgetForm(false);
    setBudgetInput("");
    if (userId) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("budgets").upsert({ 
          user_id: userId, 
          month: `${currentMonth}-01`, 
          limit_amount: val 
        }, { 
          onConflict: "user_id,month" 
        });
        if (error) {
          console.error("Failed to save budget to Supabase:", error);
        }
      } catch (err) {
        console.error("Error saving budget:", err);
      }
    }
  };

  // ── Debts & Savings Handlers ─────────────────────────────────────────────

  const handleAddDebt = async () => {
    if (!dPerson || !dAmount || Number(dAmount) <= 0) return;
    const debt: Debt = {
      id: crypto.randomUUID(),
      type: dType,
      person_name: dPerson,
      amount: Number(dAmount),
      description: dDesc.trim(),
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const next = [debt, ...debts];
    setDebts(next);
    saveLocal(LOCAL_DEBTS_KEY, next);
    setShowDebtForm(false);
    setDPerson(""); setDAmount(""); setDDesc(""); setDType("borrowed");

    if (userId) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("debts").insert({
          id: debt.id,
          user_id: userId,
          type: debt.type,
          person_name: debt.person_name,
          amount: debt.amount,
          description: debt.description,
          status: debt.status,
        });
        if (error) console.error("Failed to save debt to Supabase:", error);
      } catch (err) {
        console.error("Error saving debt:", err);
      }
    }
  };

  const handleSettleDebt = async (id: string) => {
    const next = debts.map((d) => (d.id === id ? { ...d, status: "settled" as const } : d));
    setDebts(next);
    saveLocal(LOCAL_DEBTS_KEY, next);
    if (userId) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("debts").update({ status: "settled" }).eq("id", id);
        if (error) console.error("Failed to update debt on Supabase:", error);
      } catch (err) {
        console.error("Error updating debt:", err);
      }
    }
  };

  const handleDeleteDebt = async (id: string) => {
    const next = debts.filter((d) => d.id !== id);
    setDebts(next);
    saveLocal(LOCAL_DEBTS_KEY, next);
    if (userId) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("debts").delete().eq("id", id);
        if (error) console.error("Failed to delete debt from Supabase:", error);
      } catch (err) {
        console.error("Error deleting debt:", err);
      }
    }
  };

  const handleAddGoal = async () => {
    if (!gName || !gTarget || Number(gTarget) <= 0) return;
    const goal: SavingsGoal = {
      id: crypto.randomUUID(),
      name: gName,
      target_amount: Number(gTarget),
      current_amount: Number(gCurrent) || 0,
      deadline: gDeadline || undefined,
      created_at: new Date().toISOString(),
    };

    const next = [goal, ...goals];
    setGoals(next);
    saveLocal(LOCAL_GOALS_KEY, next);
    setShowGoalForm(false);
    setGName(""); setGTarget(""); setGCurrent(""); setGDeadline("");

    if (userId) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("savings_goals").insert({
          id: goal.id,
          user_id: userId,
          name: goal.name,
          target_amount: goal.target_amount,
          current_amount: goal.current_amount,
          deadline: goal.deadline,
        });
        if (error) console.error("Failed to save goal to Supabase:", error);
      } catch (err) {
        console.error("Error saving goal:", err);
      }
    }
  };

  const handleContributeGoal = async (id: string, amount: number) => {
    if (amount <= 0) return;
    const next = goals.map((g) => (g.id === id ? { ...g, current_amount: (g.current_amount || 0) + amount } : g));
    setGoals(next);
    saveLocal(LOCAL_GOALS_KEY, next);
    if (userId) {
      try {
        const supabase = createClient();
        const target = next.find((g) => g.id === id)?.current_amount || 0;
        const { error } = await supabase.from("savings_goals").update({ current_amount: target }).eq("id", id);
        if (error) console.error("Failed to update goal on Supabase:", error);
      } catch (err) {
        console.error("Error updating goal:", err);
      }
    }
  };

  const handleDeleteGoal = async (id: string) => {
    const next = goals.filter((g) => g.id !== id);
    setGoals(next);
    saveLocal(LOCAL_GOALS_KEY, next);
    if (userId) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from("savings_goals").delete().eq("id", id);
        if (error) console.error("Failed to delete goal from Supabase:", error);
      } catch (err) {
        console.error("Error deleting goal:", err);
      }
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Month Navigator */}
      <div className="flex items-center justify-between rounded-[24px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[6px_6px_0_0_#1E293B]">
        <button onClick={() => changeMonth(-1)} className="nav-pill grid h-10 w-10 place-items-center rounded-full">
          <ChevronLeft size={18} />
        </button>
        <p className="font-display text-xl font-black">{monthLabel()}</p>
        <button onClick={() => changeMonth(1)} className="nav-pill grid h-10 w-10 place-items-center rounded-full">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: t.income, value: fmt(totalIncome), icon: TrendingUp, color: "#34d399" },
          { label: t.expenses, value: fmt(totalExpenses), icon: TrendingDown, color: "#f472b6" },
          { label: t.balance, value: fmt(balance), icon: Wallet, color: balance >= 0 ? "#8b5cf6" : "#ef4444" },
          { label: t.budget, value: budget > 0 ? fmt(budget) : "—", icon: Target, color: "#fbbf24" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-4 shadow-[6px_6px_0_0_#1E293B]">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--foreground)]" style={{ background: color }}>
              <Icon size={18} color="#fff" strokeWidth={2.5} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted-fg)]">{label}</p>
            <p className="mt-1 font-display text-xl font-black">{value}</p>
          </div>
        ))}
      </div>

      {/* Budget Progress */}
      {budget > 0 && (
        <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[6px_6px_0_0_#1E293B]">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-black">{t.adherence}</p>
            <p className="text-sm font-black">{adherencePct}%</p>
          </div>
          <div className="h-4 overflow-hidden rounded-full border-2 border-[var(--foreground)] bg-[var(--muted)]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${adherencePct}%`,
                background: adherencePct >= 100 ? "#ef4444" : adherencePct >= 80 ? "#f97316" : "#34d399",
              }}
            />
          </div>
          {adherencePct >= 100 && (
            <p className="mt-2 text-xs font-bold text-red-500">{t.overspend}</p>
          )}
          {adherencePct >= 80 && adherencePct < 100 && (
            <p className="mt-2 text-xs font-bold text-orange-500">{t.nearLimit}</p>
          )}
        </div>
      )}

      {/* Category Breakdown */}
      {expenseByCategory.length > 0 && (
        <div className="rounded-[20px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[6px_6px_0_0_#1E293B]">
          <p className="mb-4 text-sm font-black uppercase tracking-wide">{lang === "bn" ? "বিভাগ অনুযায়ী ব্যয়" : "Expenses by Category"}</p>
          <div className="space-y-3">
            {expenseByCategory.map(([cat, amt]) => {
              const pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0;
              return (
                <div key={cat}>
                  <div className="mb-1 flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full border border-[var(--foreground)]" style={{ background: catColor(cat) }} />
                      {cat}
                    </span>
                    <span>{fmt(amt)} · {pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--muted)]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: catColor(cat) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => { setShowForm((v) => !v); setShowBudgetForm(false); }}
          className="candy-button flex items-center gap-2 rounded-[18px] px-5 py-3 text-sm font-black"
        >
          <Plus size={16} strokeWidth={3} />
          {t.addTx}
        </button>
        <button
          onClick={() => { setShowBudgetForm((v) => !v); setShowForm(false); setBudgetInput(String(budget || "")); }}
          className="secondary-button flex items-center gap-2 rounded-[18px] border-2 border-[var(--foreground)] px-5 py-3 text-sm font-black"
        >
          <Target size={16} strokeWidth={2.5} />
          {t.setBudget}
        </button>
        <button
          onClick={() => { setShowDebtForm((v) => !v); setShowForm(false); setShowGoalForm(false); }}
          className="secondary-button flex items-center gap-2 rounded-[18px] border-2 border-[var(--foreground)] px-5 py-3 text-sm font-black"
        >
          <Wallet size={16} strokeWidth={2.5} />
          {t.addDebt}
        </button>
        <button
          onClick={() => { setShowGoalForm((v) => !v); setShowForm(false); setShowDebtForm(false); }}
          className="secondary-button flex items-center gap-2 rounded-[18px] border-2 border-[var(--foreground)] px-5 py-3 text-sm font-black"
        >
          <Plus size={16} strokeWidth={2.5} />
          {t.addGoal}
        </button>
      </div>

      {/* Add Transaction Form */}
      {showForm && (
        <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[8px_8px_0_0_#1E293B]">
          <p className="mb-4 font-display text-lg font-black">{t.addTx}</p>

          {/* Type toggle */}
          <div className="mb-4 flex gap-2">
            {(["expense", "income"] as TxType[]).map((tp) => (
              <button
                key={tp}
                onClick={() => { setFType(tp); setFCategory(""); }}
                className={`nav-pill flex-1 rounded-[14px] py-2 text-sm font-black capitalize ${fType === tp ? "bg-[var(--foreground)] text-white" : "bg-white"}`}
              >
                {tp === "expense" ? (lang === "bn" ? "ব্যয়" : "Expense") : (lang === "bn" ? "আয়" : "Income")}
              </button>
            ))}
          </div>

          {/* Category */}
          <div className="mb-3">
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{t.category}</label>
            <div className="flex flex-wrap gap-2">
              {t.categories[fType].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFCategory(cat)}
                  className={`hard-chip rounded-full border-2 border-[var(--foreground)] px-3 py-1 text-xs font-bold transition ${fCategory === cat ? "bg-[var(--foreground)] text-white" : "bg-white"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Amount + Date */}
          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{t.amount}</label>
              <input
                type="number"
                min="1"
                value={fAmount}
                onChange={(e) => setFAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{t.date}</label>
              <input
                type="date"
                value={fDate}
                onChange={(e) => setFDate(e.target.value)}
                className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white"
              />
            </div>
          </div>

          {/* Note */}
          <div className="mb-4">
            <label className="mb-1 block text-xs font-black uppercase tracking-wide text-[var(--muted-fg)]">{t.note}</label>
            <input
              type="text"
              value={fNote}
              onChange={(e) => setFNote(e.target.value)}
              placeholder={lang === "bn" ? "ছোট নোট লিখুন..." : "Short note..."}
              className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={handleAdd} className="candy-button flex-1 rounded-[18px] py-3 text-sm font-black">{t.add}</button>
            <button onClick={() => setShowForm(false)} className="secondary-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] py-3 text-sm font-black">{t.cancel}</button>
          </div>
        </div>
      )}

      {/* Add Debt Form */}
      {showDebtForm && (
        <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[8px_8px_0_0_#1E293B]">
          <p className="mb-4 font-display text-lg font-black">{t.addDebt}</p>
          <div className="mb-3">
            <div className="mb-2 flex gap-2">
              <button onClick={() => setDType("borrowed")} className={`nav-pill flex-1 rounded-[14px] py-2 text-sm font-black ${dType === "borrowed" ? "bg-[var(--foreground)] text-white" : "bg-white"}`}>{t.borrow}</button>
              <button onClick={() => setDType("lent")} className={`nav-pill flex-1 rounded-[14px] py-2 text-sm font-black ${dType === "lent" ? "bg-[var(--foreground)] text-white" : "bg-white"}`}>{t.lend}</button>
            </div>
            <input value={dPerson} onChange={(e) => setDPerson(e.target.value)} placeholder={t.person} className="mb-2 w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none" />
            <input value={dAmount} onChange={(e) => setDAmount(e.target.value)} type="number" placeholder="0" className="mb-2 w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none" />
            <input value={dDesc} onChange={(e) => setDDesc(e.target.value)} placeholder={lang === "bn" ? "বর্ণনা (ঐচ্ছিক)" : "Description (optional)"} className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleAddDebt} className="candy-button flex-1 rounded-[18px] py-3 text-sm font-black">{t.add}</button>
            <button onClick={() => setShowDebtForm(false)} className="secondary-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] py-3 text-sm font-black">{t.cancel}</button>
          </div>
        </div>
      )}

      {/* Add Goal Form */}
      {showGoalForm && (
        <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[8px_8px_0_0_#1E293B]">
          <p className="mb-4 font-display text-lg font-black">{t.addGoal}</p>
          <div className="mb-3">
            <input value={gName} onChange={(e) => setGName(e.target.value)} placeholder={lang === "bn" ? "লক্ষ্য নাম" : "Goal name"} className="mb-2 w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none" />
            <div className="grid grid-cols-2 gap-2">
              <input value={gTarget} onChange={(e) => setGTarget(e.target.value)} type="number" placeholder={t.target} className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none" />
              <input value={gCurrent} onChange={(e) => setGCurrent(e.target.value)} type="number" placeholder={t.progress} className="w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none" />
            </div>
            <input value={gDeadline} onChange={(e) => setGDeadline(e.target.value)} type="date" className="mt-2 w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={handleAddGoal} className="candy-button flex-1 rounded-[18px] py-3 text-sm font-black">{t.save}</button>
            <button onClick={() => setShowGoalForm(false)} className="secondary-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] py-3 text-sm font-black">{t.cancel}</button>
          </div>
        </div>
      )}

      {/* Set Budget Form */}
      {showBudgetForm && (
        <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[8px_8px_0_0_#1E293B]">
          <p className="mb-4 font-display text-lg font-black">{t.setBudget} — {monthLabel()}</p>
          <input
            type="number"
            min="1"
            value={budgetInput}
            onChange={(e) => setBudgetInput(e.target.value)}
            placeholder={t.budgetPlaceholder}
            className="mb-4 w-full rounded-[14px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-3 py-2 text-sm font-bold outline-none focus:bg-white"
          />
          <div className="flex gap-3">
            <button onClick={handleSaveBudget} className="candy-button flex-1 rounded-[18px] py-3 text-sm font-black">{t.save}</button>
            <button onClick={() => setShowBudgetForm(false)} className="secondary-button flex-1 rounded-[18px] border-2 border-[var(--foreground)] py-3 text-sm font-black">{t.cancel}</button>
          </div>
        </div>
      )}

      {/* Debts / Loans */}
      <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[8px_8px_0_0_#1E293B]">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-lg font-black">{t.debtsTitle}</p>
        </div>

        {debts.length === 0 ? (
          <p className="py-8 text-center text-sm font-bold text-[var(--muted-fg)]">{lang === "bn" ? "কোনো ঋণ/ধার নেই" : "No debts or loans"}</p>
        ) : (
          <div className="space-y-3">
            {debts.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 rounded-[16px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-4 py-3 shadow-[4px_4px_0_0_#1E293B]">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-black">{d.person_name} · {d.type}</p>
                    <p className="text-xs text-[var(--muted-fg)]">{d.description || d.created_at?.slice(0,10)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-display text-base font-black ${d.type === "lent" ? "text-[#34d399]" : "text-[#f472b6]"}`}>{d.type === "lent" ? "+" : "-"}{fmt(d.amount)}</p>
                  {d.status !== "settled" ? (
                    <button onClick={() => handleSettleDebt(d.id)} className="rounded-full border-2 border-[var(--foreground)] bg-white px-3 py-1 text-xs font-bold">{t.settleAction}</button>
                  ) : <span className="text-xs font-bold text-[var(--muted-fg)]">{lang === "bn" ? "পরিশোধ হয়েছে" : "Settled"}</span>}
                  <button onClick={() => handleDeleteDebt(d.id)} className="grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white text-red-400 hover:bg-red-50"><Trash2 size={13} strokeWidth={2.5} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Savings Goals */}
      <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[8px_8px_0_0_#1E293B]">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display text-lg font-black">{t.savingsTitle}</p>
        </div>

        {goals.length === 0 ? (
          <p className="py-8 text-center text-sm font-bold text-[var(--muted-fg)]">{lang === "bn" ? "কোনো সঞ্চয় লক্ষ্য নেই" : "No savings goals"}</p>
        ) : (
          <div className="space-y-3">
            {goals.map((g) => {
              const pct = g.target_amount > 0 ? Math.round((g.current_amount / g.target_amount) * 100) : 0;
              return (
                <div key={g.id} className="rounded-[16px] border-2 border-[var(--foreground)] bg-[var(--muted)] p-4 shadow-[4px_4px_0_0_#1E293B]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black">{g.name}</p>
                      <p className="text-xs text-[var(--muted-fg)]">{fmt(g.current_amount)} / {fmt(g.target_amount)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-24 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#34d399" }} />
                      </div>
                      <button onClick={() => { const amt = Number(prompt(lang === "bn" ? "কত টাকা যোগ করবেন?" : "Amount to contribute?", "0") || "0"); if (amt > 0) handleContributeGoal(g.id, amt); }} className="rounded-full border-2 border-[var(--foreground)] bg-white px-3 py-1 text-xs font-bold">{t.contribute}</button>
                      <button onClick={() => handleDeleteGoal(g.id)} className="grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white text-red-400 hover:bg-red-50"><Trash2 size={13} strokeWidth={2.5} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="rounded-[24px] border-2 border-[var(--foreground)] bg-white p-5 shadow-[8px_8px_0_0_#1E293B]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-lg font-black">{t.history}</p>
          <div className="flex gap-2">
            {(["all", "income", "expense"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`hard-chip rounded-full border-2 border-[var(--foreground)] px-3 py-1 text-xs font-black ${filterType === f ? "bg-[var(--foreground)] text-white" : "bg-white"}`}
              >
                {f === "all" ? t.all : f === "income" ? (lang === "bn" ? "আয়" : "Income") : (lang === "bn" ? "ব্যয়" : "Expense")}
              </button>
            ))}
          </div>
        </div>

        {filteredTx.length === 0 ? (
          <p className="py-8 text-center text-sm font-bold text-[var(--muted-fg)]">{t.noTx}</p>
        ) : (
          <div className="space-y-3">
            {filteredTx.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 rounded-[16px] border-2 border-[var(--foreground)] bg-[var(--muted)] px-4 py-3 shadow-[4px_4px_0_0_#1E293B]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[var(--foreground)] text-white"
                    style={{ background: catColor(tx.category) }}
                  >
                    {tx.type === "income" ? <TrendingUp size={14} strokeWidth={3} /> : <TrendingDown size={14} strokeWidth={3} />}
                  </span>
                  <div>
                    <p className="text-sm font-black">{tx.category}</p>
                    <p className="text-xs text-[var(--muted-fg)]">{tx.note || tx.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className={`font-display text-base font-black ${tx.type === "income" ? "text-[#34d399]" : "text-[#f472b6]"}`}>
                    {tx.type === "income" ? "+" : "-"}{fmt(tx.amount)}
                  </p>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="grid h-8 w-8 place-items-center rounded-full border-2 border-[var(--foreground)] bg-white text-red-400 hover:bg-red-50"
                  >
                    <Trash2 size={13} strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
