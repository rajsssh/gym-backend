-- ============================================================
-- Restore Deleted Members
-- Source: db_backup_pre_assessment.sql (June 15, 2026)
-- Purpose: Re-insert only the members (roleId=4) that were
--          deleted during the database cleanup.
-- Safe: Uses INSERT IGNORE so it won't duplicate existing rows.
-- ============================================================

START TRANSACTION;

-- Temporarily allow explicit ID inserts
SET FOREIGN_KEY_CHECKS=0;

INSERT IGNORE INTO `user` 
  (`id`,`adminId`,`fullName`,`email`,`password`,`phone`,`roleId`,`branchId`,`createdAt`,`address`,`description`,`duration`,`gymName`,`planName`,`price`,`status`,`dateOfBirth`,`gender`,`address_street`,`address_city`,`address_state`,`address_zip`,`profileImage`,`gstNumber`,`tax`,`gymAddress`,`licenseExpiryDate`,`licenseKey`,`whatsappPlan`,`permissions`,`visiblePassword`,`whatsappCredits`,`isTrial`,`trialStartDate`,`trialEndDate`,`subscriptionPlan`,`trialStatus`,`razorpayKeyId`,`razorpayKeySecret`)
VALUES
-- ID 82: John Doe (roleId=4)
(82,68,'John Doe','john.doe@example.com','123','1234567890',4,33,'2025-12-11 23:23:13.000',NULL,NULL,NULL,NULL,NULL,NULL,'Active',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 89: John Smith (roleId=4)
(89,NULL,'John Smith','john@gmail.com','$2b$10$crhZxB76ZuAWo2BDk1i3AednUk5HK2zm4ApRzkyOvnsn90JPMUxPq','0770090987',4,33,'2025-12-12 23:54:44.133','123 High Street','Life Time','Yearly','GYM Fitness ','Pro','11999','active',NULL,NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1765963221/users/profile/pytkcnfpl28ilkk9rpxy.png','976856345',10.00,'indore','2026-06-13 00:00:00.000',NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 151: Sam Member (roleId=4)
(151,90,'Sam Member','sam.member@example.com','123',NULL,4,NULL,'2025-12-20 12:45:55.000',NULL,NULL,NULL,NULL,NULL,NULL,'Active',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 161: Rohit Kumar (roleId=4)
(161,90,'Rohit Kumar','rohit@gmail.com','$2b$10$nnumGwAtIfMi01Q/Hfz5ju6JtgpCBUm9epgFp1u13yT8A1O0mYWiq','682834545639',4,NULL,'2025-12-29 15:57:21.147','demo',NULL,NULL,NULL,NULL,NULL,'Active','2025-12-29',NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1767004767/users/profile/zrfba7hmbyxefjh5xujl.jpg',NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 169: Demo Member (roleId=4)
(169,164,'Demo Member','memberdemo@gmail.com','$2b$10$hf8flVewCsfxdn3CbvF.NukNV9prXOuH4TC7Boh/FIxJVm5KgXYr.','7891742645',4,33,'2025-12-29 17:06:00.646','indore, indore, Madhya Pradesh, 48946',NULL,NULL,NULL,NULL,NULL,'Active','2025-12-29','Male','indore','indore','Madhya Pradesh','48946','https://res.cloudinary.com/dw48hcxi5/image/upload/v1767084270/users/profile/qa26gdzqkf8veywmi6vx.jpg',NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 177: Test (roleId=4)
(177,164,'Test','test@gmail.com','$2b$10$JQFPaMODm505YNdSa3bCge63EyiSw7Y2V9WhyitpNzRPZWDebhc9e','879135465425',4,NULL,'2025-12-30 17:52:59.452',NULL,NULL,NULL,NULL,NULL,NULL,'Active','2025-12-30',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 180: Smith (roleId=4)
(180,90,'Smith','smith123@gmail.com','$2b$10$7ntoDhEWiZlFdlCyOxP9SOfZWfYuITkZmYSbJCMj4X5WyCODhVTb2','07700900123',4,NULL,'2026-01-01 15:24:58.429','123 High Street',NULL,NULL,NULL,NULL,NULL,'Active','2026-01-01',NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1767262712/users/profile/byjee88vrwtqu5i6x41p.jpg',NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 184: Aman (roleId=4)
(184,90,'Aman','aman@gmail.com','$2b$10$ZxtsyaU4dDrneMfMXq.XUeGZUjF.6kfl1Poc/8.gHDTnBKknsVNLO','456789091',4,NULL,'2026-01-01 18:36:41.849','123 High Street',NULL,NULL,NULL,NULL,NULL,'Active','2026-01-01',NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1767272799/users/profile/uwjjrwnuskexslwdvy2j.jpg',NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 186: Test (roleId=4)
(186,90,'Test','test456@gmail.com','$2b$10$CRvGCaT79xkIwEVonQLJg.ChAdZuJkbsStTw/cgJISwxBUUrEl0Si','34567890',4,NULL,'2026-01-02 12:21:50.165','123 Indore Street',NULL,NULL,NULL,NULL,NULL,'Active','2026-01-02',NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1767336709/users/profile/tq61112zew86fjczatbd.jpg',NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 188: asdf (roleId=4)
(188,90,'asdf','asdf@gmail.com','$2b$10$P1fIb5egWqxH7S4amwnnqOf1/d7tcelpX77NzFK54Hm5FPewkwOBS','12345678',4,NULL,'2026-01-02 14:19:42.765','Rau Circle Indore',NULL,NULL,NULL,NULL,NULL,'Active','2026-01-02',NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1767343782/users/profile/lnubvnapjqdgz2n1hl1u.jpg',NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 191: Jay (roleId=4)
(191,90,'Jay','jay9977@gmai.com','$2b$10$KU1zkLdI6QnhXpNbQyJc2OM76Cj23XiXkvWdzFfEwhGFuPhhK6uea','12345678',4,NULL,'2026-01-03 12:48:51.513','Rau Circle Indore',NULL,NULL,NULL,NULL,NULL,'Active','2026-01-03',NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1767424730/users/profile/t3vocb9zaytadfvise0t.jpg',NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 206: demo (roleId=4)
(206,90,'demo','demo2345@gmail.com','$2b$10$v6DqlyDOVoU7exUJEUl6.eQCddyeMzj8D5PSWa1.ip3cYCYNRrUVe','2324343432',4,NULL,'2026-01-07 16:44:54.892','123 High Street',NULL,NULL,NULL,NULL,NULL,'Active','2026-01-07',NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1767784493/users/profile/s5v8jn3owxbhnaclxr4n.jpg',NULL,5.00,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 207: test (roleId=4)
(207,90,'test','test56789@gmail.com','$2b$10$Dmx9ORgIWOrzsWAYKOYFMe.4jsYNP0QsdwdlYnTPCAVlQxaqHiuyi','123456789',4,NULL,'2026-01-08 14:51:31.410','123 High Street',NULL,NULL,NULL,NULL,NULL,'Active','2026-01-08',NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1767864090/users/profile/yjylix8eylk2x6pkk30j.jpg',NULL,5.00,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 208: vaani (roleId=4)
(208,90,'vaani','vaani@gmail.com','$2b$10$klEZnyQwTbcJl3cIWr/ARueHR5WWJC0EvvJ1dT67wrWHdZhV9V98C','7788994457',4,NULL,'2026-06-05 14:32:16.666','greater indore',NULL,NULL,NULL,NULL,NULL,'Active',NULL,NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1780650160/users/profile/iwrajebny2pegioajkwk.jpg',NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 209: abc (roleId=4)
(209,90,'abc','abc@gmail.com','$2b$10$1QFHDVAv22B5cH9a0uQQVuIURBVkuVLPaLM5AMW..V9Tqyxio5NYO','1111112222',4,NULL,'2026-06-08 15:52:49.271','greater indore',NULL,NULL,NULL,NULL,NULL,'Active','2026-06-01',NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1780914171/users/profile/lwfkio2idurffvbap9ey.jpg',NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 220: sarah (roleId=4, under admin 216)
(220,216,'sarah','sarah123@gmail.com','$2b$10$wIknGYilm60SUH302rFVfuK7.RIFP.kfoHc6JxcThONy/vvr1WvUy','101010101010',4,NULL,'2026-06-13 15:39:22.634',NULL,NULL,NULL,NULL,NULL,NULL,'Active','2003-02-14',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 221: vamika (roleId=4)
(221,90,'vamika','vamika@gmail.com','$2b$10$4E0FFfewEHoqb6wypVKFP.G3cD50Co9D4tyH1LjWtVhijf/SjMlDK','5858585858',4,NULL,'2026-06-13 16:11:38.995','greater indore',NULL,NULL,NULL,NULL,NULL,'Active','2006-01-03',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 222: maddii (roleId=4)
(222,90,'maddii','maddii@gmail.com','$2b$10$jkhGEKd5jS5btKdbxdYjaeg24pfLKgCcLD7u8dUKLDKIB6GgezHja','101010101010',4,NULL,'2026-06-13 16:26:07.482','greater indore',NULL,NULL,NULL,NULL,NULL,'Active','2013-01-29',NULL,NULL,NULL,NULL,NULL,'https://res.cloudinary.com/dw48hcxi5/image/upload/v1781348175/users/profile/yddyqhpjv9tfdsfzhmqq.jpg',NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL),

-- ID 223: test_maddii_2 (roleId=4)
(223,90,'test_maddii_2','test_maddii_2@gmail.com','$2b$10$HwY4bjVtTQ1zsnGhr6Y6W./Y2x6sFNFt/PWlGgf3Lsxgm/iXgOlum','9999999999',4,NULL,'2026-06-13 16:35:14.529','greater indore',NULL,NULL,NULL,NULL,NULL,'Active','2013-01-29',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'Basic',NULL,NULL,0,0,NULL,NULL,'Basic',NULL,NULL,NULL);

SET FOREIGN_KEY_CHECKS=1;

-- Verify restore
SELECT id, fullName, email, phone, roleId, status, createdAt 
FROM user WHERE roleId = 4 ORDER BY id;

COMMIT;
