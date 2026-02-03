export type GoalType = "reduce" | "immediate";

export interface OnboardingData {
  productType: string;
  duration: string;
  dailyAmount: number | null;
  dailyUnit: string;
  startDate: string;
  goalType: GoalType | "";
}
