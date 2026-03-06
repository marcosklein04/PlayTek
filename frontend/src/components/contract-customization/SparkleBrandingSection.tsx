import { ContractAssetKey, TriviaCustomization } from "@/api/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorField, SectionCard } from "@/components/contract-customization/shared";

type SparkleBrandingSectionProps = {
  config: TriviaCustomization;
  uploadingAsset: ContractAssetKey | null;
  onApplyPlayteckPalette: () => void;
  onUpdateField: (path: string[], value: string | number | boolean) => void;
  onUploadAsset: (assetKey: ContractAssetKey, file?: File | null) => void;
  onDeleteAsset: (assetKey: ContractAssetKey) => void;
};

type AssetCardProps = {
  title: string;
  description: string;
  imageUrl: string;
  uploading: boolean;
  onUpload: (file?: File | null) => void;
  onDelete: () => void;
  imageFit?: "cover" | "contain";
};

function AssetCard({ title, description, imageUrl, uploading, onUpload, onDelete, imageFit = "cover" }: AssetCardProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/20 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          onUpload(file);
          e.currentTarget.value = "";
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

export function SparkleBrandingSection({
  config,
  uploadingAsset,
  onApplyPlayteckPalette,
  onUpdateField,
  onUploadAsset,
  onDeleteAsset,
}: SparkleBrandingSectionProps) {
  return (
    <SectionCard
      title="Identidad visual"
      description="Definí la apariencia principal de la experiencia y cargá los assets del evento."
      action={
        <Button variant="secondary" size="sm" onClick={onApplyPlayteckPalette}>
          Aplicar paleta Playteck
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <ColorField
          label="Color principal"
          value={config.branding.primary_color}
          onChange={(value) => onUpdateField(["branding", "primary_color"], value)}
        />
        <ColorField
          label="Color secundario"
          value={config.branding.secondary_color}
          onChange={(value) => onUpdateField(["branding", "secondary_color"], value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AssetCard
          title="Logo"
          description="Se usa en la experiencia y en la vista previa."
          imageUrl={config.branding.logo_url}
          uploading={uploadingAsset === "logo"}
          imageFit="contain"
          onUpload={(file) => onUploadAsset("logo", file)}
          onDelete={() => onDeleteAsset("logo")}
        />
        <AssetCard
          title="Imagen de bienvenida"
          description="Aparece en la portada del juego."
          imageUrl={config.branding.welcome_image_url}
          uploading={uploadingAsset === "welcome_image"}
          onUpload={(file) => onUploadAsset("welcome_image", file)}
          onDelete={() => onDeleteAsset("welcome_image")}
        />
        <AssetCard
          title="Fondo general"
          description="Se aplica al fondo principal del runner."
          imageUrl={config.branding.background_url}
          uploading={uploadingAsset === "background"}
          onUpload={(file) => onUploadAsset("background", file)}
          onDelete={() => onDeleteAsset("background")}
        />
        <AssetCard
          title="Fondo de tarjeta"
          description="Opcional para reforzar el estilo de la pregunta."
          imageUrl={config.visual.container_bg_image_url}
          uploading={uploadingAsset === "container_background"}
          onUpload={(file) => onUploadAsset("container_background", file)}
          onDelete={() => onDeleteAsset("container_background")}
        />
      </div>
    </SectionCard>
  );
}
