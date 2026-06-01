import type {
  AddonPricing,
  AddonPricingModel,
  FeatureTierCell,
  LineItem,
  QuoteAddonInput,
  QuoteBreakdown,
  TermLength,
} from "./types";

export const TERM_MONTHS: Record<TermLength, number> = {
  monthly: 1,
  annual: 12,
  two_year: 24,
};

export const TERM_DISCOUNT: Record<TermLength, number> = {
  monthly: 0,
  annual: 0.15,
  two_year: 0.25,
};

export const TERM_LABELS: Record<TermLength, string> = {
  monthly: "Monthly",
  annual: "Annual (12 months, 15% discount on per-seat price)",
  two_year: "Two-year (24 months, 25% discount on per-seat price)",
};

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function computeProductLineAmount(
  seats: number,
  basePricePerSeat: number,
  termLength: TermLength
): { amount: number; calculation: string } {
  const months = TERM_MONTHS[termLength];
  const discount = TERM_DISCOUNT[termLength];
  const amount = seats * basePricePerSeat * months * (1 - discount);
  const discountPct = Math.round(discount * 100);
  const calculation =
    discount > 0
      ? `${seats} seats × ${formatUsd(basePricePerSeat)} per seat per month × ${months} months × (1 - ${discountPct}% ${termLength === "annual" ? "annual" : "two-year"} discount)`
      : `${seats} seats × ${formatUsd(basePricePerSeat)} per seat per month × ${months} month`;
  return { amount, calculation };
}

export function computeAddonLineAmount(
  pricingModel: AddonPricingModel,
  value: number,
  termLength: TermLength,
  addonSeats: number | undefined,
  productLineAmount: number
): { amount: number; calculation: string; notes: string } {
  const months = TERM_MONTHS[termLength];

  if (pricingModel === "fixed") {
    const amount = value * months;
    return {
      amount,
      calculation: `${formatUsd(value)} per month × ${months} months`,
      notes: "Fixed monthly add-on price",
    };
  }

  if (pricingModel === "per_seat") {
    const seats = addonSeats ?? 0;
    const amount = seats * value * months;
    return {
      amount,
      calculation: `${seats} seats × ${formatUsd(value)} per seat per month × ${months} months`,
      notes: "Per-seat add-on (seat count is independent of product seats)",
    };
  }

  const amount = (value / 100) * productLineAmount;
  return {
    amount,
    calculation: `${value}% of product cost (${formatUsd(productLineAmount)})`,
    notes: "Percentage of product cost add-on",
  };
}

export interface BuildQuoteParams {
  productName: string;
  tierName: string;
  basePricePerSeat: number;
  seats: number;
  termLength: TermLength;
  discountPercent: number;
  matrix: FeatureTierCell[];
  addonPricing: AddonPricing[];
  featureNames: Record<string, string>;
  selectedAddons: QuoteAddonInput[];
}

export function buildQuoteBreakdown(params: BuildQuoteParams): QuoteBreakdown {
  const {
    productName,
    tierName,
    basePricePerSeat,
    seats,
    termLength,
    discountPercent,
    matrix,
    addonPricing,
    featureNames,
    selectedAddons,
  } = params;

  const lineItems: LineItem[] = [];

  const productLine = computeProductLineAmount(seats, basePricePerSeat, termLength);
  lineItems.push({
    label: `${productName} - ${tierName} tier`,
    calculation: productLine.calculation,
    notes: "Base product cost",
    amount: productLine.amount,
  });

  const pricingByFeature = new Map(
    addonPricing.map((p) => [p.featureId, p])
  );
  const availabilityByFeature = new Map(
    matrix.map((c) => [c.featureId, c.availability])
  );

  for (const addon of selectedAddons) {
    if (availabilityByFeature.get(addon.featureId) !== "addon") {
      throw new Error(`Feature ${addon.featureId} is not available as an add-on for this tier`);
    }
    const pricing = pricingByFeature.get(addon.featureId);
    if (!pricing) {
      throw new Error(`Missing add-on pricing for feature ${addon.featureId}`);
    }
    if (pricing.pricingModel === "per_seat" && (addon.addonSeats == null || addon.addonSeats < 1)) {
      throw new Error(`Per-seat add-on ${addon.featureId} requires addonSeats`);
    }

    const percentValue =
      pricing.pricingModel === "percent"
        ? (addon.percentValue ?? pricing.value)
        : pricing.value;

    const addonLine = computeAddonLineAmount(
      pricing.pricingModel,
      percentValue,
      termLength,
      addon.addonSeats,
      productLine.amount
    );

    lineItems.push({
      label: `Add-on: ${featureNames[addon.featureId] ?? addon.featureId}`,
      calculation: addonLine.calculation,
      notes: addonLine.notes,
      amount: addonLine.amount,
    });
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const total = subtotal - discountAmount;

  if (discountPercent > 0) {
    lineItems.push({
      label: `Quote discount (${discountPercent}%)`,
      calculation: `${formatUsd(subtotal)} × ${discountPercent}%`,
      notes: "Overall quote discount",
      amount: -discountAmount,
    });
  }

  return {
    lineItems,
    subtotal,
    discountPercent,
    discountAmount,
    total,
  };
}
