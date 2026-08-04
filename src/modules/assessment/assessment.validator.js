export const validateAssessmentInputs = (data) => {
  const errors = [];
  const requiredFields = [
    'age_at_assessment', 'gender_at_assessment', 'weight_kg', 'height_cm', 
    'neck_cm', 'waist_cm', 'resting_hr', 'activity_level', 'fitness_goal'
  ];

  // Auto-default missing optional fields if omitted
  if (!data.gender_at_assessment) {
    data.gender_at_assessment = 'male';
  }
  if (!data.neck_cm && data.waist_cm) {
    data.neck_cm = Math.max(30, Number(data.waist_cm) - 10);
  } else if (!data.neck_cm) {
    data.neck_cm = 38;
  }
  if (!data.waist_cm) {
    data.waist_cm = 80;
  }
  if (!data.resting_hr) {
    data.resting_hr = 72;
  }

  requiredFields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`Missing required field: ${field}`);
    }
  });

  if (errors.length > 0) return { isValid: false, errors };

  // Parse numeric values
  data.age_at_assessment = Number(data.age_at_assessment);
  data.weight_kg = Number(data.weight_kg);
  data.height_cm = Number(data.height_cm);
  data.neck_cm = Number(data.neck_cm);
  data.waist_cm = Number(data.waist_cm);
  if (data.hip_cm !== undefined && data.hip_cm !== null && data.hip_cm !== '') {
    data.hip_cm = Number(data.hip_cm);
  }
  data.resting_hr = Number(data.resting_hr);

  // Auto convert inches to cm if entered in inches (< 50 cm for waist/hip or < 20 for neck)
  if (data.waist_cm > 0 && data.waist_cm < 50) {
    data.waist_cm = Math.round(data.waist_cm * 2.54 * 10) / 10;
  }
  if (data.hip_cm > 0 && data.hip_cm < 50) {
    data.hip_cm = Math.round(data.hip_cm * 2.54 * 10) / 10;
  }
  if (data.neck_cm > 0 && data.neck_cm < 20) {
    data.neck_cm = Math.round(data.neck_cm * 2.54 * 10) / 10;
  }

  // Gender & Hip validation
  const gender = (data.gender_at_assessment || '').toLowerCase();
  if (gender !== 'male' && gender !== 'female') {
    errors.push("gender_at_assessment must be 'male' or 'female'");
  }
  
  if (gender === 'female' && (data.hip_cm === undefined || data.hip_cm === null || Number.isNaN(data.hip_cm))) {
    errors.push("hip_cm is strictly required for female assessments (US Navy Formula requirement)");
  }

  // Boundary validations (broadened to accept valid measurements in both inches & cm)
  if (data.age_at_assessment < 5 || data.age_at_assessment > 120) errors.push("Age out of reasonable bounds (5-120)");
  if (data.weight_kg < 10 || data.weight_kg > 350) errors.push("Weight out of reasonable bounds (10-350kg)");
  if (data.height_cm < 30 || data.height_cm > 300) errors.push("Height out of reasonable bounds (30-300cm)");
  if (data.resting_hr < 30 || data.resting_hr > 220) errors.push("Resting HR out of reasonable bounds (30-220)");
  if (data.neck_cm < 10 || data.neck_cm > 150) errors.push("Neck circumference out of reasonable bounds");
  if (data.waist_cm < 10 || data.waist_cm > 300) errors.push("Waist circumference out of reasonable bounds");
  
  if (data.hip_cm !== undefined && data.hip_cm !== null && !Number.isNaN(data.hip_cm)) {
    if (data.hip_cm < 10 || data.hip_cm > 300) errors.push("Hip circumference out of reasonable bounds");
  }

  // Enum validations & goal normalization
  const validActivities = ['sedentary', 'light', 'moderate', 'active'];
  if (!validActivities.includes(data.activity_level)) {
    data.activity_level = 'moderate';
  }

  let goal = (data.fitness_goal || '').toLowerCase();
  if (goal.includes('maintain') || goal.includes('general')) {
    data.fitness_goal = 'maintenance';
  } else if (goal.includes('body') || goal.includes('builder')) {
    data.fitness_goal = 'body_builder';
  } else if (goal.includes('gain') || goal.includes('muscle') || goal.includes('prep')) {
    data.fitness_goal = 'muscle_gain';
  } else if (goal.includes('loss') || goal.includes('fat') || goal.includes('weight_loss')) {
    data.fitness_goal = 'fat_loss';
  } else if (goal.trim()) {
    data.fitness_goal = goal.trim().replace(/\s+/g, '_');
  } else {
    data.fitness_goal = 'fat_loss';
  }
  
  // Zero Division Pre-Checks
  if (data.height_cm === 0) errors.push("Height cannot be zero.");

  // Logarithmic bounds check (US Navy Formula constraints)
  if (gender === 'male' && (data.waist_cm - data.neck_cm) <= 0) {
    errors.push("Waist circumference must be greater than neck circumference for male BF% calculations.");
  }
  if (gender === 'female' && (data.waist_cm + data.hip_cm - data.neck_cm) <= 0) {
    errors.push("Waist + Hip circumference must be greater than neck circumference for female BF% calculations.");
  }

  return { isValid: errors.length === 0, errors };
};
