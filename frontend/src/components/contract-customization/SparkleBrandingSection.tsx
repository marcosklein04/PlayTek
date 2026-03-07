import { ContractAssetKey, ContractCustomizationConfig } from "@/api/contracts";
import { Button } from "@/components/ui/button";
import { AssetUploadCard, ColorField, SectionCard } from "@/components/contract-customization/shared";

type SparkleBrandingSectionProps = {
  config: ContractCustomizationConfig;
  uploadingAsset: ContractAssetKey | null;
  onApplyPlayteckPalette: () => void;
  onUpdateField: (path: string[], value: string | number | boolean) => void;
  onUploadAsset: (assetKey: ContractAssetKey, file?: File | null) => void;
  onDeleteAsset: (assetKey: ContractAssetKey) => void;
};

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
        <AssetUploadCard
          title="Logo"
          description="Se usa en la experiencia y en la vista previa."
          imageUrl={config.branding.logo_url}
          uploading={uploadingAsset === "logo"}
          imageFit="contain"
          onUpload={(file) => onUploadAsset("logo", file)}
          onDelete={() => onDeleteAsset("logo")}
        />
        <AssetUploadCard
          title="Imagen de bienvenida"
          description="Aparece en la portada del juego."
          imageUrl={config.branding.welcome_image_url}
          uploading={uploadingAsset === "welcome_image"}
          onUpload={(file) => onUploadAsset("welcome_image", file)}
          onDelete={() => onDeleteAsset("welcome_image")}
        />
        <AssetUploadCard
          title="Fondo general"
          description="Se aplica al fondo principal del runner."
          imageUrl={config.branding.background_url}
          uploading={uploadingAsset === "background"}
          onUpload={(file) => onUploadAsset("background", file)}
          onDelete={() => onDeleteAsset("background")}
        />
        <AssetUploadCard
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
