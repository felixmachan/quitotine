export type GoalType = "reduce_to_zero" | "immediate_zero";
export type ProductType = "cigarette" | "snus" | "vape" | "chew" | "other";

export interface OnboardingData {
  productType: ProductType | "";
  firstName: string;
  lastName: string;
  durationValue: number | null;
  durationUnit: "years" | "months" | "weeks";
  dailyAmount: number | null;
  dailyUnit: string;
  goalType: GoalType | "";
}
