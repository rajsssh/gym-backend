import dotenv from 'dotenv';
dotenv.config();
import { dispatchNotification } from './src/utils/notificationDispatcher.js';

async function run() {
  console.log("Testing dispatcher...");
  try {
    await dispatchNotification({
      category: 'test_category',
      toEmail: 'kt@gmail.com',
      toUserId: 67,
      subject: "Test Subject",
      message: "Test Message",
      customChannels: ['EMAIL']
    });
    console.log("Dispatch finished.");
  } catch(e) {
    console.error("Crash:", e);
  }
  process.exit(0);
}
run();
