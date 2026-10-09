import { APP_NAME, LOGO_PATH } from "@/lib/constants/brand";
import Image from "next/image";

type BrandLogoVariant = "inline" | "hero";

type BrandLogoProps = {
  variant?: BrandLogoVariant;
  priority?: boolean;
  className?: string;
};

/** Logo completo (login / landing). Fundo preto do PNG dissolve no tema escuro. */
export function BrandLogo({
  variant = "inline",
  priority = false,
  className = "",
}: BrandLogoProps) {
  return (
    <Image
      src={LOGO_PATH}
      alt={APP_NAME}
      width={480}
      height={180}
      priority={priority}
      className={`brand-logo brand-logo--${variant} brand-logo--blend ${className}`.trim()}
    />
  );
}
