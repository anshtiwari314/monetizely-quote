import { describe, expect, it } from "vitest";
import {
  buildQuoteBreakdown,
  computeAddonLineAmount,
  computeProductLineAmount,
} from "./pricing";

describe("computeProductLineAmount", () => {
  it("matches sample quote: Growth annual 25 seats", () => {
    const { amount } = computeProductLineAmount(25, 50, "annual");
    expect(amount).toBe(12750);
  });

  it("applies two-year discount", () => {
    const { amount } = computeProductLineAmount(10, 100, "two_year");
    expect(amount).toBe(10 * 100 * 24 * 0.75);
  });

  it("monthly has no term discount", () => {
    const { amount } = computeProductLineAmount(5, 25, "monthly");
    expect(amount).toBe(125);
  });
});

describe("computeAddonLineAmount", () => {
  it("fixed monthly add-on over 12 months", () => {
    const { amount } = computeAddonLineAmount("fixed", 200, "annual", undefined, 12750);
    expect(amount).toBe(2400);
  });

  it("per-seat add-on with independent seat count", () => {
    const { amount } = computeAddonLineAmount("per_seat", 50, "annual", 5, 12750);
    expect(amount).toBe(3000);
  });

  it("percent of product cost", () => {
    const { amount } = computeAddonLineAmount("percent", 10, "annual", undefined, 12750);
    expect(amount).toBe(1275);
  });
});

describe("buildQuoteBreakdown", () => {
  it("matches Acme Corp sample quote total", () => {
    const breakdown = buildQuoteBreakdown({
      productName: "Analytics Suite",
      tierName: "Growth",
      basePricePerSeat: 50,
      seats: 25,
      termLength: "annual",
      discountPercent: 0,
      matrix: [
        { featureId: "sso", tierId: "growth", availability: "addon" },
        { featureId: "api", tierId: "growth", availability: "addon" },
      ],
      addonPricing: [
        { featureId: "sso", tierId: "growth", pricingModel: "fixed", value: 200 },
        { featureId: "api", tierId: "growth", pricingModel: "per_seat", value: 50 },
      ],
      featureNames: { sso: "Single Sign-On (SSO)", api: "API access" },
      selectedAddons: [
        { featureId: "sso" },
        { featureId: "api", addonSeats: 5 },
      ],
    });

    expect(breakdown.subtotal).toBe(18150);
    expect(breakdown.total).toBe(18150);
    expect(breakdown.lineItems).toHaveLength(3);
  });

  it("applies quote-level discount", () => {
    const breakdown = buildQuoteBreakdown({
      productName: "Analytics Suite",
      tierName: "Growth",
      basePricePerSeat: 50,
      seats: 10,
      termLength: "monthly",
      discountPercent: 10,
      matrix: [],
      addonPricing: [],
      featureNames: {},
      selectedAddons: [],
    });

    expect(breakdown.subtotal).toBe(500);
    expect(breakdown.discountAmount).toBe(50);
    expect(breakdown.total).toBe(450);
    expect(breakdown.lineItems.some((l) => l.label.includes("discount"))).toBe(true);
  });
});
