export const calculateBodyBuilderMetrics = (data) => {
  const gender = (data.gender || 'male').toLowerCase();
  const age = data.age !== undefined && data.age !== null && data.age !== '' ? parseInt(data.age) : NaN;
  const weight_kg = data.weight_kg !== undefined && data.weight_kg !== null && data.weight_kg !== '' ? parseFloat(data.weight_kg) : NaN;
  const height_cm = data.height_cm !== undefined && data.height_cm !== null && data.height_cm !== '' ? parseFloat(data.height_cm) : NaN;
  const neck_cm = data.neck_cm !== undefined && data.neck_cm !== null && data.neck_cm !== '' ? parseFloat(data.neck_cm) : NaN;
  const waist_cm = data.waist_cm !== undefined && data.waist_cm !== null && data.waist_cm !== '' ? parseFloat(data.waist_cm) : NaN;
  const hip_cm = data.hip_cm !== undefined && data.hip_cm !== null && data.hip_cm !== '' ? parseFloat(data.hip_cm) : null;
  const activity_level = (data.activity_level || 'active').toLowerCase();
  const fitness_goal = (data.fitness_goal || 'muscle gain').toLowerCase().replace(/_/g, ' ');
  const resting_hr = data.resting_hr !== undefined && data.resting_hr !== null && data.resting_hr !== '' ? parseInt(data.resting_hr) : null;

  // 1. BMI
  const hasBmiInputs = !isNaN(weight_kg) && weight_kg > 0 && !isNaN(height_cm) && height_cm > 0;
  const bmi = hasBmiInputs ? weight_kg / Math.pow(height_cm / 100, 2) : null;
  let bmi_status = null;
  if (bmi !== null) {
    if (bmi < 18.5) {
      bmi_status = 'Underweight';
    } else if (bmi >= 18.5 && bmi < 25.0) {
      bmi_status = 'Normal';
    } else if (bmi >= 25.0 && bmi < 30.0) {
      bmi_status = 'Overweight';
    } else if (bmi >= 30.0) {
      bmi_status = 'Obese';
    }
  }

  // 2. BMR (Mifflin-St Jeor)
  const hasBmrInputs = !isNaN(weight_kg) && weight_kg > 0 && !isNaN(height_cm) && height_cm > 0 && !isNaN(age) && age > 0;
  let bmr = null;
  if (hasBmrInputs) {
    if (gender === 'female') {
      bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161;
    } else {
      bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5;
    }
  }

  // 3. TDEE
  let activity_multiplier = 1.725;
  if (activity_level === 'sedentary') {
    activity_multiplier = 1.200;
  } else if (activity_level === 'light') {
    activity_multiplier = 1.375;
  } else if (activity_level === 'moderate') {
    activity_multiplier = 1.550;
  } else if (activity_level === 'active') {
    activity_multiplier = 1.725;
  }
  const tdee = bmr !== null ? bmr * activity_multiplier : null;

  // 4. Target Calories
  let target_calories = tdee;
  if (tdee !== null) {
    if (fitness_goal === 'fat loss' || fitness_goal === 'fat_loss') {
      target_calories = tdee - 500;
    } else if (fitness_goal === 'maintenance') {
      target_calories = tdee;
    } else {
      target_calories = tdee + 350;
    }
    if (bmr !== null && target_calories < bmr) {
      target_calories = bmr;
    }
  }

  // 5. Body Fat Percentage (US Navy Method)
  let body_fat_percentage = null;
  const isFemale = gender === 'female';
  
  if (isFemale) {
    const hasFInputs = !isNaN(waist_cm) && waist_cm > 0 && !isNaN(hip_cm) && hip_cm > 0 && !isNaN(neck_cm) && neck_cm > 0 && !isNaN(height_cm) && height_cm > 0;
    if (hasFInputs) {
      const diff = waist_cm + hip_cm - neck_cm;
      if (diff > 0) {
        body_fat_percentage = 163.205 * Math.log10(diff) - 97.684 * Math.log10(height_cm) - 78.387;
      }
    }
  } else {
    const hasMInputs = !isNaN(waist_cm) && waist_cm > 0 && !isNaN(neck_cm) && neck_cm > 0 && !isNaN(height_cm) && height_cm > 0;
    if (hasMInputs) {
      const diff = waist_cm - neck_cm;
      if (diff > 0) {
        body_fat_percentage = 86.010 * Math.log10(diff) - 70.041 * Math.log10(height_cm) + 36.76;
      }
    }
  }

  // 6. Lean Body Mass
  const lean_body_mass_kg = (weight_kg !== null && !isNaN(weight_kg) && weight_kg > 0 && body_fat_percentage !== null && !isNaN(body_fat_percentage)) 
    ? weight_kg * (1 - (body_fat_percentage / 100)) 
    : null;

  // 7. Macronutrient Allocation
  let macros = null;
  if (target_calories !== null && lean_body_mass_kg !== null) {
    const protein_grams = lean_body_mass_kg * 2.2;
    const protein_calories = protein_grams * 4;
    const fat_calories = target_calories * 0.25;
    const fat_grams = fat_calories / 9;
    const carb_calories = target_calories - (protein_calories + fat_calories);
    const carb_grams = carb_calories / 4;
    macros = {
      protein_grams: parseFloat(protein_grams.toFixed(2)),
      protein_calories: parseFloat(protein_calories.toFixed(2)),
      fat_grams: parseFloat(fat_grams.toFixed(2)),
      fat_calories: parseFloat(fat_calories.toFixed(2)),
      carb_grams: parseFloat(carb_grams.toFixed(2)),
      carb_calories: parseFloat(carb_calories.toFixed(2))
    };
  }

  // 8. Ideal Body Weight (Devine Formula)
  let ideal_body_weight_kg = null;
  if (!isNaN(height_cm) && height_cm > 0) {
    const inches_over_60 = (height_cm / 2.54) - 60;
    if (gender === 'male') {
      ideal_body_weight_kg = 50.0 + (2.3 * inches_over_60);
    } else {
      ideal_body_weight_kg = 45.5 + (2.3 * inches_over_60);
    }
  }

  // 9. Waist-to-Hip Ratio
  let waist_to_hip_ratio = null;
  if (!isNaN(waist_cm) && waist_cm > 0 && hip_cm !== null && !isNaN(hip_cm) && hip_cm > 0) {
    waist_to_hip_ratio = waist_cm / hip_cm;
  }

  // 10. Target Heart Rate Zones (Karvonen Method)
  let max_heart_rate = null;
  let heart_rate_reserve = null;
  let fat_burn_zone = { low: null, high: null };
  let cardio_endurance_zone = { low: null, high: null };

  if (!isNaN(age) && age > 0 && resting_hr !== null && !isNaN(resting_hr) && resting_hr > 0) {
    max_heart_rate = 220 - age;
    heart_rate_reserve = max_heart_rate - resting_hr;
    fat_burn_zone = {
      low: parseFloat(((heart_rate_reserve * 0.60) + resting_hr).toFixed(2)),
      high: parseFloat(((heart_rate_reserve * 0.70) + resting_hr).toFixed(2))
    };
    cardio_endurance_zone = {
      low: parseFloat(((heart_rate_reserve * 0.70) + resting_hr).toFixed(2)),
      high: parseFloat(((heart_rate_reserve * 0.80) + resting_hr).toFixed(2))
    };
  }

  return {
    bmi: bmi !== null ? parseFloat(bmi.toFixed(2)) : null,
    bmi_status,
    bmr: bmr !== null ? parseFloat(bmr.toFixed(2)) : null,
    activity_multiplier,
    tdee: tdee !== null ? parseFloat(tdee.toFixed(2)) : null,
    target_calories: target_calories !== null ? parseFloat(target_calories.toFixed(2)) : null,
    body_fat_percentage: body_fat_percentage !== null ? parseFloat(body_fat_percentage.toFixed(2)) : null,
    lean_body_mass_kg: lean_body_mass_kg !== null ? parseFloat(lean_body_mass_kg.toFixed(2)) : null,
    macros,
    ideal_body_weight_kg: ideal_body_weight_kg !== null ? parseFloat(ideal_body_weight_kg.toFixed(2)) : null,
    waist_to_hip_ratio: waist_to_hip_ratio ? parseFloat(waist_to_hip_ratio.toFixed(2)) : null,
    max_heart_rate,
    heart_rate_reserve,
    fat_burn_zone,
    cardio_endurance_zone
  };
};
