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
