export type GoalType = "reduce_to_zero" | "immediate_zero";
export type ProductType = "cigarette" | "snus" | "vape" | "chew" | "other";
export type CurrencyCode = "USD" | "EUR" | "HUF";

export interface OnboardingData {
  productType: ProductType | "";
  firstName: string;
  lastName: string;
  durationValue: number | null;
  durationUnit: "years" | "months" | "weeks";
  dailyAmount: number | null;
  dailyUnit: string;
  strengthAmount: number;
  goalType: GoalType | "";
  unitPrice: number | null;
  unitPriceCurrency: CurrencyCode;
}

export interface ProfileData {
  displayName: string;
  email: string;
  reasons: string;
  building: string;
  identityStatement: string;
  triggers: string[];
  tone: "soft" | "direct";
  scienceDepth: "light" | "deeper";
  spikeIntensity: "minimal" | "guided";
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}
