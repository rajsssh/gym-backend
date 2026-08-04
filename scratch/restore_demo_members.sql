-- ============================================================
-- Restore 3 Specific Demo Members
-- Source: backup_gym_new_db.sql (June 26, 2026 11:23 AM)
-- Restoring: demogirl@gmail.com, demoaayu@gmail.com
--            + demoboy@gmail.com (was also present in backup)
-- akdemo@gmail.com and deepdemo@gmail.com are NOT in any backup.
-- ============================================================

START TRANSACTION;

SET FOREIGN_KEY_CHECKS=0;

INSERT IGNORE INTO `user`
  (`id`,`adminId`,`fullName`,`email`,`password`,`phone`,`roleId`,`branchId`,`createdAt`,`address`,`description`,`duration`,`gymName`,`planName`,`price`,`status`,`dateOfBirth`,`gender`,`address_street`,`address_city`,`address_state`,`address_zip`,`profileImage`,`gstNumber`,`tax`,`gymAddress`,`licenseExpiryDate`,`licenseKey`,`whatsappPlan`,`permissions`,`visiblePassword`,`whatsappCredits`,`isTrial`,`trialStartDate`,`trialEndDate`,`subscriptionPlan`,`trialStatus`,`razorpayKeyId`,`razorpayKeySecret`)
VALUES
-- ID 224: demo boy (demoboy@gmail.com) - roleId=4
(224,90,'demo boy','demoboy@gmail.com','$2b$10$xMgLjnERgs3JU4toOTxGV.W9l0L1bUE39v5/Pi7fTJ24EqhNoRDYK','7894561234',4,NULL,'2026-06-15 14:21:59.005','demo street, demo city ',NULL,NULL,NULL,NULL,NULL,'Active','1998-12-28',NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1781513517/users/profile/egljij6lqw3qbkblb80r.jpg',NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic','None',NULL,NULL),

-- ID 225: Demo girl (demogirl@gmail.com) - roleId=4
(225,90,'Demo girl','demogirl@gmail.com','$2b$10$oQ/0HcuOdFAY/.NkIooRee2HS.XGtlw7.6DI3xwi3AGeN1T6Gsdjq','457869123',4,NULL,'2026-06-15 15:11:44.759','demo street',NULL,NULL,NULL,NULL,NULL,'Active','1999-08-21',NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1781516504/users/profile/e9x7ms3n7ay59oj0gc97.jpg',NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic','None',NULL,NULL),

-- ID 227: Demo Aayush (demoaayu@gmail.com) - roleId=4
(227,90,'Demo Aayush','demoaayu@gmail.com','$2b$10$/qC8JqA2Yq6IxtKKEGJey.btosdudsAV5IQCuoRnb05v0nUyFXd.q','1234567890',4,NULL,'2026-06-17 13:28:37.723','demo street',NULL,NULL,NULL,NULL,NULL,'Active','2002-01-01',NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1781683117/users/profile/f5kzs3ldapiae0kogzzl.jpg',NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic','None',NULL,NULL);

SET FOREIGN_KEY_CHECKS=1;

-- Verify
SELECT id, fullName, email, phone, roleId, status, createdAt
FROM user
WHERE email IN ('demoboy@gmail.com','demogirl@gmail.com','demoaayu@gmail.com','akdemo@gmail.com','deepdemo@gmail.com')
ORDER BY id;

COMMIT;
