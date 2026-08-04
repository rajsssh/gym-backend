import { AssessmentEngine } from './src/modules/assessment/assessment.engine.js';
const engine = new AssessmentEngine();

const maleInput = {
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

const femaleInput = {
    age_at_assessment: 30,
    gender_at_assessment: 'female',
    weight_kg: 65,
    height_cm: 165,
    neck_cm: 35,
    waist_cm: 75,
    hip_cm: 95,
    resting_hr: 65,
    activity_level: 'light',
    fitness_goal: 'maintenance'
};

const muscleInput = {
    age_at_assessment: 25,
    gender_at_assessment: 'male',
    weight_kg: 70,
    height_cm: 175,
    neck_cm: 37,
    waist_cm: 80,
    hip_cm: null,
    resting_hr: 55,
    activity_level: 'active',
    fitness_goal: 'muscle_gain'
};

console.log("=== MALE (Fat Loss) ===");
console.log(JSON.stringify(engine.calculateAll(maleInput), null, 2));

console.log("\n=== FEMALE (Maintenance) ===");
console.log(JSON.stringify(engine.calculateAll(femaleInput), null, 2));

console.log("\n=== MALE (Muscle Gain) ===");
console.log(JSON.stringify(engine.calculateAll(muscleInput), null, 2));
