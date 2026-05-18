import { createClient } from "@/lib/supabase/client";

export interface Transaction {
  id: string;
  user_id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description?: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  month: string;
  limit_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  type: "lent" | "borrowed";
  person_name: string;
  amount: number;
  description?: string;
  status: "pending" | "settled";
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

// ── Transaction Operations ────────────────────────────────────────────────

export async function getTransactions(month?: string): Promise<Transaction[]> {
  const supabase = createClient();
  
  let query = supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  if (month) {
    const [year, monthNum] = month.split("-");
    const startDate = `${year}-${monthNum}-01`;
    const endDate = `${year}-${monthNum}-31`;
    query = query.gte("date", startDate).lte("date", endDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addTransaction(tx: Omit<Transaction, "id" | "user_id" | "created_at" | "updated_at">): Promise<Transaction> {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getSession();
  const userId = authData.session?.user?.id;

  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("transactions")
    .insert([
      {
        user_id: userId,
        type: tx.type,
        category: tx.category,
        amount: tx.amount,
        description: tx.description,
        date: tx.date,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ── Budget Operations ─────────────────────────────────────────────────────

export async function getBudgets(): Promise<Budget[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .order("month", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getBudgetForMonth(month: string): Promise<Budget | null> {
  const supabase = createClient();
  const [year, monthNum] = month.split("-");
  const monthDate = `${year}-${monthNum}-01`;

  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("month", monthDate)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function upsertBudget(month: string, limit_amount: number): Promise<Budget> {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getSession();
  const userId = authData.session?.user?.id;

  if (!userId) throw new Error("Not authenticated");

  const [year, monthNum] = month.split("-");
  const monthDate = `${year}-${monthNum}-01`;

  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      [
        {
          user_id: userId,
          month: monthDate,
          limit_amount,
        },
      ],
      { onConflict: "user_id,month" }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteBudget(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ── Debt Operations ───────────────────────────────────────────────────────

export async function getDebts(status?: "pending" | "settled"): Promise<Debt[]> {
  const supabase = createClient();
  let query = supabase.from("debts").select("*");

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addDebt(debt: Omit<Debt, "id" | "user_id" | "created_at" | "updated_at">): Promise<Debt> {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getSession();
  const userId = authData.session?.user?.id;

  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("debts")
    .insert([
      {
        user_id: userId,
        type: debt.type,
        person_name: debt.person_name,
        amount: debt.amount,
        description: debt.description,
        status: debt.status || "pending",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDebt(id: string, updates: Partial<Debt>): Promise<Debt> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("debts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteDebt(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("debts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ── Savings Goals Operations ───────────────────────────────────────────────

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .order("deadline", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

export async function addSavingsGoal(goal: Omit<SavingsGoal, "id" | "user_id" | "created_at" | "updated_at">): Promise<SavingsGoal> {
  const supabase = createClient();
  const { data: authData } = await supabase.auth.getSession();
  const userId = authData.session?.user?.id;

  if (!userId) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("savings_goals")
    .insert([
      {
        user_id: userId,
        name: goal.name,
        target_amount: goal.target_amount,
        current_amount: goal.current_amount || 0,
        deadline: goal.deadline,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSavingsGoal(id: string, updates: Partial<SavingsGoal>): Promise<SavingsGoal> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("savings_goals")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ── Analytics ─────────────────────────────────────────────────────────────

export async function getFinanceSummary(month: string) {
  const [year, monthNum] = month.split("-");
  const startDate = `${year}-${monthNum}-01`;
  const endDate = `${year}-${monthNum}-31`;

  const supabase = createClient();

  const [transactions, budget, debts, goals] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("budgets")
      .select("*")
      .eq("month", `${year}-${monthNum}-01`)
      .single(),
    supabase.from("debts").select("*"),
    supabase.from("savings_goals").select("*"),
  ]);

  const txData = transactions.data || [];
  const budgetData = budget.data;
  const debtsData = debts.data || [];
  const goalsData = goals.data || [];

  const totalIncome = txData
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amount, 0);

  const totalExpense = txData
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amount, 0);

  return {
    month,
    income: totalIncome,
    expense: totalExpense,
    balance: totalIncome - totalExpense,
    budget: budgetData?.limit_amount || 0,
    budgetUsed: totalExpense,
    budgetRemaining: (budgetData?.limit_amount || 0) - totalExpense,
    transactions: txData,
    debts: debtsData,
    goals: goalsData,
  };
}

export async function getExpensesByCategory(month: string) {
  const [year, monthNum] = month.split("-");
  const startDate = `${year}-${monthNum}-01`;
  const endDate = `${year}-${monthNum}-31`;

  const supabase = createClient();

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("type", "expense")
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) throw error;

  const categoryMap: Record<string, number> = {};
  (transactions || []).forEach((tx) => {
    categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
  });

  const totalExpense = (transactions || []).reduce((sum, tx) => sum + tx.amount, 0);

  return Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}
