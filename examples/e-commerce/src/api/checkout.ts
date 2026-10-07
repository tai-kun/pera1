export type ShippingInfo = {
  readonly name: string;
  readonly address: string;
  readonly city: string;
  readonly zip: string;
};

export type PaymentInfo = {
  readonly cardNumber: string;
  readonly expiry: string;
  readonly cvc: string;
};

const SHIPPING_KEY = "pera1-e-commerce:shipping";
const PAYMENT_KEY = "pera1-e-commerce:payment";

function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isValidShipping(value: unknown): value is ShippingInfo {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const v = value as Record<string, unknown>;

  return (
    typeof v["name"] === "string" &&
    v["name"] !== "" &&
    typeof v["address"] === "string" &&
    v["address"] !== "" &&
    typeof v["city"] === "string" &&
    v["city"] !== "" &&
    typeof v["zip"] === "string" &&
    v["zip"] !== ""
  );
}

function isValidPayment(value: unknown): value is PaymentInfo {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const v = value as Record<string, unknown>;

  return (
    typeof v["cardNumber"] === "string" &&
    v["cardNumber"] !== "" &&
    typeof v["expiry"] === "string" &&
    v["expiry"] !== "" &&
    typeof v["cvc"] === "string" &&
    v["cvc"] !== ""
  );
}

export function getShipping(): ShippingInfo | null {
  const value = readStorage<ShippingInfo>(SHIPPING_KEY);

  return isValidShipping(value) ? value : null;
}

export function setShipping(info: ShippingInfo): void {
  try {
    localStorage.setItem(SHIPPING_KEY, JSON.stringify(info));
  } catch {
    // 保存に失敗しても無視します。
  }
}

export function getPayment(): PaymentInfo | null {
  const value = readStorage<PaymentInfo>(PAYMENT_KEY);

  return isValidPayment(value) ? value : null;
}

export function setPayment(info: PaymentInfo): void {
  try {
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(info));
  } catch {
    // 保存に失敗しても無視します。
  }
}

export function clearCheckoutState(): void {
  try {
    localStorage.removeItem(SHIPPING_KEY);
    localStorage.removeItem(PAYMENT_KEY);
  } catch {
    // 削除に失敗しても無視します。
  }
}
