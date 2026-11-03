// Leave space for multipart headers under Vercel's 4.5 MB request-body limit.
export const MAX_PRACTICE_IMAGE_BYTES = 4 * 1024 * 1024;
export function practiceImageInputError(file: {
  size: number;
  type: string;
}): string | null {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    return "Usa una imagen PNG, JPEG o WebP.";
  if (!file.size || file.size > MAX_PRACTICE_IMAGE_BYTES)
    return "Máximo 4 MB por imagen.";
  return null;
}
