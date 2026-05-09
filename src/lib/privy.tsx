import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PrivyProfile } from "./store";

// Simulated Privy SDK. Persists a single signed-in Privy account on this device.
// Swap implementation with @privy-io/react-auth + a real App ID later — the
// public surface (usePrivy()) stays identical.

const STORAGE_KEY = "arckhata-privy-v1";

const fakeWallet = () =>
  "0x" +
  Array.from({ length: 40 }, () =>
    "0123456789abcdef"[Math.floor(Math.random() * 16)],
  ).join("");

function deriveStableWallet(seed: string): string {
  // Deterministic pseudo-wallet so the same Privy identity always resolves to
  // the same address even before our store has seen them.
  let h1 = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h1 ^= seed.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  let out = "0x";
  let h = h1 >>> 0;
  for (let i = 0; i < 40; i++) {
    h = (Math.imul(h, 0x01000193) ^ (h >>> 7)) >>> 0;
    out += (h & 0xf).toString(16);
  }
  return out;
}

type Method = PrivyProfile["method"];

interface PrivyCtx {
  ready: boolean;
  authenticated: boolean;
  user: PrivyProfile | null;
  login: (input: { method: Method; identifier?: string }) => PrivyProfile;
  logout: () => void;
}

const Ctx = createContext<PrivyCtx | null>(null);

export function PrivyProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PrivyProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as PrivyProfile);
    } catch {
      // ignore corrupted data
    }
    setReady(true);
  }, []);

  const login = useCallback(({ method, identifier }: { method: Method; identifier?: string }) => {
    const ident =
      identifier?.trim() ||
      (method === "email"
        ? `user-${Math.random().toString(36).slice(2, 7)}@demo.privy`
        : method === "phone"
          ? `+1-555-${Math.floor(1000 + Math.random() * 9000)}`
          : method === "wallet"
            ? fakeWallet()
            : `google-${Math.random().toString(36).slice(2, 9)}`);

    const privyUserId = `did:privy:${method}:${ident.toLowerCase()}`;
    const walletAddress =
      method === "wallet" && ident.startsWith("0x") ? ident : deriveStableWallet(privyUserId);

    const profile: PrivyProfile = {
      privyUserId,
      method,
      walletAddress,
      email: method === "email" ? ident : method === "google" ? `${ident}@gmail.com` : undefined,
      phone: method === "phone" ? ident : undefined,
      displayName:
        method === "email"
          ? ident.split("@")[0]
          : method === "google"
            ? ident
            : method === "phone"
              ? ident
              : `Wallet ${ident.slice(0, 6)}`,
    };

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setUser(null);
  }, []);

  const value = useMemo<PrivyCtx>(
    () => ({ ready, authenticated: !!user, user, login, logout }),
    [ready, user, login, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePrivy(): PrivyCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePrivy must be used within <PrivyProvider>");
  return ctx;
}