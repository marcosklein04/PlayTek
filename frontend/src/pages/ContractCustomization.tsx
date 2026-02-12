import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  TriviaCustomization,
  fetchContractCustomization,
  saveContractCustomization,
  startContractEvent,
  startContractPreview,
} from "@/api/contracts";

export default function ContractCustomization() {
  const { id } = useParams<{ id: string }>();
  const contractId = Number(id);
  const validId = Number.isFinite(contractId) && contractId > 0;
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [gameSlug, setGameSlug] = useState("");
  const [config, setConfig] = useState<TriviaCustomization | null>(null);

  const disabled = useMemo(() => !config || saving || starting, [config, saving, starting]);
  const watermarkOpacityLabel = useMemo(() => {
    if (!config) return "0.00";
    const value = Number(config.watermark.opacity || 0);
    return Number.isFinite(value) ? value.toFixed(2) : "0.00";
  }, [config]);

  useEffect(() => {
    if (!validId) {
      toast({ title: "Contrato invalido", description: "No se pudo abrir la customizacion.", variant: "destructive" });
      navigate("/my-contracts", { replace: true });
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const res = await fetchContractCustomization(contractId);
        setGameSlug(res.game_slug);
        setConfig(res.config);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Error cargando customizacion";
        toast({ title: "Error", description: message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [contractId, validId, navigate, toast]);

  const updateField = (path: string[], value: string | number | boolean) => {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = structuredClone(prev);
      let cursor: any = next;
      for (let i = 0; i < path.length - 1; i += 1) {
        cursor = cursor[path[i]];
      }
      cursor[path[path.length - 1]] = value;
      return next;
    });
  };

  const handleSave = async () => {
    if (!config || !validId) return;
    try {
      setSaving(true);
      await saveContractCustomization(contractId, config);
      toast({ title: "Guardado", description: "La customizacion quedo lista para el evento." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo guardar";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!validId) return;
    try {
      setStarting(true);
      const res = await startContractPreview(contractId);
      window.location.href = res.juego.runner_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar preview";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const handleStartEvent = async () => {
    if (!validId) return;
    try {
      setStarting(true);
      const res = await startContractEvent(contractId);
      window.location.href = res.juego.runner_url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar evento";
      if (message.includes("fuera_de_fecha_evento")) {
        toast({
          title: "Fuera de fecha de evento",
          description: "Solo podes iniciar modo evento durante el rango contratado.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: message, variant: "destructive" });
      }
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 p-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-foreground">Customizacion</h1>
          <p className="text-muted-foreground mt-1">
            Contrato #{validId ? contractId : "-"} {gameSlug ? `· ${gameSlug}` : ""}
          </p>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Cargando configuracion...</p>}

        {!loading && config && (
          <div className="space-y-6">
            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold mb-4">Branding</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Color primario</label>
                  <Input
                    value={config.branding.primary_color}
                    onChange={(e) => updateField(["branding", "primary_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Color secundario</label>
                  <Input
                    value={config.branding.secondary_color}
                    onChange={(e) => updateField(["branding", "secondary_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Logo URL</label>
                  <Input
                    value={config.branding.logo_url}
                    onChange={(e) => updateField(["branding", "logo_url"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Background URL</label>
                  <Input
                    value={config.branding.background_url}
                    onChange={(e) => updateField(["branding", "background_url"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Imagen bienvenida URL</label>
                  <Input
                    value={config.branding.welcome_image_url}
                    onChange={(e) => updateField(["branding", "welcome_image_url"], e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">Texto de watermark (modo prueba)</label>
                  <Input
                    value={config.branding.watermark_text}
                    onChange={(e) => updateField(["branding", "watermark_text"], e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold mb-4">Textos</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Titulo de bienvenida</label>
                  <Input
                    value={config.texts.welcome_title}
                    onChange={(e) => updateField(["texts", "welcome_title"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Subtitulo</label>
                  <Input
                    value={config.texts.welcome_subtitle}
                    onChange={(e) => updateField(["texts", "welcome_subtitle"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Texto boton CTA</label>
                  <Input
                    value={config.texts.cta_button}
                    onChange={(e) => updateField(["texts", "cta_button"], e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold mb-4">Reglas de Trivia</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="text-sm">Mostrar timer</span>
                  <Switch
                    checked={config.rules.show_timer}
                    onCheckedChange={(checked) => updateField(["rules", "show_timer"], checked)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Segundos por pregunta</label>
                  <Input
                    type="number"
                    min={5}
                    value={config.rules.timer_seconds}
                    onChange={(e) => updateField(["rules", "timer_seconds"], Number(e.target.value || 0))}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Puntos por respuesta correcta</label>
                  <Input
                    type="number"
                    min={0}
                    value={config.rules.points_per_correct}
                    onChange={(e) => updateField(["rules", "points_per_correct"], Number(e.target.value || 0))}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Cantidad maxima de preguntas</label>
                  <Input
                    type="number"
                    min={1}
                    value={config.rules.max_questions}
                    onChange={(e) => updateField(["rules", "max_questions"], Number(e.target.value || 0))}
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="text-sm">Usar vidas</span>
                  <Switch
                    checked={config.rules.use_lives}
                    onCheckedChange={(checked) => updateField(["rules", "use_lives"], checked)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Cantidad de vidas</label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    disabled={!config.rules.use_lives}
                    value={config.rules.lives}
                    onChange={(e) => updateField(["rules", "lives"], Number(e.target.value || 0))}
                  />
                </div>
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold mb-4">Visual de Preguntas</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Fondo de pantalla</label>
                  <Input
                    type="color"
                    value={config.visual.screen_background_color}
                    onChange={(e) => updateField(["visual", "screen_background_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Fondo de pregunta</label>
                  <Input
                    type="color"
                    value={config.visual.question_bg_color}
                    onChange={(e) => updateField(["visual", "question_bg_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Borde de pregunta</label>
                  <Input
                    type="color"
                    value={config.visual.question_border_color}
                    onChange={(e) => updateField(["visual", "question_border_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Texto de pregunta</label>
                  <Input
                    type="color"
                    value={config.visual.question_text_color}
                    onChange={(e) => updateField(["visual", "question_text_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Fondo de opciones</label>
                  <Input
                    type="color"
                    value={config.visual.option_bg_color}
                    onChange={(e) => updateField(["visual", "option_bg_color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Borde de opciones</label>
                  <Input
                    type="color"
                    value={config.visual.option_border_color}
                    onChange={(e) => updateField(["visual", "option_border_color"], e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">Fuente de pregunta</label>
                  <Input
                    value={config.visual.question_font_family}
                    onChange={(e) => updateField(["visual", "question_font_family"], e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">Imagen fondo del contenedor URL</label>
                  <Input
                    value={config.visual.container_bg_image_url}
                    onChange={(e) => updateField(["visual", "container_bg_image_url"], e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="glass-card p-5">
              <h2 className="text-lg font-semibold mb-4">Watermark de Preview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <span className="text-sm">Mostrar watermark</span>
                  <Switch
                    checked={config.watermark.enabled}
                    onCheckedChange={(checked) => updateField(["watermark", "enabled"], checked)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Color</label>
                  <Input
                    type="color"
                    value={config.watermark.color}
                    onChange={(e) => updateField(["watermark", "color"], e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">
                    Opacidad ({watermarkOpacityLabel})
                  </label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.watermark.opacity}
                    onChange={(e) => updateField(["watermark", "opacity"], Number(e.target.value || 0))}
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Posicion</label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={config.watermark.position}
                    onChange={(e) => updateField(["watermark", "position"], e.target.value)}
                  >
                    <option value="top-left">Arriba izquierda</option>
                    <option value="top-right">Arriba derecha</option>
                    <option value="bottom-left">Abajo izquierda</option>
                    <option value="bottom-right">Abajo derecha</option>
                    <option value="center">Centro</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Tamano fuente</label>
                  <Input
                    type="number"
                    min={12}
                    max={200}
                    value={config.watermark.font_size}
                    onChange={(e) => updateField(["watermark", "font_size"], Number(e.target.value || 0))}
                  />
                </div>
              </div>
            </section>

            <div className="flex items-center justify-end gap-3">
              <Button variant="secondary" onClick={() => navigate("/my-contracts")}>
                Volver
              </Button>
              <Button variant="outline" disabled={disabled} onClick={handlePreview}>
                {starting ? "Abriendo..." : "Preview con watermark"}
              </Button>
              <Button variant="hero" disabled={disabled} onClick={handleStartEvent}>
                {starting ? "Abriendo..." : "Iniciar dia del evento"}
              </Button>
              <Button variant="glow" disabled={disabled} onClick={handleSave}>
                {saving ? "Guardando..." : "Guardar customizacion"}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
