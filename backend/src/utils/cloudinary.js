const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadBuffer(buffer, filename) {
  if (!buffer) throw new Error("No buffer provided");

  // Fail fast with a clear error when Cloudinary env vars are missing
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    const err = new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
    err.code = "CLOUDINARY_NOT_CONFIGURED";
    throw err;
  }

  // Convert buffer to data URI so cloudinary can accept it directly
  const base64 = buffer.toString("base64");
  // Attempt to detect mime type from filename extension, default to jpeg
  const ext = (filename && filename.split(".").pop()) || "jpg";
  const mime = ext === "png" ? "image/png" : "image/jpeg";
  const dataUri = `data:${mime};base64,${base64}`;

  // Upload to Cloudinary
  try {
    const res = await cloudinary.uploader.upload(dataUri, {
      folder: "pos_products",
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
        const uploadsRoot = path.join(
          __dirname,
          "..",
          "..",
          "uploads",
          "pos_products",
        );
        fs.mkdirSync(uploadsRoot, { recursive: true });
        const ext =
          filename && filename.split(".").pop()
            ? filename.split(".").pop()
            : "jpg";
        const localName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${ext}`;
        const localPath = path.join(uploadsRoot, localName);
        fs.writeFileSync(localPath, buffer);
        const host =
          process.env.LOCAL_UPLOADS_URL ||
          `http://localhost:${process.env.PORT || 4000}`;
        const secure_url = `${host}/uploads/pos_products/${localName}`;
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
