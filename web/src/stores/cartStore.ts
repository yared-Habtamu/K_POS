import { create } from "zustand";
import type {
  CartItem,
  Product,
  DiscountType,
  ExtraCharge,
  PaymentMethod,
} from "@/types";

interface CartState {
  items: CartItem[];
  extraCharges: ExtraCharge[];
  discount: { type: DiscountType; value: number } | null;
  paymentMethod: PaymentMethod;
  customerId: string | null;
  taxRate: number;

  // Actions
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setItemDiscount: (
    productId: string,
    type: DiscountType,
    value: number,
  ) => void;
  removeItemDiscount: (productId: string) => void;
  setCartDiscount: (type: DiscountType, value: number) => void;
  removeCartDiscount: () => void;
  addExtraCharge: (charge: ExtraCharge) => void;
  removeExtraCharge: (chargeId: string) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setCustomer: (customerId: string | null) => void;
  setTaxRate: (rate: number) => void;
  clearCart: () => void;

  // Computed
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getExtraChargesTotal: () => number;
  getTax: () => number;
  getTotal: () => number;
}

const DEFAULT_TAX_RATE = 0; // percentage

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  extraCharges: [],
  discount: null,
  paymentMethod: "cash",
  customerId: null,
  taxRate: DEFAULT_TAX_RATE,

  addItem: (product, quantity = 1) => {
    set((state) => {
      const existingIndex = state.items.findIndex(
        (item) => item.product.id === product.id,
      );

      if (existingIndex >= 0) {
        const newItems = [...state.items];
        const newQty = newItems[existingIndex].quantity + quantity;
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          quantity: newQty,
          subtotal: newQty * product.sellingPrice,
        };
        return { items: newItems };
      }

      return {
        items: [
          ...state.items,
          {
            product,
            quantity,
            subtotal: quantity * product.sellingPrice,
          },
        ],
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity,
              subtotal: quantity * item.product.sellingPrice,
            }
          : item,
      ),
    }));
  },

  setItemDiscount: (productId, type, value) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId
          ? { ...item, discount: { type, value } }
          : item,
      ),
    }));
  },

  removeItemDiscount: (productId) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.product.id === productId ? { ...item, discount: undefined } : item,
      ),
    }));
  },

  setCartDiscount: (type, value) => {
    set({ discount: { type, value } });
  },

  removeCartDiscount: () => {
    set({ discount: null });
  },

  addExtraCharge: (charge) => {
    set((state) => ({
      extraCharges: [...state.extraCharges, charge],
    }));
  },

  removeExtraCharge: (chargeId) => {
    set((state) => ({
      extraCharges: state.extraCharges.filter((c) => c.id !== chargeId),
    }));
  },

  setPaymentMethod: (method) => {
    set({ paymentMethod: method });
  },

  setCustomer: (customerId) => {
    set({ customerId });
  },

  setTaxRate: (rate) => {
    const parsedRate = Number(rate);
    set({
      taxRate: Number.isFinite(parsedRate) ? parsedRate : DEFAULT_TAX_RATE,
    });
  },

  clearCart: () => {
    set({
      items: [],
      extraCharges: [],
      discount: null,
      paymentMethod: "cash",
      customerId: null,
    });
  },

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      let itemTotal = item.subtotal;
      if (item.discount) {
        if (item.discount.type === "percentage") {
          itemTotal -= itemTotal * (item.discount.value / 100);
        } else {
          itemTotal -= item.discount.value;
        }
      }
      return sum + Math.max(0, itemTotal);
    }, 0);
  },

  getDiscountAmount: () => {
    const { discount } = get();
    if (!discount) return 0;

    const subtotal = get().getSubtotal();
    if (discount.type === "percentage") {
      return subtotal * (discount.value / 100);
    }
    return discount.value;
  },

  getExtraChargesTotal: () => {
    const { extraCharges } = get();
    return extraCharges.reduce((sum, charge) => sum + charge.amount, 0);
  },

  getTax: () => {
    const subtotal = get().getSubtotal();
    const discountAmount = get().getDiscountAmount();
    const currentRate = Number(get().taxRate);
    const rate =
      (Number.isFinite(currentRate) ? currentRate : DEFAULT_TAX_RATE) / 100;
    const taxable = subtotal - discountAmount + get().getExtraChargesTotal();
    return Math.round((taxable * rate + Number.EPSILON) * 100) / 100;
  },

  getTotal: () => {
    const subtotal = get().getSubtotal();
    const discountAmount = get().getDiscountAmount();
    const extraCharges = get().getExtraChargesTotal();
    const tax = get().getTax();
    return (
      Math.round(
        (subtotal - discountAmount + extraCharges + tax + Number.EPSILON) * 100,
      ) / 100
    );
  },
}));
