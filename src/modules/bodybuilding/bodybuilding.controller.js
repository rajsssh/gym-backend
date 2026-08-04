import * as BodybuildingService from './bodybuilding.service.js';
import { calculateBodyBuilderMetrics } from './bodyBuilderCalculation.service.js';

export const createLog = async (req, res) => {
  try {
    const { memberId } = req.params;
    if (!memberId) {
      return res.status(400).json({ status: false, message: 'memberId is required' });
    }

    if (!req.body.neck_cm || !req.body.waist_cm) {
      return res.status(400).json({ status: false, message: 'Neck (cm) and Waist (cm) are strictly required for Bodybuilder Assessments.' });
    }

    // Run the calculation engine to calculate derived metrics and check validity
    let calculatedMetrics;
    try {
      calculatedMetrics = calculateBodyBuilderMetrics({
        gender: req.body.gender,
        age: req.body.age,
        weight_kg: req.body.weight_kg,
        height_cm: req.body.height_cm,
        neck_cm: req.body.neck_cm,
        waist_cm: req.body.waist_cm,
        hip_cm: req.body.hip_cm,
        activity_level: req.body.activity_level,
        fitness_goal: req.body.fitness_goal,
        resting_hr: req.body.resting_hr
      });
    } catch (calcError) {
      return res.status(400).json({ status: false, message: calcError.message });
    }

    const newLog = await BodybuildingService.logBodybuildingMetrics(memberId, req.body);
    res.status(201).json({ 
      status: true, 
      message: 'Bodybuilding log added successfully', 
      data: { ...newLog, metrics: calculatedMetrics } 
    });
  } catch (error) {
    console.error("Error creating bodybuilding log:", error);
    res.status(500).json({ status: false, message: 'Internal Server Error', error: error.message });
  }
};

export const getLogs = async (req, res) => {
  try {
    const { memberId } = req.params;
    if (!memberId) {
      return res.status(400).json({ status: false, message: 'memberId is required' });
    }

    const logs = await BodybuildingService.getBodybuildingLogs(memberId);
    
    // Map logs to include calculated metrics
    const logsWithMetrics = logs.map(log => {
      try {
        const metrics = calculateBodyBuilderMetrics({
          gender: log.gender,
          age: log.age,
          weight_kg: log.weight_kg,
          height_cm: log.height_cm,
          neck_cm: log.neck_cm,
          waist_cm: log.waist_cm,
          hip_cm: log.hip_cm,
          activity_level: log.activity_level,
          fitness_goal: log.fitness_goal,
          resting_hr: log.resting_hr
        });
        return { ...log, metrics };
      } catch (err) {
        console.error(`Calculation error for log ID ${log.id}:`, err.message);
        return { ...log, metrics: null, calculation_error: err.message };
      }
    });

    res.status(200).json({ status: true, message: 'Logs fetched successfully', data: logsWithMetrics });
  } catch (error) {
    console.error("Error fetching bodybuilding logs:", error);
    res.status(500).json({ status: false, message: 'Internal Server Error', error: error.message });
  }
};
