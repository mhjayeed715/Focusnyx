import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── Transaction Operations ────────────────────────────────────────────────────

export interface Transaction {
  id?: string;
  user_id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description?: string;
  date: string;
}

export async function getTransactions(userId: string, month?: string) {
  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
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

export async function addTransaction(transaction: Transaction) {
  const { data, error } = await supabase
    .from("transactions")
    .insert([transaction])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function updateTransaction(
  transactionId: string,
  updates: Partial<Transaction>
) {
  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", transactionId)
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function deleteTransaction(transactionId: string) {
  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", transactionId);

  if (error) throw error;
  return true;
}

// ── Budget Operations ─────────────────────────────────────────────────────────

export interface Budget {
  id?: string;
  user_id: string;
  month: string;
  limit_amount: number;
}

export async function getBudgets(userId: string) {
  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .order("month", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getBudgetForMonth(userId: string, month: string) {
  const [year, monthNum] = month.split("-");
  const monthDate = `${year}-${monthNum}-01`;

  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", userId)
    .eq("month", monthDate)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function upsertBudget(budget: Budget) {
  const { data, error } = await supabase
    .from("budgets")
    .upsert([budget], { onConflict: "user_id,month" })
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function deleteBudget(budgetId: string) {
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", budgetId);

  if (error) throw error;
  return true;
}

// ── Debt Operations ───────────────────────────────────────────────────────────

export interface Debt {
  id?: string;
  user_id: string;
  type: "lent" | "borrowed";
  person_name: string;
  amount: number;
  description?: string;
  status: "pending" | "settled";
}

export async function getDebts(userId: string, status?: "pending" | "settled") {
  let query = supabase
    .from("debts")
    .select("*")
    .eq("user_id", userId);

  if (status) {
    query = query.eq("status", status);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addDebt(debt: Debt) {
  const { data, error } = await supabase
    .from("debts")
    .insert([debt])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function updateDebt(debtId: string, updates: Partial<Debt>) {
  const { data, error } = await supabase
    .from("debts")
    .update(updates)
    .eq("id", debtId)
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function deleteDebt(debtId: string) {
  const { error } = await supabase.from("debts").delete().eq("id", debtId);

  if (error) throw error;
  return true;
}

// ── Savings Goals Operations ───────────────────────────────────────────────────

export interface SavingsGoal {
  id?: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount?: number;
  deadline?: string;
}

export async function getSavingsGoals(userId: string) {
  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("user_id", userId)
    .order("deadline", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

export async function addSavingsGoal(goal: SavingsGoal) {
  const { data, error } = await supabase
    .from("savings_goals")
    .insert([goal])
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function updateSavingsGoal(
  goalId: string,
  updates: Partial<SavingsGoal>
) {
  const { data, error } = await supabase
    .from("savings_goals")
    .update(updates)
    .eq("id", goalId)
    .select();

  if (error) throw error;
  return data?.[0];
}

export async function deleteSavingsGoal(goalId: string) {
  const { error } = await supabase
    .from("savings_goals")
    .delete()
    .eq("id", goalId);

  if (error) throw error;
  return true;
}

// ── Analytics Operations ──────────────────────────────────────────────────────

export async function getFinanceSummary(userId: string, month: string) {
  const [year, monthNum] = month.split("-");
  const startDate = `${year}-${monthNum}-01`;
  const endDate = `${year}-${monthNum}-31`;

  const [transactions, budget, debts, goals] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("budgets")
      .select("*")
      .eq("user_id", userId)
      .eq("month", `${year}-${monthNum}-01`)
      .single(),
    supabase
      .from("debts")
      .select("*")
      .eq("user_id", userId),
    supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", userId),
  ]);

  const txData = transactions.data || [];
  const budgetData = budget.data;
  const debtsData = debts.data || [];
  const goalsData = goals.data || [];

  const totalIncome = txData
    .filter((tx: any) => tx.type === "income")
    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

  const totalExpense = txData
    .filter((tx: any) => tx.type === "expense")
    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

  const totalBorrowed = debtsData
    .filter((debt: any) => debt.type === "borrowed" && debt.status === "pending")
    .reduce((sum: number, debt: any) => sum + debt.amount, 0);

  const totalLent = debtsData
    .filter((debt: any) => debt.type === "lent" && debt.status === "pending")
    .reduce((sum: number, debt: any) => sum + debt.amount, 0);

  const totalSavingsTarget = goalsData.reduce(
    (sum: number, goal: any) => sum + goal.target_amount,
    0
  );

  const totalSavingsCurrent = goalsData.reduce(
    (sum: number, goal: any) => sum + goal.current_amount,
    0
  );

  return {
    month,
    income: totalIncome,
    expense: totalExpense,
    balance: totalIncome - totalExpense,
    budget: budgetData?.limit_amount || 0,
    budgetUsed: totalExpense,
    budgetRemaining: (budgetData?.limit_amount || 0) - totalExpense,
    borrowed: totalBorrowed,
    lent: totalLent,
    savingsTarget: totalSavingsTarget,
    savingsCurrent: totalSavingsCurrent,
    transactions: txData,
    debts: debtsData,
    goals: goalsData,
  };
}

export async function getExpensesByCategory(
  userId: string,
  month: string
) {
  const [year, monthNum] = month.split("-");
  const startDate = `${year}-${monthNum}-01`;
  const endDate = `${year}-${monthNum}-31`;

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .eq("type", "expense")
    .gte("date", startDate)
    .lte("date", endDate);

  if (error) throw error;

  const categoryMap: Record<string, number> = {};
  (transactions || []).forEach((tx: any) => {
    categoryMap[tx.category] = (categoryMap[tx.category] || 0) + tx.amount;
  });

  return Object.entries(categoryMap)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage:
        transactions && transactions.length > 0
          ? Math.round(
              (amount /
                (transactions as any[]).reduce((s, t) => s + t.amount, 0)) *
                100
            )
          : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}
