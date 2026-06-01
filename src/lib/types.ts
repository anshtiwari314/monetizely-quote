export type FeatureAvailability = "included" | "addon" | "not_available";
export type AddonPricingModel = "fixed" | "per_seat" | "percent";
export type TermLength = "monthly" | "annual" | "two_year";

export interface Product {
  id: string;
  name: string;
  companyId: string;
}

export interface Tier {
  id: string;
  productId: string;
  name: string;
  basePricePerSeat: number;
  notes: string | null;
  sortOrder: number;
}

export interface Feature {
  id: string;
  productId: string;
  name: string;
  sortOrder: number;
}

export interface FeatureTierCell {
  featureId: string;
  tierId: string;
  availability: FeatureAvailability;
}

export interface AddonPricing {
  featureId: string;
  tierId: string;
  pricingModel: AddonPricingModel;
  value: number;
}

export interface ProductDetail extends Product {
  tiers: Tier[];
  features: Feature[];
  matrix: FeatureTierCell[];
  addonPricing: AddonPricing[];
}

export interface QuoteAddonInput {
  featureId: string;
  addonSeats?: number;
  /** Override catalog % for percent-based add-ons (e.g. Advanced anomaly detection). */
  percentValue?: number;
}

export interface QuoteInput {
  name: string;
  clientName: string;
  companyId: string;
  productId: string;
  tierId: string;
  seats: number;
  termLength: TermLength;
  discountPercent?: number;
  addons: QuoteAddonInput[];
}

export interface LineItem {
  label: string;
  calculation: string;
  notes: string;
  amount: number;
}

export interface QuoteBreakdown {
  lineItems: LineItem[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
}

export interface QuoteRecord {
  id: string;
  name: string;
  clientName: string;
  companyId: string;
  productId: string;
  productName: string;
  tierId: string;
  tierName: string;
  seats: number;
  termLength: TermLength;
  discountPercent: number;
  createdAt: string;
  validUntil: string;
  breakdown: QuoteBreakdown;
  selectedAddons: {
    featureId: string;
    featureName: string;
    addonSeats: number | null;
    addonPercent: number | null;
  }[];
}
