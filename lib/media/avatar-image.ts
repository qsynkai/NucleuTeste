const MAX_SOURCE_BYTES = 5 * 1024 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível ler a imagem."));
    };
    image.src = objectUrl;
  });
}

/**
 * Recorta o centro da imagem em um quadrado e reduz para `size` px,
 * devolvendo um data URL pequeno (o avatar é guardado no próprio registro).
 */
export async function fileToAvatarDataUrl(file: File, size = 192): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("A imagem excede 5 MB. Use uma menor ou um link.");
  }

  const image = await loadImage(file);
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  if (!side) throw new Error("Imagem inválida.");

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Seu navegador não suporta o redimensionamento.");

  context.drawImage(
    image,
    (image.naturalWidth - side) / 2,
    (image.naturalHeight - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );

  return canvas.toDataURL("image/webp", 0.9);
}
