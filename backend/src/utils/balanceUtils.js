// Computes net balances for a group's users from expenses and settlements.
// Returns a map: { "userId": netAmount }, where positive means others owe this user.
export const computeNetBalances = (expenses, settlements) => {
  const balances = {};

  const addBalance = (userId, delta) => {
    if (!balances[userId]) balances[userId] = 0;
    balances[userId] += delta;
  };

  // From each expense:
  // - payer's balance increases by each participant's owed share
  // - participant's balance decreases by their owed amount
  for (const expense of expenses) {
    const payerId = expense.paidBy.toString();
    for (const split of expense.splits) {
      const userId = split.user.toString();
      const amount = split.amount;
      addBalance(payerId, amount);
      addBalance(userId, -amount);
    }
  }

  // Apply settlements: when A pays B amount X, A's debt reduces and B's credit reduces
  for (const s of settlements) {
    const fromId = s.from.toString();
    const toId = s.to.toString();
    const amount = s.amount;
    addBalance(fromId, amount);
    addBalance(toId, -amount);
  }

  return balances;
};

// Given net balances, return simplified pairwise IOUs (who owes whom how much)
export const simplifyDebts = (balances) => {
  const creditors = [];
  const debtors = [];

  Object.entries(balances).forEach(([userId, amt]) => {
    if (amt > 0.01) creditors.push({ userId, amount: amt });
    else if (amt < -0.01) debtors.push({ userId, amount: -amt }); // store positive for convenience
  });

  const result = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const pay = Math.min(debtor.amount, creditor.amount);

    result.push({ from: debtor.userId, to: creditor.userId, amount: pay });

    debtor.amount -= pay;
    creditor.amount -= pay;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return result;
};


