async function run() {
  try {
    const payload = {
      fullName: "HTTP Test Lead Bug Repro",
      phone: "1234567890",
      email: "",
      gender: "",
      source: "Walk-in",
      status: "New",
      followUpDate: "",
      notes: "",
      assignedToStaffId: "undefined",
      adminId: 90,
      branchId: 48
    };

    console.log("Sending POST request to http://localhost:4000/api/leads...");
    const res = await fetch("http://localhost:4000/api/leads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log("Response Status:", res.status);
    const data = await res.json();
    console.log("Response Data:", data);
    process.exit(0);
  } catch (error) {
    console.error("Fetch failed:", error);
    process.exit(1);
  }
}

run();


