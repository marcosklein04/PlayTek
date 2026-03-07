import { ContractAssetKey, ContractCustomizationConfig } from "@/api/contracts";
import { AssetUploadCard, ColorField, SectionCard } from "@/components/contract-customization/shared";
import { Button } from "@/components/ui/button";

export function PuzzleBrandingSection({
  config,
  uploadingAsset,
  onApplyPlayteckPalette,
  onUpdateField,
  onUploadAsset,
  onDeleteAsset,
}: {
  config: ContractCustomizationConfig;
  uploadingAsset: ContractAssetKey | null;
  onApplyPlayteckPalette: () => void;
  onUpdateField: (path: string[], value: string | number | boolean) => void;
  onUploadAsset: (assetKey: ContractAssetKey, file?: File | null) => void;
  onDeleteAsset: (assetKey: ContractAssetKey) => void;
}) {
  return (
    <SectionCard
      title="Identidad del puzzle"
      description="Definí colores y assets del Puzzle Mundial sin tocar la configuración del puzzle genérico."
      action={
        <Button variant="secondary" size="sm" onClick={onApplyPlayteckPalette}>
          Aplicar paleta Playteck
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ColorField label="Color principal" value={config.branding.primary_color} onChange={(value) => onUpdateField(["branding", "primary_color"], value)} />
        <ColorField label="Color secundario" value={config.branding.secondary_color} onChange={(value) => onUpdateField(["branding", "secondary_color"], value)} />
        <ColorField label="Texto principal" value={config.visual.text_color || config.visual.question_text_color} onChange={(value) => onUpdateField(["visual", "text_color"], value)} />
        <ColorField label="Borde de panel" value={config.visual.panel_border_color || config.visual.question_border_color} onChange={(value) => onUpdateField(["visual", "panel_border_color"], value)} />
        <ColorField label="Acento de interacción" value={config.visual.accent_color || config.branding.primary_color} onChange={(value) => onUpdateField(["visual", "accent_color"], value)} />
        <ColorField label="Fondo de panel" value={config.visual.panel_bg_color || config.branding.secondary_color} onChange={(value) => onUpdateField(["visual", "panel_bg_color"], value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <AssetUploadCard
          title="Logo"
          description="Opcional para el header del juego."
          imageUrl={config.branding.logo_url}
          uploading={uploadingAsset === "logo"}
          imageFit="contain"
          onUpload={(file) => onUploadAsset("logo", file)}
          onDelete={() => onDeleteAsset("logo")}
        />
        <AssetUploadCard
          title="Imagen de portada"
          description="Se usa en la pantalla inicial del Puzzle Mundial."
          imageUrl={config.branding.welcome_image_url}
          uploading={uploadingAsset === "welcome_image"}
          onUpload={(file) => onUploadAsset("welcome_image", file)}
          onDelete={() => onDeleteAsset("welcome_image")}
        />
        <AssetUploadCard
          title="Fondo general"
          description="Fondo del runner detrás del panel del juego."
          imageUrl={config.branding.background_url}
          uploading={uploadingAsset === "background"}
          onUpload={(file) => onUploadAsset("background", file)}
          onDelete={() => onDeleteAsset("background")}
        />
        <AssetUploadCard
          title="Imagen del puzzle"
          description="Esta es la imagen real que se corta en piezas para jugar."
          imageUrl={config.content?.puzzle_image_url || ""}
          uploading={uploadingAsset === "puzzle_image"}
          onUpload={(file) => onUploadAsset("puzzle_image", file)}
          onDelete={() => onDeleteAsset("puzzle_image")}
        />
      </div>
    </SectionCard>
  );
}
