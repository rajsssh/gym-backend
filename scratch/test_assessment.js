import { createAssessment } from "../src/modules/assessment/assessment.service.js";

async function run() {
  try {
    const payload = {
      memberId: 156,
      assessment_date: new Date(),
      gender_at_assessment: "male",
      age_at_assessment: 25,
      weight_kg: 75.5,
      height_cm: 180,
      neck_cm: 37,
      waist_cm: 82,
      hip_cm: null,
      resting_hr: 68,
      activity_level: "active",
      fitness_goal: "muscle_gain",
      is_baseline: true,
      createdBy: 93,
    };
    const res = await createAssessment(payload, 93);
    console.log("Success:", res);
  } catch (error) {
    console.error("Error occurred:", error);
  } finally {
    process.exit(0);
  }
}

run();
