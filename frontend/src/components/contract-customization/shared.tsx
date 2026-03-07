import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SectionCard({ title, description, action, children }: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="glass-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm text-muted-foreground">{label}</label>
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/30 p-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-md border border-border bg-transparent p-1"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-sm" />
      </div>
    </div>
  );
}

export function AssetUploadCard({
  title,
  description,
  imageUrl,
  uploading,
  onUpload,
  onDelete,
  imageFit = "cover",
}: {
  title: string;
  description: string;
  imageUrl: string;
  uploading: boolean;
  onUpload: (file?: File | null) => void;
  onDelete: () => void;
  imageFit?: "cover" | "contain";
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-background/20 p-4">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          onUpload(file);
          event.currentTarget.value = "";
        }}
      />
      <div className="h-28 overflow-hidden rounded-xl border border-border/70 bg-background/40">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className={`h-full w-full ${imageFit === "contain" ? "object-contain" : "object-cover"}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
            Sin archivo cargado.
          </div>
        )}
      </div>
      <Button size="sm" variant="outline" disabled={!imageUrl || uploading} onClick={onDelete}>
        {uploading ? "Procesando..." : "Eliminar"}
      </Button>
    </div>
  );
}
