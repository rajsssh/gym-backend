import cloudinary from '../src/config/cloudinary.js';
import dotenv from 'dotenv';
dotenv.config();

console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY);
console.log("API Secret Length:", process.env.CLOUDINARY_API_SECRET ? process.env.CLOUDINARY_API_SECRET.length : 0);

async function testConnection() {
  try {
    const result = await cloudinary.api.ping();
    console.log("✅ Cloudinary Connection Ping Success:", result);
  } catch (error) {
    console.error("❌ Cloudinary Connection Ping Failed:", error);
  }
}

testConnection();
