import { ContractAssetKey, ContractCustomizationConfig } from "@/api/contracts";
import { AssetUploadCard, ColorField, SectionCard } from "@/components/contract-customization/shared";
import { Button } from "@/components/ui/button";

export function GoalkeeperBrandingSection({
  config,
  uploadingAsset,
  onApplyPalette,
  onUpdateField,
  onUploadAsset,
  onDeleteAsset,
}: {
  config: ContractCustomizationConfig;
  uploadingAsset: ContractAssetKey | null;
  onApplyPalette: () => void;
  onUpdateField: (path: string[], value: string | number | boolean) => void;
  onUploadAsset: (assetKey: ContractAssetKey, file?: File | null) => void;
  onDeleteAsset: (assetKey: ContractAssetKey) => void;
}) {
  return (
    <SectionCard
      title="Identidad y assets"
      description="Definí el branding del arcade y las imágenes base del juego."
      action={
        <Button variant="secondary" size="sm" onClick={onApplyPalette}>
          Aplicar paleta Playteck
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ColorField label="Color principal" value={config.branding.primary_color} onChange={(value) => onUpdateField(["branding", "primary_color"], value)} />
        <ColorField label="Color secundario" value={config.branding.secondary_color} onChange={(value) => onUpdateField(["branding", "secondary_color"], value)} />
        <ColorField label="Verde del campo" value={config.visual.field_green_color || "#2b8a3e"} onChange={(value) => onUpdateField(["visual", "field_green_color"], value)} />
        <ColorField label="Verde oscuro" value={config.visual.field_dark_color || "#0b3b23"} onChange={(value) => onUpdateField(["visual", "field_dark_color"], value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AssetUploadCard
          title="Logo"
          description="Se muestra en la pantalla inicial."
          imageUrl={config.branding.logo_url}
          uploading={uploadingAsset === "logo"}
          imageFit="contain"
          onUpload={(file) => onUploadAsset("logo", file)}
          onDelete={() => onDeleteAsset("logo")}
        />
        <AssetUploadCard
          title="Imagen de portada"
          description="Opcional para reforzar el arranque del juego."
          imageUrl={config.branding.welcome_image_url}
          uploading={uploadingAsset === "welcome_image"}
          onUpload={(file) => onUploadAsset("welcome_image", file)}
          onDelete={() => onDeleteAsset("welcome_image")}
        />
        <AssetUploadCard
          title="Fondo general"
          description="Fondo completo del runner por detrás del campo."
          imageUrl={config.branding.background_url}
          uploading={uploadingAsset === "background"}
          onUpload={(file) => onUploadAsset("background", file)}
          onDelete={() => onDeleteAsset("background")}
        />
      </div>
    </SectionCard>
  );
}
