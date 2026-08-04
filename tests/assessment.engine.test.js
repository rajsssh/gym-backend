import test from 'node:test';
import assert from 'node:assert';
import { validateAssessmentInputs } from '../src/modules/assessment/assessment.validator.js';
import { AssessmentEngine } from '../src/modules/assessment/assessment.engine.js';

const engine = new AssessmentEngine();

test('test_male_standard: Validates Male logic and formulas', () => {
  const inputs = {
    age_at_assessment: 28,
    gender_at_assessment: 'male',
    weight_kg: 80,
    height_cm: 180,
    neck_cm: 40,
    waist_cm: 85,
    hip_cm: null, // missing hip is allowed for male
    resting_hr: 60,
    activity_level: 'moderate', // multiplier 1.55
    fitness_goal: 'fat_loss' // -500
  };

  const validation = validateAssessmentInputs(inputs);
  assert.strictEqual(validation.isValid, true);

  const result = engine.calculateAll(inputs);
  
  // BMI = 80 / (1.8*1.8) = 24.69
  assert.strictEqual(result.metrics.bmi, 24.69);
  assert.strictEqual(result.dashboard_data.bmi_risk_label, 'Normal');

  // BMR (Mifflin) = 10(80) + 6.25(180) - 5(28) + 5 = 800 + 1125 - 140 + 5 = 1790
  assert.strictEqual(result.metrics.bmr, 1790);

  // TDEE = 1790 * 1.55 = 2774.5
  assert.strictEqual(result.metrics.tdee, 2774.5);

  // Target = 2774.5 - 500 = 2275
  assert.strictEqual(result.metrics.target_calories, 2275);

  // WHR should be null
  assert.strictEqual(result.metrics.waist_to_hip_ratio, null);
});

test('test_female_standard: Validates Female logic with hip required', () => {
  const inputs = {
    age_at_assessment: 30,
    gender_at_assessment: 'female',
    weight_kg: 65,
    height_cm: 165,
    neck_cm: 35,
    waist_cm: 75,
    hip_cm: 95,
    resting_hr: 65,
    activity_level: 'light', // 1.375
    fitness_goal: 'maintenance' // 0
  };

  const validation = validateAssessmentInputs(inputs);
  assert.strictEqual(validation.isValid, true);

  const result = engine.calculateAll(inputs);
  assert.strictEqual(result.metrics.waist_to_hip_ratio, Number((75/95).toFixed(2)));

  // BMR = 10(65) + 6.25(165) - 5(30) - 161 = 650 + 1031.25 - 150 - 161 = 1370.25
  assert.strictEqual(result.metrics.bmr, 1370.25);
  
  // TDEE = 1370.25 * 1.375 = 1884.09
  assert.strictEqual(result.metrics.tdee, 1884.09);
  assert.strictEqual(result.metrics.target_calories, 1884);
});

test('test_missing_hip_female: Rejects female missing hip', () => {
  const inputs = {
    age_at_assessment: 30,
    gender_at_assessment: 'female',
    weight_kg: 65,
    height_cm: 165,
    neck_cm: 35,
    waist_cm: 75,
    hip_cm: null, // THIS SHOULD FAIL
    resting_hr: 65,
    activity_level: 'light',
    fitness_goal: 'maintenance'
  };

  const validation = validateAssessmentInputs(inputs);
  assert.strictEqual(validation.isValid, false);
  assert.ok(validation.errors.includes("hip_cm is strictly required for female assessments (US Navy Formula requirement)"));
});

test('test_boundary_min_values: Tests lowest reasonable bounds without breaking', () => {
  const inputs = {
    age_at_assessment: 10,
    gender_at_assessment: 'male',
    weight_kg: 30,
    height_cm: 100,
    neck_cm: 20,
    waist_cm: 40,
    hip_cm: 50,
    resting_hr: 30,
    activity_level: 'sedentary',
    fitness_goal: 'fat_loss'
  };

  const validation = validateAssessmentInputs(inputs);
  assert.strictEqual(validation.isValid, true);

  const result = engine.calculateAll(inputs);
  assert.ok(result.metrics.bmr > 0);
  assert.ok(result.metrics.target_calories > 0);
});

