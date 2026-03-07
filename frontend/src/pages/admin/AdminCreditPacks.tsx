import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react";

import {
  adminCreateCreditPack,
  adminDeleteCreditPack,
  adminFetchCreditPacks,
  adminUpdateCreditPack,
  type AdminCreditPack,
} from "@/api/adminCreditPacks";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { formatArs } from "@/components/admin/adminFormatters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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

function calculateFinalPrice(basePrice: string, discount: string) {
  const parsedBase = Number(basePrice || 0);
  const parsedDiscount = Number(discount || 0);

  if (!Number.isFinite(parsedBase) || parsedBase <= 0) return 0;
  if (!Number.isFinite(parsedDiscount) || parsedDiscount <= 0) return parsedBase;
  return Math.round(parsedBase * (100 - parsedDiscount)) / 100;
}

export default function AdminCreditPacks() {
  const { toast } = useToast();
  const [packs, setPacks] = useState<AdminCreditPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackId, setEditingPackId] = useState<number | null>(null);
  const [packToDelete, setPackToDelete] = useState<AdminCreditPack | null>(null);
  const [form, setForm] = useState<PackForm>(emptyPackForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadPacks = async () => {
    try {
      setLoading(true);
      const response = await adminFetchCreditPacks();
      setPacks(response.resultados);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar los packs";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPacks();
  }, []);

  const activeCount = useMemo(() => packs.filter((pack) => pack.active).length, [packs]);
  const maxDiscount = useMemo(() => Math.max(0, ...packs.map((pack) => Number(pack.discount_percent || 0))), [packs]);
  const averageFinalPrice = useMemo(() => {
    if (!packs.length) return 0;
    const total = packs.reduce((sum, pack) => sum + Number(pack.price_ars || 0), 0);
    return total / packs.length;
  }, [packs]);
  const totalCredits = useMemo(() => packs.reduce((sum, pack) => sum + Number(pack.credits || 0), 0), [packs]);

  const finalPricePreview = useMemo(
    () => calculateFinalPrice(form.base_price_ars, form.discount_percent),
    [form.base_price_ars, form.discount_percent],
  );

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingPackId(null);
    setForm(emptyPackForm);
  };

  const openCreate = () => {
    setEditingPackId(null);
    setForm(emptyPackForm);
    setDialogOpen(true);
  };

  const openEdit = (pack: AdminCreditPack) => {
    setEditingPackId(pack.id);
    setForm(toPackForm(pack));
    setDialogOpen(true);
  };

  const validateForm = () => {
    const credits = Number(form.credits);
    const basePrice = Number(form.base_price_ars);
    const discountPercent = Number(form.discount_percent);

    if (!form.name.trim()) return "El nombre del pack es obligatorio.";
    if (!Number.isInteger(credits) || credits <= 0) return "Los creditos deben ser un entero mayor a 0.";
    if (!Number.isFinite(basePrice) || basePrice <= 0) return "El precio base debe ser mayor a 0.";
    if (!Number.isInteger(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      return "El descuento debe estar entre 0 y 100.";
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      toast({ title: "Datos invalidos", description: validationError, variant: "destructive" });
      return;
    }

    const payload = {
      name: form.name.trim(),
      credits: Number(form.credits),
      base_price_ars: form.base_price_ars.trim(),
      discount_percent: Number(form.discount_percent),
      mp_title: form.mp_title.trim(),
      mp_description: form.mp_description.trim(),
      active: form.active,
    };

    try {
      setSaving(true);
      if (editingPackId) {
        await adminUpdateCreditPack(editingPackId, payload);
        toast({ title: "Pack actualizado", description: "Los cambios se guardaron correctamente." });
      } else {
        await adminCreateCreditPack(payload);
        toast({ title: "Pack creado", description: "El nuevo pack ya esta disponible." });
      }
      resetDialog();
      await loadPacks();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar el pack";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!packToDelete) return;
    try {
      setDeleting(true);
      await adminDeleteCreditPack(packToDelete.id);
      toast({ title: "Pack eliminado", description: "El pack se elimino correctamente." });
      setPackToDelete(null);
      await loadPacks();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar el pack";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminLayout
      title="Superadmin · Packs"
      description="Gestion centralizada de precios, descuentos y datos de checkout para cada pack de creditos."
      actions={
        <>
          <Button variant="outline" onClick={() => void loadPacks()} disabled={loading}>
            <RefreshCcw className="h-4 w-4" />
            {loading ? "Actualizando..." : "Actualizar"}
          </Button>
          <Button variant="glow" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nuevo pack
          </Button>
        </>
      }
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard label="Packs cargados" value={packs.length} />
        <AdminStatCard label="Packs activos" value={activeCount} />
        <AdminStatCard label="Descuento maximo" value={`${maxDiscount}%`} />
        <AdminStatCard label="Precio final promedio" value={formatArs(averageFinalPrice)} hint={`${totalCredits} creditos sumados en catalogo`} />
      </section>

      <section className="glass-card space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Listado de packs</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tabla operativa para editar rapido sin repetir formularios gigantes por cada pack.
            </p>
          </div>
          <Badge variant="outline" className="border-primary/15 bg-primary/10 text-primary">
            {activeCount} activos / {packs.length} total
          </Badge>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando packs...</p>
        ) : packs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay packs cargados.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">Pack</th>
                  <th className="py-2 pr-3">Creditos</th>
                  <th className="py-2 pr-3">Base</th>
                  <th className="py-2 pr-3">Desc.</th>
                  <th className="py-2 pr-3">Final</th>
                  <th className="py-2 pr-3">Checkout</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {packs.map((pack) => (
                  <tr key={pack.id} className="border-t border-border/70 align-top">
                    <td className="py-3 pr-3">
                      <p className="font-medium text-foreground">{pack.name}</p>
                      <p className="text-xs text-muted-foreground">#{pack.id}</p>
                    </td>
                    <td className="py-3 pr-3">{pack.credits}</td>
                    <td className="py-3 pr-3">{formatArs(pack.base_price_ars)}</td>
                    <td className="py-3 pr-3">{pack.discount_percent}%</td>
                    <td className="py-3 pr-3 font-medium text-primary">{formatArs(pack.price_ars)}</td>
                    <td className="py-3 pr-3">
                      <p>{pack.mp_title || "-"}</p>
                      <p className="text-xs text-muted-foreground">{pack.mp_description || "Sin descripcion"}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <Badge
                        variant="outline"
                        className={pack.active ? "border-primary/20 bg-primary/10 text-primary" : "border-border bg-background/60 text-muted-foreground"}
                      >
                        {pack.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(pack)}>
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setPackToDelete(pack)}>
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={(open) => (!open ? resetDialog() : setDialogOpen(true))}>
        <DialogContent className="max-w-3xl border-primary/15 bg-card/95">
          <DialogHeader>
            <DialogTitle>{editingPackId ? "Editar pack" : "Nuevo pack"}</DialogTitle>
            <DialogDescription>
              Define creditos, precio base, descuento y datos visibles para el checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-[1.6fr,0.9fr]">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">Nombre del pack</label>
                <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">Creditos</label>
                <Input type="number" min={1} value={form.credits} onChange={(event) => setForm((prev) => ({ ...prev, credits: event.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">Precio base ARS</label>
                <Input type="number" min={1} step="0.01" value={form.base_price_ars} onChange={(event) => setForm((prev) => ({ ...prev, base_price_ars: event.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">Descuento %</label>
                <Input type="number" min={0} max={100} value={form.discount_percent} onChange={(event) => setForm((prev) => ({ ...prev, discount_percent: event.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">Titulo Mercado Pago</label>
                <Input value={form.mp_title} onChange={(event) => setForm((prev) => ({ ...prev, mp_title: event.target.value }))} />
              </div>
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">Estado</label>
                <label className="flex h-10 items-center gap-3 rounded-xl border border-border bg-background/60 px-4 text-sm text-foreground">
                  <input type="checkbox" checked={form.active} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} />
                  Pack activo
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-xs uppercase tracking-[0.18em] text-muted-foreground">Descripcion Mercado Pago</label>
                <Textarea className="min-h-[120px]" value={form.mp_description} onChange={(event) => setForm((prev) => ({ ...prev, mp_description: event.target.value }))} />
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-primary/15 bg-background/50 p-5">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Vista rapida</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{form.name || "Pack sin nombre"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{form.credits || 0} creditos para el cliente.</p>
              </div>

              <div className="rounded-2xl border border-primary/15 bg-card/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Precio final estimado</p>
                <p className="mt-2 text-3xl font-bold text-primary">{formatArs(finalPricePreview)}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Base {formatArs(form.base_price_ars || 0)} con {form.discount_percent || 0}% de descuento.
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
                <p>Titulo checkout: {form.mp_title || "-"}</p>
                <p className="mt-2">Estado: {form.active ? "Activo" : "Inactivo"}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetDialog} disabled={saving}>Cancelar</Button>
            <Button variant="glow" onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? "Guardando..." : editingPackId ? "Guardar cambios" : "Crear pack"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(packToDelete)} onOpenChange={(open) => (!open ? setPackToDelete(null) : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar pack</AlertDialogTitle>
            <AlertDialogDescription>
              {packToDelete
                ? `Vas a eliminar ${packToDelete.name}. Esta accion impacta en la configuracion comercial y no se puede deshacer.`
                : "Esta accion no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar pack"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
