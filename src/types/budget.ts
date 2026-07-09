export type SerializedBudget = {
  id: string;
  userId: string;
  category: string;
  amount: number;
  currencyCode: string;
  month: number;
  year: number;
  /** Spent amount in this category for the period (computed, not stored). */
  spent: number;
  createdAt: string;
  updatedAt: string;
};
