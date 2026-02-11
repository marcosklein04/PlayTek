import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AdminCreditPack,
  adminCreateCreditPack,
  adminDeleteCreditPack,
  adminFetchCreditPacks,
  adminUpdateCreditPack,
} from "@/api/adminCreditPacks";

type FormState = {
  id?: number;
  name: string;
  credits: string;
  price_ars: string;
  mp_title: string;
  mp_description: string;
  active: boolean;
};

const emptyForm: FormState = {
  name: "",
  credits: "100",
  price_ars: "5000",
  mp_title: "",
  mp_description: "",
  active: true,
};

export default function AdminCreditPacks() {
  const { toast } = useToast();
  const [packs, setPacks] = useState<AdminCreditPack[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const isEdit = useMemo(() => !!form.id, [form.id]);

  async function reload() {
    setLoading(true);
    try {
      const res = await adminFetchCreditPacks();
      setPacks(res.resultados);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo cargar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  function openCreate() {
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(p: AdminCreditPack) {
    setForm({
      id: p.id,
      name: p.name,
      credits: String(p.credits),
      price_ars: String(p.price_ars),
      mp_title: p.mp_title || "",
      mp_description: p.mp_description || "",
      active: !!p.active,
    });
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        credits: Number(form.credits),
        price_ars: form.price_ars,
        mp_title: form.mp_title,
        mp_description: form.mp_description,
        active: form.active,
      };

      if (!payload.name) throw new Error("name_requerido");
      if (!Number.isFinite(payload.credits) || payload.credits <= 0) throw new Error("credits_invalido");

      if (isEdit && form.id) {
        await adminUpdateCreditPack(form.id, payload);
        toast({ title: "OK", description: "Pack actualizado" });
      } else {
        await adminCreateCreditPack(payload);
        toast({ title: "OK", description: "Pack creado" });
      }

      setOpen(false);
      await reload();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("¿Eliminar pack?")) return;
    try {
      await adminDeleteCreditPack(id);
      toast({ title: "OK", description: "Pack eliminado" });
      await reload();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "No se pudo eliminar", variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Admin · Credit Packs</h1>
            <p className="text-muted-foreground mt-1">Crear/editar packs de créditos</p>
          </div>
          <Button variant="glow" onClick={openCreate}>Nuevo pack</Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground mt-6">Cargando...</p>
        ) : (
          <div className="mt-6 glass-card p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr className="text-left">
                  <th className="py-2">ID</th>
                  <th className="py-2">Nombre</th>
                  <th className="py-2">Créditos</th>
                  <th className="py-2">Precio (ARS)</th>
                  <th className="py-2">Activo</th>
                  <th className="py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {packs.map((p) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="py-2">{p.id}</td>
                    <td className="py-2">{p.name}</td>
                    <td className="py-2">{p.credits}</td>
                    <td className="py-2">${Number(p.price_ars).toLocaleString("es-AR")}</td>
                    <td className="py-2">{p.active ? "Sí" : "No"}</td>
                    <td className="py-2 text-right space-x-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>Editar</Button>
                      <Button size="sm" variant="destructive" onClick={() => remove(p.id)}>Borrar</Button>
                    </td>
                  </tr>
                ))}
                {packs.length === 0 && (
                  <tr>
                    <td className="py-4 text-muted-foreground" colSpan={6}>
                      No hay packs cargados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal simple */}
        {open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="glass-card w-full max-w-lg p-6">
              <h2 className="text-xl font-semibold">{isEdit ? "Editar pack" : "Nuevo pack"}</h2>

              <div className="grid grid-cols-1 gap-3 mt-4">
                <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))} />
                <Input placeholder="Créditos" value={form.credits} onChange={(e) => setForm(s => ({ ...s, credits: e.target.value }))} />
                <Input placeholder="Precio ARS" value={form.price_ars} onChange={(e) => setForm(s => ({ ...s, price_ars: e.target.value }))} />
                <Input placeholder="MP Title (opcional)" value={form.mp_title} onChange={(e) => setForm(s => ({ ...s, mp_title: e.target.value }))} />
                <Input placeholder="MP Description (opcional)" value={form.mp_description} onChange={(e) => setForm(s => ({ ...s, mp_description: e.target.value }))} />

                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm(s => ({ ...s, active: e.target.checked }))}
                  />
                  Activo
                </label>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
                <Button variant="glow" onClick={save} disabled={saving}>
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}