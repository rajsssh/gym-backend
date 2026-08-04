import { uploadToCloudinary } from '../src/config/cloudinary.js';
import path from 'path';
import fs from 'fs';

async function testUpload() {
  const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  const buffer = Buffer.from(base64Png, 'base64');
  const tempCopyPath = path.resolve('test_pixel.png');
  
  fs.writeFileSync(tempCopyPath, buffer);
  console.log("Created valid 1x1 pixel PNG at:", tempCopyPath);

  // Create a mock express fileupload object
  const mockFile = {
    name: 'test_pixel.png',
    tempFilePath: tempCopyPath,
    mimetype: 'image/png'
  };

  console.log("Uploading file...");
  const secureUrl = await uploadToCloudinary(mockFile, 'test/profile');
  console.log("Upload Secure URL result:", secureUrl);

  if (secureUrl) {
    console.log("✅ SUCCESS: Upload to Cloudinary succeeded!");
  } else {
    console.error("❌ FAILURE: Upload to Cloudinary returned null. Check logs.");
    if (fs.existsSync(tempCopyPath)) fs.unlinkSync(tempCopyPath);
  }
}

testUpload();
