const cloudinary = require('cloudinary').v2;

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadBuffer(buffer, filename) {
  if (!buffer) throw new Error('No buffer provided');

  // Convert buffer to data URI so cloudinary can accept it directly
  const base64 = buffer.toString('base64');
  // Attempt to detect mime type from filename extension, default to jpeg
  const ext = (filename && filename.split('.').pop()) || 'jpg';
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  const dataUri = `data:${mime};base64,${base64}`;

  // Upload to Cloudinary
  const res = await cloudinary.uploader.upload(dataUri, {
    folder: 'pos_products',
    use_filename: true,
    unique_filename: true,
    resource_type: 'image',
  });

  return res;
}

module.exports = {
  uploadBuffer,
  cloudinary,
};
