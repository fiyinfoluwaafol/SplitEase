// Mock Users
export const currentUser = {
  id: "user-1",
  name: "John Doe",
  email: "john@example.com",
  avatar: null,
};

export const users = [
  currentUser,
  {
    id: "user-2",
    name: "Jane Smith",
    email: "jane@example.com",
    avatar: null,
  },
  {
    id: "user-3",
    name: "Mike Johnson",
    email: "mike@example.com",
    avatar: null,
  },
  {
    id: "user-4",
    name: "Sarah Wilson",
    email: "sarah@example.com",
    avatar: null,
  },
  {
    id: "user-5",
    name: "Tom Brown",
    email: "tom@example.com",
    avatar: null,
  },
];

// Mock Groups
export const groups = [
  {
    id: "group-1",
    name: "Apartment 4B",
    description: "Monthly rent and utilities",
    members: ["user-1", "user-2", "user-3"],
    createdAt: "2024-01-15",
    totalExpenses: 2450.00,
  },
  {
    id: "group-2",
    name: "Trip to Miami",
    description: "Beach vacation expenses",
    members: ["user-1", "user-2", "user-4", "user-5"],
    createdAt: "2024-02-20",
    totalExpenses: 1820.50,
  },
  {
    id: "group-3",
    name: "Office Lunch Club",
    description: "Weekly team lunches",
    members: ["user-1", "user-3", "user-4"],
    createdAt: "2024-03-01",
    totalExpenses: 485.75,
  },
];

// Expense Categories
export const categories = [
  { id: "food", name: "Food & Dining", icon: "🍔" },
  { id: "utilities", name: "Utilities", icon: "💡" },
  { id: "rent", name: "Rent", icon: "🏠" },
  { id: "transport", name: "Transportation", icon: "🚗" },
  { id: "entertainment", name: "Entertainment", icon: "🎬" },
  { id: "shopping", name: "Shopping", icon: "🛒" },
  { id: "travel", name: "Travel", icon: "✈️" },
  { id: "other", name: "Other", icon: "📦" },
];

// Mock Expenses
export const expenses = [
  {
    id: "exp-1",
    description: "March Rent",
    amount: 1800.00,
    category: "rent",
    groupId: "group-1",
    paidBy: "user-1",
    splitBetween: ["user-1", "user-2", "user-3"],
    splitType: "equal",
    date: "2024-03-01",
    settled: false,
  },
  {
    id: "exp-2",
    description: "Electricity Bill",
    amount: 150.00,
    category: "utilities",
    groupId: "group-1",
    paidBy: "user-2",
    splitBetween: ["user-1", "user-2", "user-3"],
    splitType: "equal",
    date: "2024-03-05",
    settled: false,
  },
  {
    id: "exp-3",
    description: "Hotel Booking",
    amount: 800.00,
    category: "travel",
    groupId: "group-2",
    paidBy: "user-1",
    splitBetween: ["user-1", "user-2", "user-4", "user-5"],
    splitType: "equal",
    date: "2024-02-25",
    settled: true,
  },
  {
    id: "exp-4",
    description: "Beach Restaurant Dinner",
    amount: 245.50,
    category: "food",
    groupId: "group-2",
    paidBy: "user-4",
    splitBetween: ["user-1", "user-2", "user-4", "user-5"],
    splitType: "equal",
    date: "2024-02-26",
    settled: false,
  },
  {
    id: "exp-5",
    description: "Team Lunch - Pizza Place",
    amount: 125.75,
    category: "food",
    groupId: "group-3",
    paidBy: "user-3",
    splitBetween: ["user-1", "user-3", "user-4"],
    splitType: "equal",
    date: "2024-03-08",
    settled: false,
  },
  {
    id: "exp-6",
    description: "Internet Bill",
    amount: 80.00,
    category: "utilities",
    groupId: "group-1",
    paidBy: "user-1",
    splitBetween: ["user-1", "user-2", "user-3"],
    splitType: "equal",
    date: "2024-03-10",
    settled: false,
  },
  {
    id: "exp-7",
    description: "Uber to Airport",
    amount: 55.00,
    category: "transport",
    groupId: "group-2",
    paidBy: "user-2",
    splitBetween: ["user-1", "user-2", "user-4", "user-5"],
    splitType: "equal",
    date: "2024-02-20",
    settled: true,
  },
  {
    id: "exp-8",
    description: "Water Park Tickets",
    amount: 320.00,
    category: "entertainment",
    groupId: "group-2",
    paidBy: "user-5",
    splitBetween: ["user-1", "user-2", "user-4", "user-5"],
    splitType: "equal",
    date: "2024-02-27",
    settled: false,
  },
];

