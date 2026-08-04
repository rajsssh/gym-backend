# API Spectrum

> This file is auto-generated based on the Express Router logic. Do not edit manually.

To update this file after making API changes, run `npm run docs`.

| Route Path | Methods | Middleware |
|------------|---------|------------|
| `/api/ping` | GET | anonymous |
| `/api/auth/register` | POST | register |
| `/api/auth/login` | POST | login |
| `/api/auth/user/:id` | GET, PUT, DELETE | getUserById |
| `/api/auth/admins` | GET | getAdmins |
| `/api/auth/dashboard` | GET | getDashboardStats |
| `/api/auth/changepassword` | PUT | changePasswordController |
| `/api/auth/admindashboard/:id` | GET | getAdminDashboard |
| `/api/branches/create` | POST | createBranch |
| `/api/branches` | GET | listBranches |
| `/api/branches/by-admin/:adminId` | GET | getBranchByAdminId |
| `/api/branches/:id` | GET, PUT, DELETE | getBranchById |
| `/api/staff/create` | POST | createStaff |
| `/api/staff/all/:adminId` | GET | getAllStaff |
| `/api/staff/trainers/:id` | GET | getTrainerById |
| `/api/staff/admin/:adminId` | GET | listStaff |
| `/api/staff/detail/:id` | GET | anonymous, staffDetail |
| `/api/staff/update/:id` | PUT | updateStaff |
| `/api/staff/delete/:id` | DELETE | deleteStaff |
| `/api/members/create` | POST | createMember |
| `/api/members/renew/:memberId` | PUT | renewMembershipPlan |
| `/api/members/branch/:branchId` | GET | listMembers |
| `/api/members/renew/:adminId` | GET | getRenewalPreview |
| `/api/members/detail/:id` | GET | memberDetail |
| `/api/members/admin/renewal/:memberId/status` | PUT | updateMemberRenewalStatus |
| `/api/members/update/:id` | PUT | updateMember |
| `/api/members/delete/:id` | DELETE | deleteMember |
| `/api/members/admin/:adminId` | GET | getMembersByAdminId |
| `/api/members/admin/:adminId/plan` | GET | getMembersByAdminAndPlanController |
| `/api/members/group-plan/:adminId/admin/:planId` | GET | getMembersByAdminAndGroupPlanController |
| `/api/members/member-plan/general/:adminId/admin/:planId` | GET | getMembersByAdminAndGeneralMemberPlanController |
| `/api/members/pt-bookings/:branchId` | GET | listPTBookings |
| `/api/plans/create` | POST | createPlan |
| `/api/plans` | GET | listPlans |
| `/api/plans/branch/:branchId` | GET | getPlansByBranch |
| `/api/plans/update/:id` | PUT | updatePlan |
| `/api/plans/delete/:id` | DELETE | deletePlan |
| `/api/attendance/member/checkin` | POST | memberCheckIn |
| `/api/attendance/member/checkout` | POST | memberCheckOut |
| `/api/attendance/member/history/:memberId` | GET | memberAttendanceList |
| `/api/attendance/staff/checkin` | POST | staffCheckIn |
| `/api/attendance/staff/checkout` | POST | staffCheckOut |
| `/api/attendance/staff/history/:staffId` | GET | staffAttendanceList |
| `/api/class/trainers` | GET | getTrainers |
| `/api/class/scheduled/update/:id` | PUT | updateSchedule |
| `/api/class/scheduled/delete/:id` | DELETE | deleteSchedule |
| `/api/class/scheduled/all/:adminId` | GET | getAllScheduledClasses |
| `/api/class/scheduled/aan /:id` | GET | getScheduleById |
| `/api/class/trainers/personal-general` | GET | getPersonalAndGeneralTrainers |
| `/api/class/classtype/create` | POST | createClassType |
| `/api/class/classtype` | GET | listClassTypes |
| `/api/class/schedule/create` | POST | createSchedule |
| `/api/class/schedule/branch/:branchId` | GET | listSchedules |
| `/api/class/classes/member/:memberId` | GET | getScheduledClassesWithBookingStatus |
| `/api/class/book` | POST | bookClass |
| `/api/class/cancel` | POST | cancelBooking |
| `/api/class/member/:memberId` | GET | memberBookings |
| `/api/payments/create` | POST | recordPayment |
| `/api/payments/member/:memberId` | GET | paymentHistory |
| `/api/payments/branch/:branchId` | GET | allPayments |
| `/api/dashboard/dashboard` | GET | getSuperAdminDashboard |
| `/api/dashboard/recepitonishdsh` | GET | getReceptionistDashboard |
| `/api/dashboard` | GET | getDashboardData |
| `/api/memberattendence/admin` | GET | getAttendanceByAdminId |
| `/api/memberattendence/checkin` | POST | memberCheckIn |
| `/api/memberattendence/checkout/:id` | PUT | memberCheckOut |
| `/api/memberattendence/daily` | GET | getDailyAttendance |
| `/api/memberattendence/:memberId` | GET | getAttendanceByMemberId |
| `/api/memberattendence/:id` | GET | attendanceDetail |
| `/api/memberattendence/summary/today` | GET | getTodaySummary |
| `/api/memberattendence/delete/:id` | DELETE | deleteAttendance |
| `/api/alerts` | GET | getAlerts |
| `/api/expenses/create` | POST | anonymous, addExpense |
| `/api/expenses/branch/:branchId` | GET | anonymous, listExpenses |
| `/api/expenses/summary/:branchId` | GET | anonymous, expenseSummary |
| `/api/finance/report/:branchId?` | GET | anonymous, getFinanceReport |
| `/api/diet/create` | POST | createDietPlan |
| `/api/diet/assign` | POST | assignDietPlan |
| `/api/diet/member/:memberId` | GET | getMemberDietPlan |
| `/api/workout/create` | POST | anonymous, createWorkoutPlan |
| `/api/workout/assign` | POST | anonymous, assignWorkoutPlan |
| `/api/workout/member/:memberId` | GET | anonymous, getMemberWorkoutPlan |
| `/api/notify/send` | POST | anonymous, sendNotification |
| `/api/invoices/:id` | GET | anonymous, generateInvoicePdf |
| `/api/inventory/product/create` | POST | anonymous, createProduct |
| `/api/inventory/product/branch/:branchId` | GET | anonymous, listProducts |
| `/api/inventory/product/update/:id` | PUT | anonymous, updateProduct |
| `/api/inventory/stock/adjust` | POST | anonymous, adjustStock |
| `/api/inventory/product/history/:productId` | GET | anonymous, productHistory |
| `/api/purchases` | POST, GET | createPurchase |
| `/api/purchases/purchase/status/:id` | PUT | updatePurchaseStatus |
| `/api/MemberPlan/all` | GET | getMemberPlansnewss |
| `/api/MemberPlan` | GET, POST | getMemberPlans |
| `/api/MemberPlan/:id` | GET, DELETE | getMemberPlan |
| `/api/MemberPlan/:adminId/:planId` | PUT | updatePlan |
| `/api/member-plan-assignments/assign` | POST | assignPlans |
| `/api/member-plan-assignments/member/:memberId` | GET | getMemberAssignments |
| `/api/member-plan-assignments/member/:memberId/active` | GET | getActivePlans |
| `/api/member-plan-assignments/:id` | PUT, DELETE | updateAssignment |
| `/api/member-plan-assignments/:id/permanent` | DELETE | deleteAssignmentPermanently |
| `/api/member-plan-assignments/plan/:planId/members` | GET | getPlanMembers |
| `/api/member-plan-assignments/:id/renew` | POST | renewAssignment |
| `/api/sessions/create` | POST | createSession |
| `/api/sessions/:adminId/:trainerId?` | GET | listSessions |
| `/api/sessions/update/:sessionId` | PUT | updateSession |
| `/api/sessions/status/:sessionId` | PUT | updateSessionStatus |
| `/api/sessions/delete/:sessionId` | DELETE | deleteSession |
| `/api/salaries/create` | POST | createSalary |
| `/api/salaries/:adminId` | GET | getAllSalaries |
| `/api/salaries/staff/:staffId` | GET | getSalaryByStaffId |
| `/api/salaries/:salaryId` | GET, PUT, DELETE | getSalaryById |
| `/api/housekeepingtask/create` | POST | createTask |
| `/api/housekeepingtask/all` | GET | getAllTasks |
| `/api/housekeepingtask/:id` | GET, PUT, DELETE | getTaskById |
| `/api/housekeepingtask/branch/:branchId` | GET | getTaskByBranchID |
| `/api/housekeepingtask/tasks/admin/:adminId` | GET | getTasksByAdminId |
| `/api/housekeepingtask/asignedto/:asignedtoID` | GET | getTaskAsignedTo |
| `/api/housekeepingtask/status/:id` | PUT | updateTaskStatus |
| `/api/staff-attendance/checkin` | POST | staffCheckIn |
| `/api/staff-attendance/checkout/:id` | PUT | staffCheckOut |
| `/api/staff-attendance/daily` | GET | getDailyStaffAttendance |
| `/api/staff-attendance/detail/:id` | GET | staffAttendanceDetail |
| `/api/staff-attendance/summary/today` | GET | getTodayStaffSummary |
| `/api/staff-attendance/housekeeping/dashboard` | GET | getHousekeepingAttendance |
| `/api/staff-attendance/housekeeping/today/:staffId` | GET | getTodayHousekeeperHistory |
| `/api/staff-attendance/report` | GET | getAttendanceReportByAdmin |
| `/api/housekeepingdashboard` | GET | getHousekeepingDashboard |
| `/api/generaltrainer/dashboard` | GET | getDashboardData |
| `/api/generaltrainer/:adminId/group-plans` | GET | getAllGroupTrainingPlans |
| `/api/generaltrainer/:branchId/group-plans/:planId/members` | GET | getPlanMembers |
| `/api/generaltrainer/:branchId/members/:memberId/bookings` | GET | getMemberBookings |
| `/api/generaltrainer/:adminId/class-performance` | GET | getClassPerformanceReport |
| `/api/generaltrainer/:id` | GET, DELETE | getAttendanceById |
| `/api/generaltrainer/branch/:branchId/members` | GET | getAllMembersByBranch |
| `/api/generaltrainer/checkin` | POST | checkInMember |
| `/api/generaltrainer/:id/checkout` | PUT | checkOutMember |
| `/api/shift/create` | POST | createShift |
| `/api/shift/all/:adminId` | GET | getAllShifts |
| `/api/shift/:id` | GET, PUT, DELETE | getShiftById |
| `/api/shift/byshiftId/:shiftId` | GET | getShiftByShiftId |
| `/api/shift/bystaff/:staffId` | GET | getShiftByStaffId |
| `/api/shift/status/:id` | PUT | updateShiftStatus |
| `/api/personal-trainer-dashboard/trainer/:adminId` | GET | getPersonalTrainerDashboard |
| `/api/personal-trainer-dashboard/admin/:adminId/plans` | GET | getPersonalTrainingPlansByAdmin |
| `/api/personal-trainer-dashboard/admin/:adminId/plan/:planId/customers` | GET | getPersonalTrainingCustomersByAdmin |
| `/api/member-dashboard/:memberId/dashboard` | GET | getMemberDashboard |
| `/api/admin-staff-attendance` | POST, GET | createStaffAttendance |
| `/api/admin-staff-attendance/branch/:branchId` | GET | getStaffAttendanceByBranchId |
| `/api/admin-staff-attendance/:id` | GET, PUT, DELETE | getStaffAttendanceById |
| `/api/member-self/profile/:userId` | GET, PUT | getMemberProfile |
| `/api/member-self/password/:userId` | PUT | changeMemberPassword |
| `/api/reports/members` | GET | generateMemberReportController |
| `/api/reports/personal-trainer` | GET | generatePersonalTrainerReportController |
| `/api/reports/attendance/:adminId` | GET | getMemberAttendanceReport |
| `/api/reports/general-trainer` | GET | generateGeneralTrainerReportController |
| `/api/reports/reception/:adminId` | GET | getReceptionReportForAdmin |
| `/api/reports/manager-report` | GET | getManagerReportController |
| `/api/reports/personal-trainer/staff/:adminId/:staffId` | GET | generatePersonalTrainerReportByStaffController |
| `/api/reports/general-trainer/staff/:adminId/:staffId` | GET | generateGeneralTrainerReportByStaffController |
| `/api/reports/housekeeping/admin/:adminId` | GET | getAdminHousekeepingReport |
| `/api/reports/housekeeping/admin/:adminId/staff/:staffId` | GET | getStaffHousekeepingReport |
| `/api/booking/create` | POST | createBookingRequest |
| `/api/booking/admin/booking-requests/:adminId` | GET | getBookingRequestsForAdmin |
| `/api/booking/approve/:bookingRequestId` | POST | approveBookingRequest |
| `/api/booking/requests` | GET | getAllBookingRequests |
| `/api/booking/branch/:branchId` | GET | getBookingRequestsByBranch |
| `/api/booking/admin/:adminId` | GET | getBookingRequestsByAdmin |
| `/api/booking/member/:memberId` | GET | getBookingRequestsByMember |
| `/api/booking/approve/:requestId` | PUT | approveBooking |
| `/api/booking/reject/:requestId` | PUT | rejectBooking |
| `/api/booking/unified/create` | POST | createUnifiedBooking |
| `/api/booking/unifiedbybranch/:adminId` | GET | getUnifiedBookingsByBranch |
| `/api/booking/unifiedbymember/:memberId` | GET | getUnifiedBookingsByMember |
| `/api/booking/unifiedbytrainer/:trainerId` | GET | getUnifiedBookingsByTrainer |
| `/api/booking/unifiedbyPersonalGeneral/:adminId` | GET | getUnifiedPersonalAndGeneralTrainersService |
| `/api/booking/unifiedbybookin/:bookingId` | GET | getPTBookingById |
| `/api/booking/unifiedbybooking/:id` | GET | getUnifiedBookingById |
| `/api/booking/unifiedupdate/:id` | PUT | updateUnifiedBooking |
| `/api/booking/deleteunified/:bookingId` | DELETE | deleteUnifiedBooking |
| `/api/booking/getptDetailsByAdminId/:adminId` | GET | getPTBookingsByAdminId |
| `/api/adminSettings/app-settings` | POST, GET | createAppSettingsController |
| `/api/adminSettings/app-settings/admin/:adminId` | GET | getAppSettingsByAdminIdController |
| `/api/adminSettings/app-settings/:id` | GET, PUT, DELETE | getAppSettingsByIdController |
| `/` | GET | anonymous |
