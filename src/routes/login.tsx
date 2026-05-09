import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { toast } from "sonner";
import { Wallet, Store, User } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connect Wallet — ArcKhata" }] }),
  component: LoginPage,
});

function LoginPage() {
  const login = useStore((s) => s.login);
  const loginAsCustomerWallet = useStore((s) => s.loginAsCustomerWallet);
  const navigate = useNavigate();
  const [walletInput, setWalletInput] = useState("");
  const [shopName, setShopName] = useState("");

  const connectMerchant = (provider: string) => {
    login("merchant", shopName || "My Shop");
    toast.success(`Connected via ${provider}`, { description: "Welcome to your merchant dashboard." });
    navigate({ to: "/merchant" });
  };

  const connectCustomer = () => {
    if (!walletInput.startsWith("0x") || walletInput.length < 10) {
      toast.error("Enter the wallet your merchant assigned to you");
      return;
    }
    const u = loginAsCustomerWallet(walletInput.trim());
    if (!u) {
      toast.error("Wallet not found", { description: "Ask your merchant to add this wallet first." });
      return;
    }
    toast.success(`Welcome back, ${u.displayName}`);
    navigate({ to: "/customer" });
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-subtle)" }} />
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-20">
        <Card className="p-6 shadow-elegant">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">I'm a merchant</h2>
              <p className="text-xs text-muted-foreground">Manage customer ledgers</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="shop">Shop name (optional)</Label>
              <Input id="shop" placeholder="e.g. Sharma General Store" value={shopName} onChange={(e) => setShopName(e.target.value)} />
            </div>
            <Button onClick={() => connectMerchant("Privy Embedded")} className="w-full shadow-elegant" style={{ background: "var(--gradient-primary)" }}>
              <Wallet className="mr-2 h-4 w-4" /> Continue with Embedded Wallet
            </Button>
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" onClick={() => connectMerchant("MetaMask")}>MetaMask</Button>
              <Button variant="outline" size="sm" onClick={() => connectMerchant("WalletConnect")}>WalletConnect</Button>
              <Button variant="outline" size="sm" onClick={() => connectMerchant("Coinbase")}>Coinbase</Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 shadow-elegant">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl text-accent-foreground" style={{ background: "color-mix(in oklab, var(--accent) 80%, transparent)" }}>
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">I'm a customer</h2>
              <p className="text-xs text-muted-foreground">View dues & repay in USDC</p>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="wallet">Your wallet address</Label>
              <Input id="wallet" placeholder="0x…" value={walletInput} onChange={(e) => setWalletInput(e.target.value)} className="font-mono text-xs" />
              <p className="text-[11px] text-muted-foreground">Use the wallet address your merchant added for you.</p>
            </div>
            <Button onClick={connectCustomer} variant="outline" className="w-full">
              <Wallet className="mr-2 h-4 w-4" /> Connect & View Ledger
            </Button>
          </div>
        </Card>
      </div>
      <p className="pb-10 text-center text-xs text-muted-foreground">
        New here? <Link to="/" className="text-primary underline-offset-4 hover:underline">Read about ArcKhata</Link>
      </p>
    </div>
  );
}