export const ASSESSMENT_CONFIG = {
  ENGINE_VERSION: "1.0.0",
  ACTIVITY_MULTIPLIERS: {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725
  },
  GOAL_ADJUSTMENTS: {
    fat_loss: -500,
    maintenance: 0,
    muscle_gain: 350
  },
  MACRO_RATIOS: {
    protein_per_kg_lbm: 2.2, 
    fat_percentage: 0.25     
  },
  HEART_RATE_ZONES: {
    fat_burn_low: 0.60,
    fat_burn_high: 0.70,
    cardio_low: 0.70,
    cardio_high: 0.80
  }
};
