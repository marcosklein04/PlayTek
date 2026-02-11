import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { useToast } from "@/hooks/use-toast";
import { adminFetchCreditPacks, adminUpdateCreditPack, AdminCreditPack } from "@/api/adminCreditPacks";


export default function AdminCreditPacks() {
  const { toast } = useToast();
  const [packs, setPacks] = useState<AdminCreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<number, { price_ars: string; active: boolean }>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await adminFetchCreditPacks();
        setPacks(res.resultados);
        setEditing(
          Object.fromEntries(
            res.resultados.map((p) => [p.id, { price_ars: p.price_ars, active: p.active }])
          )
        );
      } catch (e: any) {
        toast({
          title: "Error cargando packs (admin)",
          description: e.message || "Error",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [toast]);

    const handleSave = async (packId: number) => {
      try {
        setSavingId(packId);
        const form = editing[packId];
        if (!form) return;

        const raw = (form.price_ars || "").trim();
        const n = Number(raw);

        if (!raw || Number.isNaN(n) || n <= 0) {
          toast({
            title: "Precio inválido",
            description: "Ingresá un número mayor a 0 (ej: 12000 o 12000.00).",
            variant: "destructive",
          });
          return; // 👈 no hace falta setSavingId(null) porque lo hace el finally
        }

        await adminUpdateCreditPack(packId, {
          price_ars: raw,
          active: form.active,
        });

        const res = await adminFetchCreditPacks();
        setPacks(res.resultados);
        setEditing(
          Object.fromEntries(
            res.resultados.map((p) => [p.id, { price_ars: p.price_ars, active: p.active }])
          )
        );

        toast({ title: "Guardado", description: "Pack actualizado correctamente." });
      } catch (e: any) {
        toast({
          title: "Error guardando",
          description: e.message || "Error",
          variant: "destructive",
        });
      } finally {
        setSavingId(null);
      }
    };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8">
        <h1 className="text-3xl font-display font-bold text-foreground">Admin · Credit Packs</h1>

        {loading && <p className="text-sm text-muted-foreground mt-6">Cargando...</p>}

        {!loading && (
          <div className="mt-8 space-y-3">
            {packs.map((p) => (
             /*<div key={p.id} className="glass-card p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {p.credits} créditos · ${Number(p.price_ars).toLocaleString("es-AR")} ARS · {p.active ? "Activo" : "Inactivo"}
                  </div>
                </div>
              </div>*/

              <div key={p.id} className="glass-card p-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="text-sm text-muted-foreground">{p.credits} créditos</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="text-sm flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editing[p.id]?.active ?? p.active}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [p.id]: {
                                ...(prev[p.id] ?? { price_ars: p.price_ars, active: p.active }),
                                active: e.target.checked,
                              },
                            }))
                          }
                        />
                        Activo
                      </label>

                      <input
                        className="h-9 w-32 rounded-md border bg-background px-3 text-sm"
                        value={editing[p.id]?.price_ars ?? p.price_ars}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            [p.id]: {
                              ...(prev[p.id] ?? { price_ars: p.price_ars, active: p.active }),
                              price_ars: e.target.value,
                            },
                          }))
                        }
                        placeholder="price_ars"
                      />

                      <button
                        className="h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-60"
                        disabled={savingId === p.id}
                        onClick={() => handleSave(p.id)}
                      >
                        {savingId === p.id ? "Guardando..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                ))}
          </div>
        )}
      </main>
    </div>
  );
}