import { Router } from "express";
import {
  getTransactionsController,
  addTransactionController,
  updateTransactionController,
  deleteTransactionController,
  getBudgetsController,
  getBudgetController,
  upsertBudgetController,
  deleteBudgetController,
  getDebtsController,
  addDebtController,
  updateDebtController,
  deleteDebtController,
  getSavingsGoalsController,
  addSavingsGoalController,
  updateSavingsGoalController,
  deleteSavingsGoalController,
  getFinanceSummaryController,
  getExpensesCategoryController,
} from "../controllers/finance.controller";

export const financeRoutes = Router();

// ── Transaction Routes ────────────────────────────────────────────────────
financeRoutes.get("/transactions", getTransactionsController);
financeRoutes.post("/transactions", addTransactionController);
financeRoutes.put("/transactions/:id", updateTransactionController);
financeRoutes.delete("/transactions/:id", deleteTransactionController);

// ── Budget Routes ─────────────────────────────────────────────────────────
financeRoutes.get("/budgets", getBudgetsController);
financeRoutes.get("/budgets/:month", getBudgetController);
financeRoutes.post("/budgets", upsertBudgetController);
financeRoutes.delete("/budgets/:id", deleteBudgetController);

// ── Debt Routes ───────────────────────────────────────────────────────────
financeRoutes.get("/debts", getDebtsController);
financeRoutes.post("/debts", addDebtController);
financeRoutes.put("/debts/:id", updateDebtController);
financeRoutes.delete("/debts/:id", deleteDebtController);

// ── Savings Goals Routes ──────────────────────────────────────────────────
financeRoutes.get("/goals", getSavingsGoalsController);
financeRoutes.post("/goals", addSavingsGoalController);
financeRoutes.put("/goals/:id", updateSavingsGoalController);
financeRoutes.delete("/goals/:id", deleteSavingsGoalController);

// ── Analytics Routes ──────────────────────────────────────────────────────
financeRoutes.get("/summary/:month", getFinanceSummaryController);
financeRoutes.get("/categories/:month", getExpensesCategoryController);

// ── Health Check ──────────────────────────────────────────────────────────
financeRoutes.get("/", (_request, response) => {
  response.json({ ok: true, module: "finance" });
});
