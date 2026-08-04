-- Fix table case sensitivity and pluralization issues for Railway (Linux MySQL is case-sensitive)
-- Old migration created PascalCase tables (User, Role, Branch etc.)
-- Another deployment created pluralized tables (users, roles, sessions, plans etc.)
-- Current schema uses lowercase singular (user, role, branch etc.)
-- This migration renames all PascalCase and Plural tables to lowercase singular

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- ==========================================
-- Rename PascalCase tables to lowercase
-- ==========================================
RENAME TABLE IF EXISTS `Role` TO `role_temp_migration`;
RENAME TABLE IF EXISTS `role_temp_migration` TO `role`;

RENAME TABLE IF EXISTS `Branch` TO `branch_temp_migration`;
RENAME TABLE IF EXISTS `branch_temp_migration` TO `branch`;

RENAME TABLE IF EXISTS `User` TO `user_temp_migration`;
RENAME TABLE IF EXISTS `user_temp_migration` TO `user`;

RENAME TABLE IF EXISTS `Member` TO `member_temp_migration`;
RENAME TABLE IF EXISTS `member_temp_migration` TO `member`;

RENAME TABLE IF EXISTS `Plan` TO `plan_temp_migration`;
RENAME TABLE IF EXISTS `plan_temp_migration` TO `plan`;

RENAME TABLE IF EXISTS `MemberAttendance` TO `memberattendance_temp_migration`;
RENAME TABLE IF EXISTS `memberattendance_temp_migration` TO `memberattendance`;

RENAME TABLE IF EXISTS `StaffAttendance` TO `staffattendance_temp_migration`;
RENAME TABLE IF EXISTS `staffattendance_temp_migration` TO `staffattendance`;

RENAME TABLE IF EXISTS `ClassType` TO `classtype_temp_migration`;
RENAME TABLE IF EXISTS `classtype_temp_migration` TO `classtype`;

RENAME TABLE IF EXISTS `ClassSchedule` TO `classschedule_temp_migration`;
RENAME TABLE IF EXISTS `classschedule_temp_migration` TO `classschedule`;

RENAME TABLE IF EXISTS `Booking` TO `booking_temp_migration`;
RENAME TABLE IF EXISTS `booking_temp_migration` TO `booking`;

RENAME TABLE IF EXISTS `Payment` TO `payment_temp_migration`;
RENAME TABLE IF EXISTS `payment_temp_migration` TO `payment`;

RENAME TABLE IF EXISTS `Alert` TO `alert_temp_migration`;
RENAME TABLE IF EXISTS `alert_temp_migration` TO `alert`;

RENAME TABLE IF EXISTS `Expense` TO `expense_temp_migration`;
RENAME TABLE IF EXISTS `expense_temp_migration` TO `expense`;

RENAME TABLE IF EXISTS `DietPlan` TO `dietplan_temp_migration`;
RENAME TABLE IF EXISTS `dietplan_temp_migration` TO `dietplan`;

RENAME TABLE IF EXISTS `DietMeal` TO `dietmeal_temp_migration`;
RENAME TABLE IF EXISTS `dietmeal_temp_migration` TO `dietmeal`;

RENAME TABLE IF EXISTS `DietPlanAssignment` TO `dietplanassignment_temp_migration`;
RENAME TABLE IF EXISTS `dietplanassignment_temp_migration` TO `dietplanassignment`;

RENAME TABLE IF EXISTS `WorkoutPlan` TO `workoutplan_temp_migration`;
RENAME TABLE IF EXISTS `workoutplan_temp_migration` TO `workoutplan`;

RENAME TABLE IF EXISTS `WorkoutExercise` TO `workoutexercise_temp_migration`;
RENAME TABLE IF EXISTS `workoutexercise_temp_migration` TO `workoutexercise`;

RENAME TABLE IF EXISTS `WorkoutPlanAssignment` TO `workoutplanassignment_temp_migration`;
RENAME TABLE IF EXISTS `workoutplanassignment_temp_migration` TO `workoutplanassignment`;

RENAME TABLE IF EXISTS `NotificationLog` TO `notificationlog_temp_migration`;
RENAME TABLE IF EXISTS `notificationlog_temp_migration` TO `notificationlog`;

RENAME TABLE IF EXISTS `Product` TO `product_temp_migration`;
RENAME TABLE IF EXISTS `product_temp_migration` TO `product`;

RENAME TABLE IF EXISTS `StockMovement` TO `stockmovement_temp_migration`;
RENAME TABLE IF EXISTS `stockmovement_temp_migration` TO `stockmovement`;

RENAME TABLE IF EXISTS `Purchase` TO `purchase_temp_migration`;
RENAME TABLE IF EXISTS `purchase_temp_migration` TO `purchase`;


-- ==========================================
-- Rename Plural tables to Singular
-- ==========================================
RENAME TABLE IF EXISTS `users` TO `user_plural_migration`;
RENAME TABLE IF EXISTS `user_plural_migration` TO `user`;

RENAME TABLE IF EXISTS `roles` TO `role_plural_migration`;
RENAME TABLE IF EXISTS `role_plural_migration` TO `role`;

RENAME TABLE IF EXISTS `plans` TO `plan_plural_migration`;
RENAME TABLE IF EXISTS `plan_plural_migration` TO `plan`;

RENAME TABLE IF EXISTS `sessions` TO `session_plural_migration`;
RENAME TABLE IF EXISTS `session_plural_migration` TO `session`;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
