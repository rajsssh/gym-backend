import { addLeadService } from "../src/modules/leads/lead.service.js";

async function runTest() {
  try {
    console.log("Testing addLeadService with branchId 48...");
    const result = await addLeadService({
      adminId: 90,
      branchId: 48,
      fullName: "Branch Test Lead",
      email: "",
      phone: "9876543210",
      gender: "",
      source: "Walk-in",
      status: "New",
      notes: "",
      followUpDate: "",
      assignedToStaffId: ""
    });
    console.log("Success! Created lead:", result);
    process.exit(0);
  } catch (error) {
    console.error("Failed to add lead:", error);
    process.exit(1);
  }
}

runTest();


