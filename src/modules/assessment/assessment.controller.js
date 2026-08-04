import * as assessmentService from './assessment.service.js';

export const createAssessment = async (req, res) => {
  try {
    const createdBy = req.user ? req.user.id : 1; // Fallback to 1 if not authed locally
    const result = await assessmentService.createAssessment(req.body, createdBy);
    return res.status(201).json({
      success: true,
      message: "Assessment logged successfully",
      data: result
    });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ success: false, message: error.message, errors: error.details });
    }
    if (error.status === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error("Assessment Creation Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getLatestAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await assessmentService.getLatestAssessment(id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ success: false, message: error.message });
    }
    console.error("Assessment Fetch Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAssessmentHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await assessmentService.getAssessmentHistory(id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Assessment History Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
