// src/components/PurchaseFlowModal.tsx
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Game } from "@/types";
import { createGameContract } from "@/api/contracts";
import { useAuth } from "@/context/AuthContext";

type Props = {
  game: Game | null;
  open: boolean;
  onClose: () => void;
  onPurchased?: () => void;
};

export function PurchaseFlowModal({ game, open, onClose, onPurchased }: Props) {
  const { toast } = useToast();
  const { refreshWalletBalance } = useAuth();
  const [step, setStep] = useState<"dates" | "confirm" | "loading" | "success">("dates");
  const [eventDates, setEventDates] = useState<string[]>([""]);
  const [result, setResult] = useState<{ saldo_restante: number } | null>(null);

  const todayIso = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  const normalizedDates = useMemo(
    () => eventDates.map((value) => value.trim()).filter(Boolean),
    [eventDates],
  );
  const uniqueDates = useMemo(
    () => Array.from(new Set(normalizedDates)).sort(),
    [normalizedDates],
  );
  const hasDuplicates = normalizedDates.length !== uniqueDates.length;
  const hasPastDates = uniqueDates.some((value) => value < todayIso);
  const canContinue = uniqueDates.length > 0 && !hasPastDates;

  const reset = () => {
    setStep("dates");
    setEventDates([""]);
    setResult(null);
  };

  const closeAll = () => {
    reset();
    onClose();
  };

  const submitPurchase = async () => {
    if (!game) return;
    try {
      setStep("loading");
      const response = await createGameContract({
        slug: game.id,
        fechas_evento: uniqueDates,
      });
      setResult({ saldo_restante: response.saldo_restante });
      await refreshWalletBalance();
      setStep("success");
      onPurchased?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error inesperado";
      if (message.includes("saldo_insuficiente") || message.includes("HTTP 402")) {
        toast({
          title: "Saldo insuficiente",
          description: "Necesitás comprar créditos para contratar este juego.",
          variant: "destructive",
        });
        closeAll();
        window.location.href = "/buy-credits";
        return;
      }
      setStep("confirm");
      toast({
        title: "No se pudo contratar",
        description: message,
        variant: "destructive",
      });
    }
  };

  const updateDateAt = (index: number, value: string) => {
    setEventDates((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const addDateField = () => {
    setEventDates((prev) => [...prev, ""]);
  };

  const removeDateField = (index: number) => {
    setEventDates((prev) => {
      if (prev.length <= 1) return [""];
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? closeAll() : null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{game ? `Contratar: ${game.name}` : "Contratar"}</DialogTitle>
        </DialogHeader>

        {step === "dates" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Elegí una o más fechas exactas en las que se va a jugar en el evento.
            </p>

            <div className="space-y-3">
              {eventDates.map((eventDate, index) => (
                <div className="space-y-2" key={`event-date-${index}`}>
                  <label className="text-sm">
                    Fecha del evento {eventDates.length > 1 ? `#${index + 1}` : ""}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      min={todayIso}
                      value={eventDate}
                      onChange={(e) => updateDateAt(index, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeDateField(index)}
                      disabled={eventDates.length === 1}
                    >
                      Quitar
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="glass" onClick={addDateField}>
                Agregar otra fecha
              </Button>
            </div>

            {hasDuplicates && (
              <p className="text-xs text-amber-300">
                Fechas repetidas: se van a tomar una sola vez.
              </p>
            )}
            {hasPastDates && (
              <p className="text-xs text-red-400">
                No se permiten fechas pasadas.
              </p>
            )}
            {uniqueDates.length > 0 && (
              <div className="rounded-md border p-3 text-xs text-muted-foreground">
                Fechas seleccionadas: {uniqueDates.join(" · ")}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={closeAll}>
                Cancelar
              </Button>
              <Button variant="glow" disabled={!canContinue} onClick={() => setStep("confirm")}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <p className="text-sm">
              Vas a contratar <b>{game?.name}</b> para {uniqueDates.length} fecha{uniqueDates.length === 1 ? "" : "s"}:
            </p>
            <div className="rounded-md border p-3 text-sm">
              {uniqueDates.join(" · ")}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setStep("dates")}>
                Atrás
              </Button>
              <Button variant="glow" onClick={submitPurchase}>
                Confirmar contratación
              </Button>
            </div>
          </div>
        )}

        {step === "loading" && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Procesando contratación...
          </div>
        )}

        {step === "success" && (
          <div className="space-y-4">
            <div className="text-sm">Contratacion realizada correctamente.</div>
            <div className="rounded-lg border p-3 text-sm">
              Saldo restante: <b>{result?.saldo_restante ?? 0}</b> creditos.
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="glow" onClick={closeAll}>
                Listo
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
