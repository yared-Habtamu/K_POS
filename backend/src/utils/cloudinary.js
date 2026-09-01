const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadBuffer(
  buffer,
  filename,
  requestBaseUrl = "",
  folder = "pos_products",
) {
  if (!buffer) throw new Error("No buffer provided");

  // Fail fast with a clear error when Cloudinary env vars are missing (ONLY in production)
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET)
  ) {
    const err = new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
    err.code = "CLOUDINARY_NOT_CONFIGURED";
    throw err;
  }

  // Convert buffer to data URI so cloudinary can accept it directly
  const base64 = buffer.toString("base64");
  const ext = ((filename && filename.split(".").pop()) || "jpg").toLowerCase();
  const mimeMap = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
  };
  const mime = mimeMap[ext] || "image/jpeg";
  const dataUri = `data:${mime};base64,${base64}`;

  // Upload to Cloudinary
  try {
    // Check if we should even attempt Cloudinary
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new Error("Cloudinary credentials missing, using fallback");
    }

    const res = await cloudinary.uploader.upload(dataUri, {
      folder: folder || "pos_products",
      use_filename: true,
      unique_filename: true,
      resource_type: "image",
    });
    return res;
  } catch (err) {
    // If in development, fall back to local storage so image flows keep working
    console.error(
      "Cloudinary upload failed:",
      err && err.message ? err.message : err,
    );
    if (process.env.NODE_ENV !== "production") {
      try {
        const subFolder = folder || "pos_products";
        const uploadsRoot = path.join(
          __dirname,
          "..",
          "..",
          "uploads",
          subFolder,
        );
        fs.mkdirSync(uploadsRoot, { recursive: true });
        const localName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
        const localPath = path.join(uploadsRoot, localName);
        fs.writeFileSync(localPath, buffer);
        const host = process.env.LOCAL_UPLOADS_URL || requestBaseUrl || "";
        const secure_url = host
          ? `${host}/uploads/${subFolder}/${localName}`
          : `/uploads/${subFolder}/${localName}`;
        console.warn("Saved image to local uploads as fallback:", secure_url);
        return { secure_url, url: secure_url };
      } catch (fsErr) {
        console.error("Failed to save fallback image locally:", fsErr);
        throw err; // rethrow original cloudinary error
      }
    }

    throw err;
  }
}

module.exports = {
  uploadBuffer,
  cloudinary,
};
