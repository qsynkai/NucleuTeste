import { LOGO_PATH } from "@/lib/constants/brand";
import Image from "next/image";

/** Recorte do globo no topo do arquivo de marca (sidebar / topbar). */
export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden>
      <Image
        src={LOGO_PATH}
        alt=""
        width={480}
        height={180}
        className="brand-mark__img"
        priority
      />
    </span>
  );
}
