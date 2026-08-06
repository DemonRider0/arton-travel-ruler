export interface ImageDimensions {
  width: number;
  height: number;
}

export async function readImageDimensions(file: File): Promise<ImageDimensions> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecione um arquivo de imagem PNG, JPG ou WebP.");
  }

  if ("createImageBitmap" in globalThis) {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }

  return readDimensionsWithImageElement(file);
}

function readDimensionsWithImageElement(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler as dimensões da imagem."));
    };
    image.src = url;
  });
}
