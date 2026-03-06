import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchCreditPacks, createWalletCheckout, CreditPack } from "@/api/wallet";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/api/client";

function formatArs(value: number) {
  return `$${value.toLocaleString("es-AR")}`;
}

export default function BuyCredits() {
  const { toast } = useToast();
  const { refreshWalletBalance } = useAuth();
  const [packs, setPacks] = useState<CreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [searchParams] = useSearchParams();

  // 1) cargar packs
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetchCreditPacks();
        setPacks(res.resultados);
      } catch (e: any) {
        toast({ title: "Error cargando packs", description: e.message || "Error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

  // 2) si volvés del checkout (?status=...&topup_id=...), hacer polling del estado
  useEffect(() => {
    const status = searchParams.get("status");
    const topupId = searchParams.get("topup_id");

    if (!status || !topupId) return;

    if (status === "failure") {
      toast({ title: "Pago rechazado", description: "Intentá nuevamente." });
      window.history.replaceState({}, "", "/buy-credits");
      return;
    }

    let cancelled = false;
    let tries = 0;

    const poll = async () => {
      try {
        tries += 1;

        const data = await apiFetch<{
          credited: boolean;
          status: string;
        }>(
          `/api/me/wallet/topups/${topupId}/status`,
          { method: "GET" }
        );
        if (cancelled) return;

        if (data.credited) {
          await refreshWalletBalance();
          toast({ title: "✅ Créditos acreditados", description: "Saldo actualizado." });
          window.history.replaceState({}, "", "/buy-credits");
          return;
        }

        if (tries < 30) setTimeout(poll, 2000);
        else toast({ title: "⏳ Sigue pendiente", description: "Refrescá en unos segundos." });
      } catch {
        if (tries < 30) setTimeout(poll, 2000);
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [searchParams, toast, refreshWalletBalance]);

  // 3) iniciar checkout
  const handleBuy = async (pack: CreditPack) => {
    try {
      setPayingId(pack.id);

      const res = await createWalletCheckout(pack.id);

      if (!res.ok || !res.checkout_url) {
        throw new Error(res.error || "No se pudo iniciar el checkout");
      }

      window.location.href = res.checkout_url;
    } catch (e: any) {
      toast({
        title: "No se pudo iniciar el checkout",
        description: e.message || "Error inesperado",
      });
    } finally {
      setPayingId(null);
    }
  };

  const sortedPacks = [...packs].sort((a, b) => a.credits - b.credits);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Comprar créditos</h1>
        <p className="text-muted-foreground mt-1">Elegí un pack para cargar saldo</p>

        {loading && <p className="text-sm text-muted-foreground mt-6">Cargando packs...</p>}

        {!loading && packs.length === 0 && (
          <p className="text-sm text-muted-foreground mt-6">
            No hay packs disponibles. Cargalos desde el Admin (Credit Packs).
          </p>
        )}

        {!loading && packs.length > 0 && (
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {sortedPacks.map((p) => {
              const finalPrice = Number(p.price_ars);
              const basePrice = Number(p.base_price_ars || p.price_ars);
              const discountPercent = Number(p.discount_percent || 0);

              return (
                <div
                  key={p.id}
                  className="glass-card group relative overflow-hidden rounded-[28px] border border-primary/15 bg-card/60 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
                >
                  <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">
                        Pack de créditos
                      </p>
                      <h2 className="mt-2 text-4xl font-display font-bold text-foreground">
                        {p.credits}
                      </h2>
                    </div>
                    <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      {discountPercent}% OFF
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Precio base</span>
                      <span className={discountPercent > 0 ? "line-through opacity-70" : ""}>
                        {formatArs(basePrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Descuento</span>
                      <span>{discountPercent}%</span>
                    </div>
                    <div className="rounded-2xl border border-primary/10 bg-background/60 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                        Precio final ARS
                      </p>
                      <p className="mt-2 text-3xl font-bold gradient-text">
                        {formatArs(finalPrice)}
                      </p>
                    </div>
                  </div>

                  <Button
                    className="mt-6 w-full"
                    variant="glow"
                    disabled={payingId === p.id}
                    onClick={() => handleBuy(p)}
                  >
                    {payingId === p.id ? "Redirigiendo..." : "Comprar"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
