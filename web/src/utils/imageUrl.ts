export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' fill='none'%3E%3Crect width='120' height='120' rx='12' fill='%23e5e7eb'/%3E%3Cpath d='M44 76l12-16 8 10 12-14 12 20H44z' fill='%239ca3af'/%3E%3Ccircle cx='52' cy='52' r='8' fill='%239ca3af'/%3E%3C/svg%3E";

export function getImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  // If it's already a full Cloudinary URL (or any absolute URL), return as-is
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

  // If it's a relative upload path like /uploads/xyz.jpg
  if (url.startsWith("/")) {
    return `${API_BASE.replace(/\/$/, "")}${url}`;
  }

  // If it contains /uploads/, re-target to API_BASE so localhost/domain changes don't break the image
  if (url.includes("/uploads/")) {
    const uploadPath = url.substring(url.indexOf("/uploads/"));
    return `${API_BASE.replace(/\/$/, "")}${uploadPath}`;
  }

  return url;
}

/**
 * onError handler for <img> elements – replaces the src with a neutral
 * placeholder so the user sees a grey box instead of a broken-image icon.
 * Usage: <img src={...} onError={handleImageError} />
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
) {
  const img = e.currentTarget;
  // Prevent infinite loop if placeholder itself fails
  if (img.src === PLACEHOLDER_IMAGE) return;
  img.src = PLACEHOLDER_IMAGE;
}
