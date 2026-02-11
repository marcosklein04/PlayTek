import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchCreditPacks, createWalletCheckout, CreditPack } from "@/api/wallet";
import { useSearchParams } from "react-router-dom";

export default function BuyCredits() {
  const { toast } = useToast();
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

        const token = localStorage.getItem("access_token") || "";
        const res = await fetch(
          `http://127.0.0.1:8000/api/me/wallet/topups/${topupId}/status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        const data = await res.json();
        if (cancelled) return;

        if (data.credited) {
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
  }, [searchParams, toast]);

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {packs.map((p) => (
            <div key={p.id} className="glass-card p-6">
              <div className="text-xl font-semibold">{p.name}</div>
              <div className="text-sm text-muted-foreground mt-1">{p.credits} créditos</div>

              <div className="text-3xl font-bold mt-4">
                ${Number(p.price_ars).toLocaleString("es-AR")} ARS
              </div>

              {p.mp_description && (
                <div className="text-sm text-muted-foreground mt-2">{p.mp_description}</div>
              )}

              <Button
                className="w-full mt-6"
                variant="glow"
                disabled={payingId === p.id}
                onClick={() => handleBuy(p)}
              >
                {payingId === p.id ? "Redirigiendo..." : "Comprar"}
              </Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}