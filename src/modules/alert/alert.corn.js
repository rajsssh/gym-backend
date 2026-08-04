import cron from "node-cron";
import { generateAlerts } from "./alert.service.js";

// Run every day at 3 AM
cron.schedule("0 3 * * *", async () => {
  console.log("Running daily alert scan...");
  await generateAlerts();
});
