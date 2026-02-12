// src/components/PurchaseFlowModal.tsx
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Game } from "@/types";
import { createGameContract } from "@/api/contracts";

type Props = {
  game: Game | null;
  open: boolean;
  onClose: () => void;
  onPurchased?: () => void;
};

export function PurchaseFlowModal({ game, open, onClose, onPurchased }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<"dates" | "confirm" | "loading" | "success">("dates");
  const [eventDate, setEventDate] = useState("");
  const [result, setResult] = useState<{ saldo_restante: number } | null>(null);

  const canContinue = useMemo(() => !!eventDate, [eventDate]);

  const reset = () => {
    setStep("dates");
    setEventDate("");
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
        fecha_evento: eventDate,
        fecha_inicio: eventDate,
        fecha_fin: eventDate,
      });
      setResult({ saldo_restante: response.saldo_restante });
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

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? closeAll() : null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{game ? `Contratar: ${game.name}` : "Contratar"}</DialogTitle>
        </DialogHeader>

        {step === "dates" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Elegí la fecha exacta en la que se va a jugar en el evento.
            </p>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <label className="text-sm">Fecha del evento</label>
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
              </div>
            </div>

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
            <p className="text-sm">Vas a contratar <b>{game?.name}</b> para el día <b>{eventDate}</b>.</p>
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
