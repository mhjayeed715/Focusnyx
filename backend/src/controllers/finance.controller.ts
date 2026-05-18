import { Request, Response } from "express";
import {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getBudgets,
  getBudgetForMonth,
  upsertBudget,
  deleteBudget,
  getDebts,
  addDebt,
  updateDebt,
  deleteDebt,
  getSavingsGoals,
  addSavingsGoal,
  updateSavingsGoal,
  deleteSavingsGoal,
  getFinanceSummary,
  getExpensesByCategory,
  type Transaction,
  type Budget,
  type Debt,
  type SavingsGoal,
} from "../services/finance.service";

// ── Transaction Controllers ────────────────────────────────────────────────

export async function getTransactionsController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const month = req.query.month as string | undefined;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const transactions = await getTransactions(userId, month);
    res.json({ data: transactions });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get transactions" });
  }
}

export async function addTransactionController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { type, category, amount, description, date }: Transaction = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!type || !category || !amount || !date) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const transaction = await addTransaction({
      user_id: userId,
      type,
      category,
      amount,
      description,
      date,
    });

    res.status(201).json({ data: transaction });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to add transaction" });
  }
}

export async function updateTransactionController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;
    const updates = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const transaction = await updateTransaction(id, {
      user_id: userId,
      ...updates,
    });

    res.json({ data: transaction });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update transaction" });
  }
}

export async function deleteTransactionController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await deleteTransaction(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete transaction" });
  }
}

// ── Budget Controllers ────────────────────────────────────────────────────

export async function getBudgetsController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const budgets = await getBudgets(userId);
    res.json({ data: budgets });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get budgets" });
  }
}

export async function getBudgetController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { month } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const budget = await getBudgetForMonth(userId, month);
    res.json({ data: budget });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get budget" });
  }
}

export async function upsertBudgetController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { month, limit_amount }: Budget = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!month || !limit_amount) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const [year, monthNum] = month.split("-");
    const monthDate = `${year}-${monthNum}-01`;

    const budget = await upsertBudget({
      user_id: userId,
      month: monthDate,
      limit_amount,
    });

    res.status(201).json({ data: budget });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to save budget" });
  }
}

export async function deleteBudgetController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await deleteBudget(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete budget" });
  }
}

// ── Debt Controllers ──────────────────────────────────────────────────────

export async function getDebtsController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const status = req.query.status as "pending" | "settled" | undefined;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const debts = await getDebts(userId, status);
    res.json({ data: debts });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get debts" });
  }
}

export async function addDebtController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { type, person_name, amount, description, status }: Debt = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!type || !person_name || !amount) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const debt = await addDebt({
      user_id: userId,
      type,
      person_name,
      amount,
      description,
      status: status || "pending",
    });

    res.status(201).json({ data: debt });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to add debt" });
  }
}

export async function updateDebtController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;
    const updates = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const debt = await updateDebt(id, updates);
    res.json({ data: debt });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update debt" });
  }
}

export async function deleteDebtController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await deleteDebt(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete debt" });
  }
}

// ── Savings Goals Controllers ──────────────────────────────────────────────

export async function getSavingsGoalsController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const goals = await getSavingsGoals(userId);
    res.json({ data: goals });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get savings goals" });
  }
}

export async function addSavingsGoalController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { name, target_amount, current_amount, deadline }: SavingsGoal =
      req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!name || !target_amount) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const goal = await addSavingsGoal({
      user_id: userId,
      name,
      target_amount,
      current_amount: current_amount || 0,
      deadline,
    });

    res.status(201).json({ data: goal });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to add savings goal" });
  }
}

export async function updateSavingsGoalController(
  req: Request,
  res: Response
) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;
    const updates = req.body;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const goal = await updateSavingsGoal(id, updates);
    res.json({ data: goal });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to update savings goal" });
  }
}

export async function deleteSavingsGoalController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    await deleteSavingsGoal(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to delete savings goal" });
  }
}

// ── Analytics Controllers ─────────────────────────────────────────────────

export async function getFinanceSummaryController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { month } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const summary = await getFinanceSummary(userId, month);
    res.json({ data: summary });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get finance summary" });
  }
}

export async function getExpensesCategoryController(
  req: Request,
  res: Response
) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { month } = req.params;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const categories = await getExpensesByCategory(userId, month);
    res.json({ data: categories });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get expenses by category" });
  }
}
