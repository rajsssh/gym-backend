import {
  createSalaryService,
  getAllSalariesService,
  getSalaryByIdService,
  deleteSalaryService,
  updateSalaryService
} from "./salary.service.js";

// ====== CREATE ======
export const createSalary = async (req, res) => {
  try {
    const salary = await createSalaryService(req.body);
    return res.status(201).json({
      success: true,
      message: "Salary generated successfully",
      data: salary,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====== GET ALL ======
export const getAllSalaries = async (req, res) => {
  try {
    const adminId = Number(req.params.adminId);

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required"
      });
    }

    const data = await getAllSalariesService(adminId);

    return res.json({ success: true, data });
  } catch (error) {
    console.error("Get All Salaries Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong"
    });
  }
};



// ====== GET BY ID ======
export const getSalaryById = async (req, res) => {
  try {
    // use the same param name as your routes (salaryId)
    const identifier = req.params.salaryId ?? req.params.id;
    const data = await getSalaryByIdService(identifier);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(404).json({ success: false, message: error.message });
  }
};
// ====== DELETE ======
export const deleteSalary = async (req, res) => {
  try {
    await deleteSalaryService(req.params.salaryId);
    return res.json({ success: true, message: "Salary deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ====== UPDATE ======
export const updateSalary = async (req, res) => {
  try {
    const data = await updateSalaryService(req.params.salaryId, req.body);
    return res.json({
      success: true,
      message: "Salary updated successfully",
      data,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


import { getSalaryByStaffIdService } from "./salary.service.js";

export const getSalaryByStaffId = async (req, res) => {
  try {
    const { staffId } = req.params;

    const data = await getSalaryByStaffIdService(staffId);

    return res.status(200).json({
      success: true,
      message: "Salary records fetched successfully",
      data
    });

  } catch (error) {
    console.error("Get Salary By Staff ID Error:", error);
    return res.status(404).json({
      success: false,
      message: error.message || "Something went wrong"
    });
  }
};
