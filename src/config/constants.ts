export const SITE_NAME = "REMQUIP";
export const SITE_DESCRIPTION = "Canada's Next-Generation Heavy-Duty Parts Distributor";
export const SITE_URL = "https://remquip.ca";

export const ORDER_STATUSES = ["pending", "processing", "shipped", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const SHIPMENT_STATUSES = ["pending", "label_created", "in_transit", "delivered", "exception"] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

/** Fallbacks when GET /settings/storefront is unavailable (matches seeded DB defaults). */
export const TAX_RATE = 0.14975;
export const FREE_SHIPPING_THRESHOLD = 500;
export const FLAT_SHIPPING_RATE = 25;

/**
 * Backend API origin (no .env — change here only).
 * Must match `API_URL` in `Backend/config.php` (same host + `/remquip/api` path).
 */
export const API_BASE_URL = "http://luccibyey.com.tn/remquip/api";

export const RATE_LIMITS = {
  auth: { requests: 10, windowMs: 60_000 },
  public: { requests: 100, windowMs: 60_000 },
  admin: { requests: 200, windowMs: 60_000 },
} as const;
