import cloudinaryPkg from "cloudinary";
const cloudinary = cloudinaryPkg.v2;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Local uploads directory → backend-gym/uploads/
// __dirname = backend-gym/src/config/ → go up 2 levels = backend-gym/
const UPLOADS_DIR = path.join(__dirname, "../../uploads");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Check if Cloudinary is properly configured
const isCloudinaryConfigured = () => {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  return (
    name && name !== "your_cloud_name_here" &&
    key && key !== "your_api_key_here" &&
    secret && secret !== "your_api_secret_here"
  );
};

// ✅ Save file locally → returns public HTTP URL like http://localhost:4000/uploads/filename.jpg
const saveLocally = (fileObj) => {
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const ext = fileObj.name
      ? path.extname(fileObj.name) || ".jpg"
      : fileObj.mimetype?.startsWith("image/") ? ".jpg" : ".bin";

    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const destPath = path.join(UPLOADS_DIR, filename);

    fs.copyFileSync(fileObj.tempFilePath, destPath);

    if (fileObj.tempFilePath && fs.existsSync(fileObj.tempFilePath)) {
      fs.unlinkSync(fileObj.tempFilePath);
    }

    const BASE_URL = process.env.BACKEND_URL || "http://localhost:4000";
    const url = `${BASE_URL}/uploads/${filename}`;
    console.log("✅ Image saved locally:", url);
    return url;
  } catch (err) {
    console.error("❌ Local save error:", err);
    return null;
  }
};

// ✅ Main upload function
export const uploadToCloudinary = async (file, folder) => {
  const fileObj = Array.isArray(file) ? file[0] : file;

  // No Cloudinary → save locally
  if (!isCloudinaryConfigured()) {
    console.warn("⚠️  Cloudinary not configured → saving to local uploads/ folder.");
    return saveLocally(fileObj);
  }

  // Upload to Cloudinary
  try {
    const isImage = fileObj.mimetype.startsWith("image/");
    const resourceType = isImage ? "image" : "raw";

    let extension = "";
    if (fileObj.name && fileObj.name.includes(".")) {
      extension = fileObj.name.substring(fileObj.name.lastIndexOf("."));
    } else if (isImage) {
      extension = ".jpg";
    } else {
      extension = ".pdf";
    }

    const randomName = Math.random().toString(36).substring(2, 10) + "_" + Date.now();
    const uploadOptions = {
      folder,
      resource_type: resourceType,
      public_id: randomName + extension,
    };

    const upload = await cloudinary.uploader.upload(fileObj.tempFilePath, uploadOptions);

    if (fileObj.tempFilePath && fs.existsSync(fileObj.tempFilePath)) {
      fs.unlinkSync(fileObj.tempFilePath);
    }

    console.log("✅ Uploaded to Cloudinary:", upload.secure_url);
    return upload.secure_url;
  } catch (err) {
    console.error("❌ Cloudinary upload failed:", err.message);
    console.warn("Falling back to local storage...");
    return saveLocally(fileObj);
  }
};

export const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
    console.log(`Cloudinary image deleted: ${publicId}`);
  } catch (error) {
    console.error("Cloudinary delete error:", error);
  }
};

export default cloudinary;
