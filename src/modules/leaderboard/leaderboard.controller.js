import { getLeaderboardByGoal } from './leaderboard.service.js';

export const getLeaderboard = async (req, res) => {
  try {
    const { branchId, goal, fitness_goal, month } = req.query;
    const selectedGoal = (goal || fitness_goal || 'fat_loss').toLowerCase();

    const validGoals = ['fat_loss', 'muscle_gain', 'maintenance'];
    if (!validGoals.includes(selectedGoal)) {
      return res.status(400).json({
        status: false,
        message: `Invalid goal. Must be one of: ${validGoals.join(', ')}`
      });
    }

    const result = await getLeaderboardByGoal(branchId, selectedGoal, month, 100, req.user);

    return res.status(200).json({
      status: true,
      goal: selectedGoal,
      selectedMonth: result.selectedMonth,
      monthLabel: result.monthLabel,
      availableMonths: result.availableMonths,
      message: "Leaderboard fetched successfully",
      leaderboard: result.leaderboard,
      data: result.leaderboard
    });
  } catch (error) {
    console.error("Leaderboard Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
};
