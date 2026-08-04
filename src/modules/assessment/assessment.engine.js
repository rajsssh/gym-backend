import { ASSESSMENT_CONFIG } from './assessment.config.js';

export class AssessmentEngine {
  constructor(config = ASSESSMENT_CONFIG) {
    this.config = config;
  }

  calculateAll(inputs) {
    // We assume inputs are already validated by assessment.validator.js
    const age = inputs.age_at_assessment;
    const gender = inputs.gender_at_assessment.toLowerCase();
    const w = parseFloat(inputs.weight_kg);
    const h = parseFloat(inputs.height_cm);
    const neck = parseFloat(inputs.neck_cm);
    const waist = parseFloat(inputs.waist_cm);
    const hip = inputs.hip_cm !== null && inputs.hip_cm !== undefined ? parseFloat(inputs.hip_cm) : null;
    const restingHr = inputs.resting_hr;
    const activity = inputs.activity_level;
    const goal = inputs.fitness_goal;

    // 1. BMI
    const height_m = h / 100;
    const bmi = w / (height_m * height_m);
    
    let bmi_risk_label = "Normal";
    if (bmi < 18.5) bmi_risk_label = "Underweight";
    else if (bmi >= 18.5 && bmi < 25.0) bmi_risk_label = "Normal";
    else if (bmi >= 25.0 && bmi < 30.0) bmi_risk_label = "Overweight";
    else if (bmi >= 30.0) bmi_risk_label = "Obese";

    // 2. BMR (Mifflin-St Jeor)
    // Male: 10W + 6.25H - 5A + 5
    // Female: 10W + 6.25H - 5A - 161
    let bmr = (10 * w) + (6.25 * h) - (5 * age);
    bmr += (gender === 'male') ? 5 : -161;

    // 3. TDEE
    const multiplier = this.config.ACTIVITY_MULTIPLIERS[activity] || 1.2;
    const tdee = bmr * multiplier;

    // 4. Target Calories
    const adjustment = this.config.GOAL_ADJUSTMENTS[goal] || 0;
    const target_calories = Math.round(tdee + adjustment);

    // 5. Body Fat % (US Navy Method)
    // Logarithms require positive values. We already validate bounds.
    let bf = 0;
    if (gender === 'male') {
      bf = (86.010 * Math.log10(waist - neck)) - (70.041 * Math.log10(h)) + 36.76;
    } else {
      // Female requires hip
      bf = (163.205 * Math.log10(waist + hip - neck)) - (97.684 * Math.log10(h)) - 78.387;
    }
    // Cap limits just in case
    if (bf < 2) bf = 2; 
    if (bf > 60) bf = 60;

    // 6. Lean Body Mass
    const lbm = w * (1 - (bf / 100));

    // 7. Ideal Body Weight (Devine)
    // 50.0 + 2.3kg per inch over 5 feet
    const inches_over_60 = (h / 2.54) - 60;
    let ibw = (gender === 'male') ? 50.0 : 45.5;
    if (inches_over_60 > 0) {
      ibw += (2.3 * inches_over_60);
    }

    // 8. Waist to Hip Ratio
    let whr = null;
    if (hip !== null && hip > 0) {
      whr = waist / hip;
    }

    // 9. Macros
    const protein_grams = Math.round(lbm * this.config.MACRO_RATIOS.protein_per_kg_lbm);
    const fat_calories = target_calories * this.config.MACRO_RATIOS.fat_percentage;
    const fat_grams = Math.round(fat_calories / 9);
    // 1g protein = 4 cal, 1g fat = 9 cal, 1g carb = 4 cal
    const protein_calories = protein_grams * 4;
    const remaining_calories = target_calories - (protein_calories + fat_calories);
    const carb_grams = Math.round(remaining_calories / 4);

    // 10. Karvonen Target Heart Rate
    // Max HR = 220 - age
    const max_hr = 220 - age;
    const hrr = max_hr - restingHr; // Heart Rate Reserve
    
    const fat_burn_low = Math.round((hrr * this.config.HEART_RATE_ZONES.fat_burn_low) + restingHr);
    const fat_burn_high = Math.round((hrr * this.config.HEART_RATE_ZONES.fat_burn_high) + restingHr);
    const cardio_low = Math.round((hrr * this.config.HEART_RATE_ZONES.cardio_low) + restingHr);
    const cardio_high = Math.round((hrr * this.config.HEART_RATE_ZONES.cardio_high) + restingHr);

    return {
      metrics: {
        bmi: Number(bmi.toFixed(2)),
        body_fat_percentage: Number(bf.toFixed(2)),
        lean_body_mass: Number(lbm.toFixed(2)),
        ideal_body_weight: Number(ibw.toFixed(2)),
        waist_to_hip_ratio: whr !== null ? Number(whr.toFixed(2)) : null,
        bmr: Number(bmr.toFixed(2)),
        tdee: Number(tdee.toFixed(2)),
        target_calories: target_calories
      },
      macros: {
        protein_grams,
        fat_grams,
        carb_grams
      },
      dashboard_data: {
        bmi_risk_label,
        cardio_zones: {
          fat_burn_low,
          fat_burn_high,
          cardio_low,
          cardio_high
        }
      }
    };
  }
}
