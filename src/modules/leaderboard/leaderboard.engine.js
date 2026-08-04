/**
 * Leaderboard Scoring Engine
 * Spec compliant: Goal-based percentage scoring with safety clamps and no age/gender multipliers.
 */

export class LeaderboardEngine {
  /**
   * Kept for backward compatibility.
   */
  static getDemographicMultiplier(age, gender) {
    const isMale = (gender || '').toLowerCase() === 'male';
    if (age < 18) return isMale ? 0.95 : 1.06;
    if (age >= 18 && age <= 29) return isMale ? 1.00 : 1.12;
    if (age >= 30 && age <= 35) return isMale ? 1.04 : 1.16;
    if (age >= 36 && age <= 40) return isMale ? 1.09 : 1.22;
    if (age >= 41 && age <= 45) return isMale ? 1.15 : 1.29;
    if (age >= 46 && age <= 50) return isMale ? 1.22 : 1.37;
    if (age >= 51 && age <= 55) return isMale ? 1.30 : 1.46;
    if (age >= 56 && age <= 60) return isMale ? 1.39 : 1.56;
    return isMale ? 1.50 : 1.68;
  }

  /**
   * Calculate leaderboard score per exact specification:
   *
   * 1. Fat Loss:
   *    Fat Loss Score = ((Baseline BF% - Current BF%) / Baseline BF%) * 100
   *
   * 2. Muscle Gain:
   *    Muscle Gain Score = ((Current LBM - Baseline LBM) / Baseline LBM) * 100
   *
   * 3. Maintenance:
   *    Maintenance Score = MAX(0, 100 - ABS(Current BF% - Baseline BF%) - ABS(Current LBM - Baseline LBM))
   *
   * Excluded: body_builder / Body Builder members must NOT participate in any leaderboard.
   */
  static calculateScore(member) {
    const { fitness_goal, baseline_bf, current_bf, baseline_lbm, current_lbm } = member;
    const goal = (fitness_goal || '').toLowerCase().trim();

    // Body Builder is explicitly excluded from leaderboard processing
    if (goal === 'body_builder' || goal === 'bodybuilder' || goal.includes('body')) {
      return null;
    }

    const bBF = parseFloat(baseline_bf);
    const cBF = parseFloat(current_bf);
    const bLBM = parseFloat(baseline_lbm);
    const cLBM = parseFloat(current_lbm);

    let score = null;

    if (goal === 'fat_loss') {
      if (isNaN(bBF) || bBF <= 0 || isNaN(cBF) || cBF <= 0) return null;
      score = ((bBF - cBF) / bBF) * 100;
    } else if (goal === 'muscle_gain') {
      if (isNaN(bLBM) || bLBM <= 0 || isNaN(cLBM) || cLBM <= 0) return null;
      score = ((cLBM - bLBM) / bLBM) * 100;
    } else if (goal === 'maintenance') {
      if (isNaN(bBF) || bBF <= 0 || isNaN(cBF) || cBF <= 0 || isNaN(bLBM) || bLBM <= 0 || isNaN(cLBM) || cLBM <= 0) return null;
      const bfDiff = Math.abs(cBF - bBF);
      const lbmDiff = Math.abs(cLBM - bLBM);
      score = Math.max(0, 100 - bfDiff - lbmDiff);
    } else {
      return null;
    }

    if (score === null || isNaN(score) || !isFinite(score)) return null;

    return parseFloat(score.toFixed(2));
  }

  static calculateAllScores(member) {
    return {
      fat_loss_score: LeaderboardEngine.calculateScore({ ...member, fitness_goal: 'fat_loss' }),
      muscle_gain_score: LeaderboardEngine.calculateScore({ ...member, fitness_goal: 'muscle_gain' }),
      maintenance_score: LeaderboardEngine.calculateScore({ ...member, fitness_goal: 'maintenance' }),
    };
  }
}
