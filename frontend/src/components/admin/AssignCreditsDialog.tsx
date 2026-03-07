import { useEffect, useMemo, useState } from "react";

import { assignClientCredits, type SuperadminOverviewResponse } from "@/api/adminOverview";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { formatCredits } from "@/components/admin/adminFormatters";

export function AssignCreditsDialog({
  open,
  onOpenChange,
  clients,
  initialClientId,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: SuperadminOverviewResponse["clients"];
  initialClientId?: number | null;
  onAssigned?: () => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setClientId(initialClientId ? String(initialClientId) : "");
    setAmount("");
    setReason("");
  }, [initialClientId, open]);

  const selectedClient = useMemo(
    () => clients.find((client) => String(client.user_id) === clientId) ?? null,
    [clientId, clients],
  );

  const handleSubmit = async () => {
    const parsedClientId = Number(clientId);
    const parsedAmount = Number(amount);

    if (!Number.isInteger(parsedClientId) || parsedClientId <= 0) {
      toast({
        title: "Cliente invalido",
        description: "Selecciona un cliente antes de acreditar creditos.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: "Cantidad invalida",
        description: "Ingresa una cantidad entera de creditos mayor a 0.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const response = await assignClientCredits(parsedClientId, {
        amount: parsedAmount,
        reason: reason.trim() || undefined,
      });
      toast({
        title: "Creditos acreditados",
        description: `${response.amount} creditos acreditados a ${response.username}. Nuevo saldo: ${response.new_balance}.`,
      });
      onOpenChange(false);
      await Promise.resolve(onAssigned?.());
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron acreditar los creditos";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-primary/15 bg-card/95">
        <DialogHeader>
          <DialogTitle>Acreditar creditos</DialogTitle>
          <DialogDescription>
            Ajuste manual para soporte comercial, compensaciones o correcciones de saldo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Cliente
            </label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
            >
              <option value="">Seleccionar cliente</option>
              {clients.map((client) => (
                <option key={client.user_id} value={client.user_id}>
                  {client.username} {client.company ? `· ${client.company}` : ""}
                </option>
              ))}
            </select>
          </div>

          {selectedClient ? (
            <div className="rounded-2xl border border-primary/15 bg-background/60 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{selectedClient.username}</p>
              <p>{selectedClient.email || "Sin email"}</p>
              <p>{selectedClient.company || "Sin empresa"}</p>
              <p className="mt-2 text-primary">Saldo actual: {formatCredits(selectedClient.wallet_balance)}</p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Cantidad de creditos
              </label>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="Ej: 50"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Referencia del ajuste
              </label>
              <p className="rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
                Este texto queda guardado como referencia administrativa.
              </p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Nota interna
            </label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Deja una referencia para poder auditar el ajuste despues."
              className="min-h-[96px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="glow" onClick={handleSubmit} disabled={saving}>
            {saving ? "Acreditando..." : "Confirmar acreditacion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
