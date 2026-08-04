

async function runVerification() {
  console.log("=== PHASE 2B VERIFICATION ===");
  const baseUrl = "http://localhost:4000/api/v1/assessments";

  // 1. API Endpoint Verification & Persistence Mapping Audit
  // Creating a new assessment via POST
  console.log("\n1. Testing POST /api/v1/assessments (Happy Path)");

  const payload = {
    memberId: 146, // Valid member
    age_at_assessment: 28,
    gender_at_assessment: 'male',
    weight_kg: 80,
    height_cm: 180,
    neck_cm: 40,
    waist_cm: 85,
    hip_cm: null,
    resting_hr: 60,
    activity_level: 'moderate',
    fitness_goal: 'fat_loss'
  };

  let postRes = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  let postJson = await postRes.json();
  console.log("POST Status:", postRes.status);
  console.log("POST Response:", JSON.stringify(postJson, null, 2));

  // 2. Error Handling: Validation Failure
  console.log("\n2. Testing Validation Failure (Missing Required Hip for Female)");
  const badPayload = { ...payload, gender_at_assessment: 'female' };
  let badRes = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(badPayload)
  });
  console.log("Bad POST Status:", badRes.status);
  console.log("Bad POST Response:", JSON.stringify(await badRes.json(), null, 2));

  // 3. Error Handling: Invalid Member
  console.log("\n3. Testing Member Not Found");
  const invalidMemberPayload = { ...payload, memberId: 999999 };
  let invalidRes = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidMemberPayload)
  });
  console.log("Invalid Member Status:", invalidRes.status);
  console.log("Invalid Member Response:", JSON.stringify(await invalidRes.json(), null, 2));

  // 4. GET Latest Assessment
  console.log("\n4. Testing GET /api/v1/assessments/member/146/latest");
  let getLatestRes = await fetch(`${baseUrl}/member/146/latest`);
  console.log("GET Latest Status:", getLatestRes.status);
  console.log("GET Latest Response:", JSON.stringify(await getLatestRes.json(), null, 2));

  // 5. GET History
  console.log("\n5. Testing GET /api/v1/assessments/member/146/history");
  let getHistoryRes = await fetch(`${baseUrl}/member/146/history`);
  console.log("GET History Status:", getHistoryRes.status);
  const historyJson = await getHistoryRes.json();
  console.log("GET History Record Count:", historyJson.data ? historyJson.data.length : 0);

}

runVerification().catch(console.error);
