import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Role = "merchant" | "customer";
export type TxType = "borrow" | "repayment";
export type TxStatus = "pending" | "confirmed";

export interface Customer {
  id: string;
  merchantId: string;
  name: string;
  walletAddress: string;
  phone?: string;
  createdAt: number;
}

export interface Transaction {
  id: string;
  customerId: string;
  merchantId: string;
  amount: number;
  type: TxType;
  status: TxStatus;
  notes?: string;
  txHash?: string;
  timestamp: number;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: number;
}

export interface SessionUser {
  id: string;
  role: Role;
  walletAddress: string;
  email?: string;
  displayName?: string;
}

interface State {
  user: SessionUser | null;
  customers: Customer[];
  transactions: Transaction[];
  notifications: Notification[];
  login: (role: Role, displayName?: string) => SessionUser;
  loginAsCustomerWallet: (walletAddress: string) => SessionUser | null;
  logout: () => void;
  addCustomer: (input: Omit<Customer, "id" | "createdAt" | "merchantId">) => Customer;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addTransaction: (input: Omit<Transaction, "id" | "timestamp" | "merchantId" | "status"> & { status?: TxStatus }) => Transaction;
  pushNotification: (userId: string, message: string) => void;
  markAllRead: (userId: string) => void;
}

const rid = () => Math.random().toString(36).slice(2, 10);
const fakeWallet = () =>
  "0x" +
  Array.from({ length: 40 }, () =>
    "0123456789abcdef"[Math.floor(Math.random() * 16)],
  ).join("");
const fakeTxHash = () =>
  "0x" +
  Array.from({ length: 64 }, () =>
    "0123456789abcdef"[Math.floor(Math.random() * 16)],
  ).join("");

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      customers: [],
      transactions: [],
      notifications: [],
      login: (role, displayName) => {
        const user: SessionUser = {
          id: rid(),
          role,
          walletAddress: fakeWallet(),
          displayName: displayName || (role === "merchant" ? "My Shop" : "Wallet User"),
        };
        set({ user });
        return user;
      },
      loginAsCustomerWallet: (walletAddress) => {
        const customer = get().customers.find(
          (c) => c.walletAddress.toLowerCase() === walletAddress.toLowerCase(),
        );
        if (!customer) return null;
        const user: SessionUser = {
          id: customer.id,
          role: "customer",
          walletAddress: customer.walletAddress,
          displayName: customer.name,
        };
        set({ user });
        return user;
      },
      logout: () => set({ user: null }),
      addCustomer: (input) => {
        const user = get().user;
        if (!user || user.role !== "merchant") throw new Error("Not a merchant");
        const customer: Customer = {
          id: rid(),
          merchantId: user.id,
          createdAt: Date.now(),
          ...input,
          walletAddress: input.walletAddress || fakeWallet(),
        };
        set({ customers: [customer, ...get().customers] });
        get().pushNotification(user.id, `Customer ${customer.name} added`);
        return customer;
      },
      updateCustomer: (id, patch) =>
        set({
          customers: get().customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }),
      deleteCustomer: (id) =>
        set({
          customers: get().customers.filter((c) => c.id !== id),
          transactions: get().transactions.filter((t) => t.customerId !== id),
        }),
      addTransaction: ({ customerId, amount, type, notes, status, txHash }) => {
        const user = get().user;
        if (!user) throw new Error("Not logged in");
        const customer = get().customers.find((c) => c.id === customerId);
        if (!customer) throw new Error("Customer not found");
        const tx: Transaction = {
          id: rid(),
          merchantId: customer.merchantId,
          customerId,
          amount,
          type,
          notes,
          status: status || (type === "repayment" ? "confirmed" : "confirmed"),
          txHash: txHash || (type === "repayment" ? fakeTxHash() : undefined),
          timestamp: Date.now(),
        };
        set({ transactions: [tx, ...get().transactions] });
        const verb = type === "borrow" ? "Borrow recorded" : "Repayment received";
        get().pushNotification(customer.merchantId, `${verb}: ${amount.toFixed(2)} USDC — ${customer.name}`);
        get().pushNotification(customer.id, `${type === "borrow" ? "New borrow on your ledger" : "Payment confirmed"}: ${amount.toFixed(2)} USDC`);
        return tx;
      },
      pushNotification: (userId, message) =>
        set({
          notifications: [
            { id: rid(), userId, message, read: false, createdAt: Date.now() },
            ...get().notifications,
          ].slice(0, 200),
        }),
      markAllRead: (userId) =>
        set({
          notifications: get().notifications.map((n) =>
            n.userId === userId ? { ...n, read: true } : n,
          ),
        }),
    }),
    {
      name: "arckhata-store-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      skipHydration: true,
    },
  ),
);

export function customerBalance(customerId: string, txs: Transaction[]) {
  let borrowed = 0;
  let repaid = 0;
  for (const t of txs) {
    if (t.customerId !== customerId) continue;
    if (t.type === "borrow") borrowed += t.amount;
    else repaid += t.amount;
  }
  return { borrowed, repaid, outstanding: Math.max(0, borrowed - repaid) };
}

export function shortAddr(addr: string) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}