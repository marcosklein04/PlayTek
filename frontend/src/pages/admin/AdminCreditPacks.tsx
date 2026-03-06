import { useEffect, useMemo, useState } from "react";

import {
  AdminCreditPack,
  adminCreateCreditPack,
  adminDeleteCreditPack,
  adminFetchCreditPacks,
  adminUpdateCreditPack,
} from "@/api/adminCreditPacks";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";


type PackForm = {
  name: string;
  credits: string;
  base_price_ars: string;
  discount_percent: string;
  mp_title: string;
  mp_description: string;
  active: boolean;
};


const emptyPackForm: PackForm = {
  name: "",
  credits: "",
  base_price_ars: "",
  discount_percent: "0",
  mp_title: "",
  mp_description: "",
  active: true,
};


function toPackForm(pack: AdminCreditPack): PackForm {
  return {
    name: pack.name,
    credits: String(pack.credits),
    base_price_ars: pack.base_price_ars,
    discount_percent: String(pack.discount_percent ?? 0),
    mp_title: pack.mp_title || "",
    mp_description: pack.mp_description || "",
    active: pack.active,
  };
}


function formatArs(value: number) {
  return `$${value.toLocaleString("es-AR")}`;
}


function calculateFinalPrice(basePrice: string, discount: string) {
  const parsedBase = Number(basePrice || 0);
  const parsedDiscount = Number(discount || 0);

  if (!Number.isFinite(parsedBase) || parsedBase <= 0) return 0;
  if (!Number.isFinite(parsedDiscount) || parsedDiscount < 0) return parsedBase;

  return Math.round(parsedBase * (100 - parsedDiscount)) / 100;
}


