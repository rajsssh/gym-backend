// // // src/modules/branch/branch.controller.js
// // import {
// //   createBranchService,
// //   listBranchesService,
// //   getBranchByIdService,
// //   updateBranchService,
// //   deleteBranchService,
// //   getBranchByAdminIdService
// // } from "./branch.service.js";

// // export const createBranch = async (req, res, next) => {
// //   try {
// //     const branch = await createBranchService(req.body);
// //     res.json({ success: true, branch });
// //   } catch (err) {
// //     next(err);
// //   }
// // };

// // export const listBranches = async (req, res, next) => {
// //   try {
// //     const branches = await listBranchesService();
// //     res.json({ success: true, branches });
// //   } catch (err) {
// //     next(err);
// //   }
// // };

// // export const getBranchById = async (req, res, next) => {
// //   try {
// //     const branch = await getBranchByIdService(req.params.id);
// //     res.json({ success: true, branch });
// //   } catch (err) {
// //     next(err);
// //   }
// // };

// // export const getBranchByAdminId = async (req, res, next) => {
// //   try {
// //     const { adminId } = req.params;
// //     const branch = await getBranchByAdminIdService(adminId);

// //     res.json({
// //       success: true,
// //       branch,
// //     });
// //   } catch (err) {
// //     next(err);
// //   }
// // };

// // export const updateBranch = async (req, res, next) => {
// //   try {
// //     const branch = await updateBranchService(req.params.id, req.body);
// //     res.json({ success: true, branch });
// //   } catch (err) {
// //     next(err);
// //   }
// // };

// // export const deleteBranch = async (req, res, next) => {
// //   try {
// //     const result = await deleteBranchService(req.params.id);
// //     res.json({ success: true, ...result });
// //   } catch (err) {
// //     next(err);
// //   }
// // };


// // src/modules/branch/branch.controller.js
// import {
//   createBranchService,
//   listBranchesService,
//   getBranchByIdService,
//   updateBranchService,
//   deleteBranchService,
//   getBranchByAdminIdService,
// } from "./branch.service.js";

// // CREATE BRANCH
// export const createBranch = async (req, res, next) => {
//   try {
//     const branch = await createBranchService(req.body);
//     return res.status(201).json({
//       success: true,
//       message: "Branch created successfully",
//       branch,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // LIST ALL BRANCHES
// export const listBranches = async (req, res, next) => {
//   try {
//     const branches = await listBranchesService();
//     return res.json({
//       success: true,
//       branches,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET BRANCH BY ID
// export const getBranchById = async (req, res, next) => {
//   try {
//     const branch = await getBranchByIdService(req.params.id);
//     return res.json({
//       success: true,
//       branch,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // GET BRANCH BY ADMIN ID
// export const getBranchByAdminId = async (req, res, next) => {
//   try {
//     const { adminId } = req.params;
//     const branches = await getBranchByAdminIdService(adminId);

//     return res.json({
//       success: true,
//       branches, // returns all branches assigned to admin
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // UPDATE BRANCH
// export const updateBranch = async (req, res, next) => {
//   try {
//     const branch = await updateBranchService(req.params.id, req.body);
//     return res.json({
//       success: true,
//       message: "Branch updated successfully",
//       branch,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // DELETE BRANCH
// export const deleteBranch = async (req, res, next) => {
//   try {
//     const result = await deleteBranchService(req.params.id);
//     return res.json({
//       success: true,
//       message: result.message,
//     });
//   } catch (err) {
//     next(err);
//   }
// };



import {
  createBranchService,
  listBranchesService,
  getBranchByIdService,
  getBranchByAdminIdService,
  updateBranchService,
  deleteBranchService
} from "./branch.service.js";

export const createBranch = async (req, res, next) => {
  try {
    const branch = await createBranchService(req.body);
    res.json({ success: true, branch });
  } catch (err) {
    next(err);
  }
};

export const listBranches = async (req, res, next) => {
  try {
    const branches = await listBranchesService();
    res.json({ success: true, branches });
  } catch (err) {
    next(err);
  }
};

export const getBranchById = async (req, res, next) => {
  try {
    const branch = await getBranchByIdService(Number(req.params.id));
    res.json({ success: true, branch });
  } catch (err) {
    next(err);
  }
};

export const getBranchByAdminId = async (req, res, next) => {
  try {
    const branches = await getBranchByAdminIdService(Number(req.params.adminId));
    res.json({ success: true, branches });
  } catch (err) {
    next(err);
  }
};

export const updateBranch = async (req, res, next) => {
  try {
    const branch = await updateBranchService(Number(req.params.id), req.body);
    res.json({ success: true, branch });
  } catch (err) {
    next(err);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const result = await deleteBranchService(Number(req.params.id));
    res.json({ success: true, message: result.message });
  } catch (err) {
    next(err);
  }
};
