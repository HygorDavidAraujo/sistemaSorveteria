export type CartMode = 'pdv' | 'comanda' | 'delivery';

export type CartDraftItem = {
  id: string;
  productId: string;
  productName?: string;
  saleType?: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
};

export type CartDraft = {
  version: 1;
  mode: CartMode;
  items: CartDraftItem[];
  selectedCustomerId?: string;
  discountValue?: number;
  couponCode?: string;
  couponDiscountValue?: number;
  additionalFee?: number;
  deliveryFee?: number;
  updatedAt: string;
};

const STORAGE_KEY = 'gelatini.cartDraft.v1';

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const loadCartDraft = (): CartDraft | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return null;
    if (!parsed.mode || !['pdv', 'comanda', 'delivery'].includes(parsed.mode)) return null;
    if (!Array.isArray(parsed.items)) return null;

    const items: CartDraftItem[] = parsed.items
      .map((i: any) => ({
        id: String(i?.id ?? ''),
        productId: String(i?.productId ?? ''),
        productName: i?.productName ? String(i.productName) : undefined,
        saleType: i?.saleType ? String(i.saleType) : undefined,
        quantity: toNumber(i?.quantity),
        unitPrice: i?.unitPrice !== undefined ? toNumber(i.unitPrice) : undefined,
        totalPrice: i?.totalPrice !== undefined ? toNumber(i.totalPrice) : undefined,
      }))
      .filter((i: CartDraftItem) => i.id && i.productId && i.quantity > 0);

    return {
      version: 1,
      mode: parsed.mode,
      items,
      selectedCustomerId: parsed.selectedCustomerId ? String(parsed.selectedCustomerId) : undefined,
      discountValue: parsed.discountValue !== undefined ? toNumber(parsed.discountValue) : undefined,
      couponCode: parsed.couponCode ? String(parsed.couponCode) : undefined,
      couponDiscountValue:
        parsed.couponDiscountValue !== undefined ? toNumber(parsed.couponDiscountValue) : undefined,
      additionalFee: parsed.additionalFee !== undefined ? toNumber(parsed.additionalFee) : undefined,
      deliveryFee: parsed.deliveryFee !== undefined ? toNumber(parsed.deliveryFee) : undefined,
      updatedAt: parsed.updatedAt ? String(parsed.updatedAt) : new Date().toISOString(),
    };
  } catch {
    return null;
  }
};

export const saveCartDraft = (draft: Omit<CartDraft, 'version' | 'updatedAt'>) => {
  const payload: CartDraft = {
    version: 1,
    ...draft,
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota/security errors
  }
};

export const clearCartDraft = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};