function PackEditor({
  title,
  description,
  form,
  saving,
  submitLabel,
  onChange,
  onSubmit,
  onDelete,
}: {
  title: string;
  description: string;
  form: PackForm;
  saving?: boolean;
  submitLabel: string;
  onChange: (patch: Partial<PackForm>) => void;
  onSubmit: () => void;
  onDelete?: () => void;
}) {
  const finalPrice = useMemo(
    () => calculateFinalPrice(form.base_price_ars, form.discount_percent),
    [form.base_price_ars, form.discount_percent],
  );

  return (
    <section className="glass-card rounded-[28px] border border-primary/10 p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="rounded-2xl border border-primary/15 bg-background/60 px-4 py-3 text-right">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Precio final
          </p>
          <p className="mt-2 text-2xl font-bold gradient-text">{formatArs(finalPrice)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Nombre del pack
          </label>
          <Input value={form.name} onChange={(e) => onChange({ name: e.target.value })} />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Créditos
          </label>
          <Input
            type="number"
            min={1}
            value={form.credits}
            onChange={(e) => onChange({ credits: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Precio base ARS
          </label>
          <Input
            type="number"
            min={1}
            step="0.01"
            value={form.base_price_ars}
            onChange={(e) => onChange({ base_price_ars: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Descuento %
          </label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.discount_percent}
            onChange={(e) => onChange({ discount_percent: e.target.value })}
          />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Título Mercado Pago
          </label>
          <Input value={form.mp_title} onChange={(e) => onChange({ mp_title: e.target.value })} />
        </div>

        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Estado
          </label>
          <label className="flex h-10 items-center gap-3 rounded-xl border border-border bg-background/60 px-4 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => onChange({ active: e.target.checked })}
            />
            Pack activo
          </label>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Descripción Mercado Pago
        </label>
        <textarea
          className="min-h-[92px] w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
          value={form.mp_description}
          onChange={(e) => onChange({ mp_description: e.target.value })}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="glow" disabled={saving} onClick={onSubmit}>
          {saving ? "Guardando..." : submitLabel}
        </Button>
        {onDelete ? (
          <Button variant="outline" disabled={saving} onClick={onDelete}>
            Eliminar pack
          </Button>
        ) : null}
      </div>
    </section>
  );
}


export default function AdminCreditPacks() {
  const { toast } = useToast();
  const [packs, setPacks] = useState<AdminCreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<number, PackForm>>({});
  const [newPack, setNewPack] = useState<PackForm>(emptyPackForm);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);

  const loadPacks = async () => {
    try {
      setLoading(true);
      const res = await adminFetchCreditPacks();
      setPacks(res.resultados);
      setEditing(
        Object.fromEntries(res.resultados.map((pack) => [pack.id, toPackForm(pack)])),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar los packs";
      toast({ title: "Error cargando packs", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPacks();
  }, []);

  const validateForm = (form: PackForm) => {
    const credits = Number(form.credits);
    const basePrice = Number(form.base_price_ars);
    const discountPercent = Number(form.discount_percent);

    if (!form.name.trim()) {
      return { ok: false as const, message: "El nombre del pack es obligatorio." };
    }
    if (!Number.isInteger(credits) || credits <= 0) {
      return { ok: false as const, message: "Los créditos deben ser un entero mayor a 0." };
    }
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      return { ok: false as const, message: "El precio base debe ser mayor a 0." };
    }
    if (!Number.isInteger(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      return { ok: false as const, message: "El descuento debe estar entre 0 y 100." };
    }

    return {
      ok: true as const,
      payload: {
        name: form.name.trim(),
        credits,
        base_price_ars: form.base_price_ars.trim(),
        discount_percent: discountPercent,
        mp_title: form.mp_title.trim(),
        mp_description: form.mp_description.trim(),
        active: form.active,
      },
    };
  };

  const handleCreate = async () => {
    const validation = validateForm(newPack);
    if (!validation.ok) {
      toast({ title: "Datos inválidos", description: validation.message, variant: "destructive" });
      return;
    }

    try {
      setSavingId("new");
      await adminCreateCreditPack(validation.payload);
      setNewPack(emptyPackForm);
      await loadPacks();
      toast({ title: "Pack creado", description: "El nuevo pack ya está disponible para editar." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear el pack";
      toast({ title: "Error creando pack", description: message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const handleSave = async (packId: number) => {
    const form = editing[packId];
    if (!form) return;

    const validation = validateForm(form);
    if (!validation.ok) {
      toast({ title: "Datos inválidos", description: validation.message, variant: "destructive" });
      return;
    }

    try {
      setSavingId(packId);
      await adminUpdateCreditPack(packId, validation.payload);
      await loadPacks();
      toast({ title: "Pack actualizado", description: "Los cambios se guardaron correctamente." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar el pack";
      toast({ title: "Error guardando", description: message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (packId: number) => {
    try {
      setSavingId(packId);
      await adminDeleteCreditPack(packId);
      await loadPacks();
      toast({ title: "Pack eliminado", description: "El pack se eliminó correctamente." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el pack";
      toast({ title: "Error eliminando", description: message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Superadmin · Packs de Créditos
          </h1>
          <p className="mt-1 text-muted-foreground">
            Creá packs nuevos, ajustá descuentos y definí el precio final que verá el cliente.
          </p>
        </div>

        <PackEditor
          title="Nuevo pack"
          description="Definí créditos, precio base, descuento y datos de checkout."
          form={newPack}
          saving={savingId === "new"}
          submitLabel="Crear pack"
          onChange={(patch) => setNewPack((prev) => ({ ...prev, ...patch }))}
          onSubmit={() => void handleCreate()}
        />

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando packs...</p>
        ) : (
          <div className="space-y-4">
            {packs.map((pack) => (
              <PackEditor
                key={pack.id}
                title={pack.name}
                description={`Pack #${pack.id} · ${pack.credits} créditos`}
                form={editing[pack.id] ?? toPackForm(pack)}
                saving={savingId === pack.id}
                submitLabel="Guardar cambios"
                onChange={(patch) =>
                  setEditing((prev) => ({
                    ...prev,
                    [pack.id]: { ...(prev[pack.id] ?? toPackForm(pack)), ...patch },
                  }))
                }
                onSubmit={() => void handleSave(pack.id)}
                onDelete={() => void handleDelete(pack.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
