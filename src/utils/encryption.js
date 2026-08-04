import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';

if (!process.env.ENCRYPTION_KEY) {
  throw new Error("CRITICAL SECURITY ERROR: ENCRYPTION_KEY is missing in .env file. Application cannot start safely.");
}
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'utf-8'); // Must be 32 bytes
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Encrypts a plain text string.
 * @param {string} text 
 * @returns {string} The encrypted format iv:encryptedData
 */
export const encrypt = (text) => {
  if (!text) return text;
  
  // Ensure the key is exactly 32 bytes
  const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest("base64").substring(0, 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

/**
 * Decrypts a previously encrypted string.
 * @param {string} text The iv:encryptedData format string
 * @returns {string|null} The plain text or null if failed
 */
export const decrypt = (text) => {
  if (!text) return text;
  
  try {
    const textParts = text.split(":");
    if (textParts.length !== 2) return text; // Maybe it's not encrypted yet (legacy)

    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    
    const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest("base64").substring(0, 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(key), iv);
    
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString();
  } catch (error) {
    console.error("Decryption failed:", error.message);
    return null;
  }
};