// Mock Payments
export const payments = [
  {
    id: "pay-1",
    from: "user-2",
    to: "user-1",
    amount: 200.00,
    date: "2024-02-28",
    note: "Hotel share",
    groupId: "group-2",
  },
  {
    id: "pay-2",
    from: "user-4",
    to: "user-1",
    amount: 200.00,
    date: "2024-02-28",
    note: "Hotel share",
    groupId: "group-2",
  },
  {
    id: "pay-3",
    from: "user-5",
    to: "user-1",
    amount: 200.00,
    date: "2024-02-28",
    note: "Hotel share",
    groupId: "group-2",
  },
  {
    id: "pay-4",
    from: "user-1",
    to: "user-2",
    amount: 13.75,
    date: "2024-02-21",
    note: "Uber share",
    groupId: "group-2",
  },
];

// Helper functions
export const getUserById = (id) => users.find((u) => u.id === id);

export const getGroupById = (id) => groups.find((g) => g.id === id);

export const getExpensesByGroup = (groupId) =>
  expenses.filter((e) => e.groupId === groupId);

export const getCategoryById = (id) => categories.find((c) => c.id === id);

// Calculate balances for current user
export const calculateBalances = (user = currentUser) => {
  if (!user) return { youOwe: 0, youAreOwed: 0, totalBalance: 0 };
  
  let youOwe = 0;
  let youAreOwed = 0;
  const userId = user.id.toString();

  expenses.forEach((expense) => {
    if (expense.settled) return;

    const share = expense.amount / expense.splitBetween.length;
    const paidBy = expense.paidBy.toString();
    const splitBetween = expense.splitBetween.map(id => id.toString());

    if (paidBy === userId) {
      // Current user paid, others owe them
      splitBetween.forEach((userIdInSplit) => {
        if (userIdInSplit !== userId) {
          youAreOwed += share;
        }
      });
    } else if (splitBetween.includes(userId)) {
      // Someone else paid, current user owes them
      youOwe += share;
    }
  });

  // Subtract payments made
  payments.forEach((payment) => {
    const from = payment.from.toString();
    const to = payment.to.toString();
    if (from === userId) {
      youOwe -= payment.amount;
    } else if (to === userId) {
      youAreOwed -= payment.amount;
    }
  });

  return {
    youOwe: Math.max(0, youOwe),
    youAreOwed: Math.max(0, youAreOwed),
    totalBalance: youAreOwed - youOwe,
  };
};

// Get detailed balances (who owes whom)
export const getDetailedBalances = (user = currentUser) => {
  if (!user) return [];
  
  const balances = {};
  const userId = user.id.toString();

  // Initialize balances for all users
  users.forEach((u) => {
    if (u.id.toString() !== userId) {
      balances[u.id.toString()] = 0;
    }
  });

  // Calculate from expenses
  expenses.forEach((expense) => {
    if (expense.settled) return;

    const share = expense.amount / expense.splitBetween.length;
    const paidBy = expense.paidBy.toString();
    const splitBetween = expense.splitBetween.map(id => id.toString());

    if (paidBy === userId) {
      splitBetween.forEach((userIdInSplit) => {
        if (userIdInSplit !== userId) {
          balances[userIdInSplit] = (balances[userIdInSplit] || 0) + share;
        }
      });
    } else if (splitBetween.includes(userId)) {
      balances[paidBy] = (balances[paidBy] || 0) - share;
    }
  });

  // Adjust for payments
  payments.forEach((payment) => {
    const from = payment.from.toString();
    const to = payment.to.toString();
    if (from === userId) {
      balances[to] = (balances[to] || 0) + payment.amount;
    } else if (to === userId) {
      balances[from] = (balances[from] || 0) - payment.amount;
    }
  });

  return Object.entries(balances)
    .filter(([_, amount]) => Math.abs(amount) > 0.01)
    .map(([userIdStr, amount]) => ({
      user: getUserById(userIdStr),
      amount: amount,
      type: amount > 0 ? "owed" : "owes",
    }));
};

// Get recent activity
export const getRecentActivity = (limit = 5) => {
  const allActivity = [
    ...expenses.map((e) => ({
      type: "expense",
      data: e,
      date: new Date(e.date),
    })),
    ...payments.map((p) => ({
      type: "payment",
      data: p,
      date: new Date(p.date),
    })),
  ];

  return allActivity
    .sort((a, b) => b.date - a.date)
    .slice(0, limit);
};
