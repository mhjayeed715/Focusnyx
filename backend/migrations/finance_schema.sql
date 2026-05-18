-- Finance Tracker Schema

-- Budget table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  limit_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, month)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  category VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debts/Loans table
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('lent', 'borrowed')),
  person_name VARCHAR(100) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Savings Goals table
CREATE TABLE IF NOT EXISTS savings_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  current_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_goals_user_id ON savings_goals(user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own budgets" ON budgets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budgets" ON budgets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budgets" ON budgets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budgets" ON budgets
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own debts" ON debts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debts" ON debts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debts" ON debts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own debts" ON debts
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own savings goals" ON savings_goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own savings goals" ON savings_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own savings goals" ON savings_goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own savings goals" ON savings_goals
  FOR DELETE USING (auth.uid() = user_id);