test('test_zero_division: Fails validation on zero height', () => {
  const inputs = {
    age_at_assessment: 28,
    gender_at_assessment: 'male',
    weight_kg: 80,
    height_cm: 0, // Invalid!
    neck_cm: 40,
    waist_cm: 85,
    hip_cm: null,
    resting_hr: 60,
    activity_level: 'moderate',
    fitness_goal: 'fat_loss'
  };

  const validation = validateAssessmentInputs(inputs);
  assert.strictEqual(validation.isValid, false);
});

test('test_boundary_max_values: Tests highest reasonable bounds without breaking', () => {
  const inputs = {
    age_at_assessment: 120,
    gender_at_assessment: 'male',
    weight_kg: 300,
    height_cm: 250,
    neck_cm: 80,
    waist_cm: 200,
    hip_cm: null,
    resting_hr: 200,
    activity_level: 'active',
    fitness_goal: 'muscle_gain'
  };

  const validation = validateAssessmentInputs(inputs);
  assert.strictEqual(validation.isValid, true);
  
  const result = engine.calculateAll(inputs);
  assert.ok(result.metrics.bmr > 0);
  assert.ok(result.metrics.target_calories > 0);
});

test('test_invalid_enum_values: Rejects invalid enums', () => {
  const inputs = {
    age_at_assessment: 28,
    gender_at_assessment: 'alien', // Invalid
    weight_kg: 80,
    height_cm: 180,
    neck_cm: 40,
    waist_cm: 85,
    hip_cm: null,
    resting_hr: 60,
    activity_level: 'super_active', // Invalid
    fitness_goal: 'become_batman' // Invalid
  };

  const validation = validateAssessmentInputs(inputs);
  assert.strictEqual(validation.isValid, false);
  assert.strictEqual(validation.errors.length, 3);
});

test('test_negative_measurements: Rejects negative values natively via boundaries', () => {
  const inputs = {
    age_at_assessment: -5,
    gender_at_assessment: 'male',
    weight_kg: -80,
    height_cm: 180,
    neck_cm: 40,
    waist_cm: 85,
    hip_cm: null,
    resting_hr: 60,
    activity_level: 'moderate',
    fitness_goal: 'fat_loss'
  };

  const validation = validateAssessmentInputs(inputs);
  assert.strictEqual(validation.isValid, false);
  assert.strictEqual(validation.errors.length, 2);
});

test('test_decimal_rounding_consistency: Ensures metrics are precisely rounded to 2 decimals', () => {
  const inputs = {
    age_at_assessment: 28,
    gender_at_assessment: 'male',
    weight_kg: 80.567, // odd decimal
    height_cm: 175.44, // odd decimal
    neck_cm: 38.3,
    waist_cm: 85.1,
    hip_cm: null,
    resting_hr: 65,
    activity_level: 'light',
    fitness_goal: 'maintenance'
  };

  const result = engine.calculateAll(inputs);
  // Check that no value has more than 2 decimal places
  assert.strictEqual(result.metrics.bmi.toString().split('.')[1]?.length <= 2, true);
  assert.strictEqual(result.metrics.bmr.toString().split('.')[1]?.length <= 2, true);
});

test('test_historical_reproducibility_test: Ensures config snapshot forces strict outputs', () => {
  // If config is modified, a historical engine with an old config must still produce the exact same output.
  const oldConfig = {
    ENGINE_VERSION: "1.0.0",
    ACTIVITY_MULTIPLIERS: { sedentary: 1.0 }, // mock weird old config
    GOAL_ADJUSTMENTS: { fat_loss: -1000 },
    MACRO_RATIOS: { protein_per_kg_lbm: 1.0, fat_percentage: 0.10 },
    HEART_RATE_ZONES: { fat_burn_low: 0.50, fat_burn_high: 0.60, cardio_low: 0.60, cardio_high: 0.70 }
  };
  
  const historicalEngine = new AssessmentEngine(oldConfig);
  const inputs = {
    age_at_assessment: 28,
    gender_at_assessment: 'male',
    weight_kg: 80,
    height_cm: 180,
    neck_cm: 40,
    waist_cm: 85,
    hip_cm: null,
    resting_hr: 60,
    activity_level: 'sedentary',
    fitness_goal: 'fat_loss'
  };
  
  const result = historicalEngine.calculateAll(inputs);
  assert.strictEqual(result.metrics.tdee, result.metrics.bmr * 1.0); // old multiplier
  assert.strictEqual(result.metrics.target_calories, Math.round(result.metrics.tdee - 1000)); // old goal
});
