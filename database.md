# Database Schema

> This file is auto-generated based on the current MySQL database tables. Do not edit manually.

To update this file after making Database changes, run `npm run docs`.

## Table: `alert`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| type | varchar(191) | NO |  | NULL |  |
| message | varchar(191) | NO |  | NULL |  |
| memberId | int(11) | YES | MUL | NULL |  |
| staffId | int(11) | YES | MUL | NULL |  |
| branchId | int(11) | NO | MUL | NULL |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |

## Table: `app_settings`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| logo | varchar(500) | YES |  | NULL |  |
| gym_name | varchar(255) | YES |  | NULL |  |
| description | text | YES |  | NULL |  |
| url | varchar(255) | YES |  | NULL |  |
| memberPlanId | int(11) | YES |  | NULL |  |
| createdAt | datetime | YES |  | current_timestamp() |  |
| updatedAt | datetime | YES |  | current_timestamp() | on update current_timestamp() |
| adminId | int(11) | YES |  | NULL |  |

## Table: `booking`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| memberId | int(11) | NO | MUL | NULL |  |
| scheduleId | int(11) | NO | MUL | NULL |  |

## Table: `booking_requests`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| memberId | int(11) | YES |  | NULL |  |
| planId | int(11) | YES |  | NULL |  |
| classId | int(11) | YES |  | NULL |  |
| branchId | int(11) | YES |  | NULL |  |
| adminId | int(11) | YES |  | NULL |  |
| userId | int(11) | YES |  | NULL |  |
| status | enum('pending','approved','rejected') | YES |  | pending |  |
| createdAt | datetime | YES |  | current_timestamp() |  |
| updatedAt | datetime | YES |  | current_timestamp() | on update current_timestamp() |
| price | decimal(10,2) | NO |  | 0.00 |  |
| upiId | varchar(100) | YES |  | NULL |  |

## Table: `branch`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| name | varchar(191) | NO |  | NULL |  |
| phone | varchar(191) | YES |  | NULL |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |
| address | varchar(191) | YES |  | NULL |  |
| status | enum('ACTIVE','INACTIVE') | NO |  | ACTIVE |  |
| adminId | int(11) | YES | MUL | NULL |  |

## Table: `classschedule`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| adminId | int(11) | YES | MUL | NULL |  |
| className | varchar(191) | NO |  | NULL |  |
| trainerId | int(11) | NO | MUL | NULL |  |
| date | datetime(3) | NO |  | NULL |  |
| startTime | varchar(191) | NO |  | NULL |  |
| endTime | varchar(191) | NO |  | NULL |  |
| capacity | int(11) | NO |  | NULL |  |
| members | longtext | YES |  | NULL |  |
| status | varchar(191) | NO |  | Active |  |
| day | varchar(191) | YES |  | NULL |  |
| price | decimal(10,2) | YES |  | 0.00 |  |

## Table: `classtype`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| name | varchar(191) | NO |  | NULL |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |

## Table: `dietmeal`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| dietPlanId | int(11) | NO | MUL | NULL |  |
| time | varchar(191) | NO |  | NULL |  |
| food | varchar(191) | NO |  | NULL |  |

## Table: `dietplan`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| title | varchar(191) | NO |  | NULL |  |
| notes | varchar(191) | YES |  | NULL |  |
| createdBy | int(11) | NO |  | NULL |  |
| branchId | int(11) | NO |  | NULL |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |

## Table: `dietplanassignment`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| dietPlanId | int(11) | NO | MUL | NULL |  |
| memberId | int(11) | NO | MUL | NULL |  |
| assignedAt | datetime(3) | NO |  | current_timestamp(3) |  |

## Table: `expense`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| title | varchar(191) | NO |  | NULL |  |
| category | varchar(191) | NO |  | NULL |  |
| amount | double | NO |  | NULL |  |
| date | datetime(3) | NO |  | current_timestamp(3) |  |
| branchId | int(11) | NO | MUL | NULL |  |
| notes | varchar(191) | YES |  | NULL |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |

## Table: `group_class_bookings`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| memberId | int(11) | NO |  | NULL |  |
| classId | int(11) | NO |  | NULL |  |
| date | date | NO |  | NULL |  |
| startTime | time | NO |  | NULL |  |
| endTime | time | NO |  | NULL |  |
| bookingStatus | varchar(20) | YES |  | Booked |  |
| paymentStatus | varchar(20) | YES |  | Pending |  |
| notes | text | YES |  | NULL |  |
| branchId | int(11) | NO |  | NULL |  |
| createdAt | datetime | YES |  | current_timestamp() |  |
| updatedAt | datetime | YES |  | current_timestamp() | on update current_timestamp() |

## Table: `housekeepingattendance`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| staffId | int(11) | NO | MUL | NULL |  |
| attendanceDate | date | NO |  | NULL |  |
| status | enum('Present','Absent','Late') | NO |  | NULL |  |
| checkIn | time | YES |  | NULL |  |
| checkOut | time | YES |  | NULL |  |
| workHours | varchar(20) | YES |  | NULL |  |
| notes | text | YES |  | NULL |  |
| createdById | int(11) | NO | MUL | NULL |  |
| createdAt | datetime | YES |  | current_timestamp() |  |
| updatedAt | datetime | YES |  | current_timestamp() | on update current_timestamp() |

## Table: `housekeepingschedule`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| dutyDate | date | NO |  | NULL |  |
| startTime | time | NO |  | NULL |  |
| endTime | time | NO |  | NULL |  |
| location | varchar(100) | YES |  | NULL |  |
| status | enum('In Progress','Completed','Pending') | YES |  | Pending |  |
| staffId | int(11) | NO | MUL | NULL |  |
| createdById | int(11) | NO | MUL | NULL |  |
| createdAt | datetime | YES |  | current_timestamp() |  |
| updatedAt | datetime | YES |  | current_timestamp() | on update current_timestamp() |

## Table: `member`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| userId | int(11) | YES | MUL | NULL |  |
| adminId | int(11) | NO |  | NULL |  |
| fullName | varchar(191) | NO |  | NULL |  |
| email | varchar(191) | YES | UNI | NULL |  |
| phone | varchar(191) | NO |  | NULL |  |
| gender | varchar(191) | YES |  | NULL |  |
| address | varchar(191) | YES |  | NULL |  |
| joinDate | datetime(3) | NO |  | current_timestamp(3) |  |
| branchId | int(11) | YES | MUL | NULL |  |
| membershipFrom | datetime(3) | YES |  | NULL |  |
| membershipTo | datetime(3) | YES |  | NULL |  |
| paymentMode | varchar(191) | YES |  | NULL |  |
| interestedIn | varchar(191) | YES |  | NULL |  |
| amountPaid | double | YES |  | NULL |  |
| dateOfBirth | datetime(3) | YES |  | NULL |  |
| password | varchar(191) | YES |  | NULL |  |
| status | varchar(191) | NO |  | ACTIVE |  |
| planId | int(11) | YES |  | NULL |  |
| discount | decimal(10,2) | YES |  | 0.00 |  |

## Table: `member_plan_assignment`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| memberId | int(11) | NO | MUL | NULL |  |
| planId | int(11) | NO | MUL | NULL |  |
| membershipFrom | datetime(3) | NO |  | NULL |  |
| membershipTo | datetime(3) | NO |  | NULL |  |
| paymentMode | varchar(191) | YES |  | NULL |  |
| amountPaid | double | YES |  | NULL |  |
| status | varchar(191) | NO | MUL | Active |  |
| assignedBy | int(11) | YES |  | NULL |  |
| assignedAt | datetime(3) | NO |  | current_timestamp(3) |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |
| updatedAt | datetime(3) | NO |  | current_timestamp(3) | on update current_timestamp(3) |

## Table: `memberattendance`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| staffId | int(11) | YES |  | NULL |  |
| memberId | int(11) | YES |  | NULL |  |
| branchId | int(11) | YES |  | NULL |  |
| checkIn | datetime(3) | NO |  | current_timestamp(3) |  |
| checkOut | datetime(3) | YES |  | NULL |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |
| notes | text | YES |  | NULL |  |
| status | varchar(20) | YES |  | NULL |  |
| mode | varchar(20) | YES |  | NULL |  |
| shiftId | int(11) | YES |  | NULL |  |

## Table: `memberplan`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| name | varchar(191) | NO |  | NULL |  |
| sessions | int(11) | NO |  | NULL |  |
| validityDays | int(11) | NO |  | NULL |  |
| price | double | NO |  | NULL |  |
| type | varchar(191) | NO |  | GROUP |  |
| adminId | int(11) | NO | MUL | NULL |  |
| branchId | int(11) | YES |  | NULL |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |
| updatedAt | datetime(3) | YES |  | current_timestamp(3) | on update current_timestamp(3) |
| trainerId | int(11) | YES |  | NULL |  |
| trainerType | varchar(255) | YES |  | NULL |  |
| status | varchar(50) | YES |  | NULL |  |
| taxRate | decimal(5,2) | YES |  | 0.00 |  |

## Table: `membership_renewal_requests`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| memberId | int(11) | NO | MUL | NULL |  |
| assignmentId | int(11) | NO | MUL | NULL |  |
| planId | int(11) | NO | MUL | NULL |  |
| paymentMode | varchar(191) | YES |  | NULL |  |
| amountPaid | double | YES |  | NULL |  |
| requestedBy | int(11) | NO | MUL | NULL |  |
| requestedByRole | varchar(50) | YES |  | NULL |  |
| status | varchar(191) | NO | MUL | pending |  |
| approvedBy | int(11) | YES |  | NULL |  |
| approvedAt | datetime(3) | YES |  | NULL |  |
| rejectedAt | datetime(3) | YES |  | NULL |  |
| rejectionReason | text | YES |  | NULL |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |
| updatedAt | datetime(3) | NO |  | current_timestamp(3) | on update current_timestamp(3) |

## Table: `notificationlog`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| type | varchar(191) | NO |  | NULL |  |
| to | varchar(191) | NO |  | NULL |  |
| message | varchar(191) | NO |  | NULL |  |
| status | varchar(191) | NO |  | PENDING |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |
| memberId | int(11) | YES | MUL | NULL |  |

## Table: `payment`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| memberId | int(11) | NO | MUL | NULL |  |
| planId | int(11) | NO | MUL | NULL |  |
| amount | double | NO |  | NULL |  |
| paymentDate | datetime(3) | NO |  | current_timestamp(3) |  |
| invoiceNo | varchar(191) | NO | UNI | NULL |  |
| gstAmount | double | YES |  | NULL |  |
| gstPercent | double | YES |  | NULL |  |

## Table: `plan`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| name | varchar(191) | NO |  | NULL |  |
| duration | enum('Monthly','Yearly') | NO |  | NULL |  |
| price | double | NO |  | NULL |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |
| category | varchar(191) | YES |  | NULL |  |
| description | varchar(191) | YES |  | NULL |  |
| status | varchar(191) | NO |  | ACTIVE |  |
| branchId | int(11) | YES | MUL | NULL |  |
| sessions | int(11) | NO |  | 0 |  |
| validityDays | int(11) | NO |  | 0 |  |
| taxRate | decimal(5,2) | YES |  | 0.00 |  |

## Table: `product`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| name | varchar(191) | NO |  | NULL |  |
| sku | varchar(191) | YES | UNI | NULL |  |
| category | varchar(191) | YES |  | NULL |  |
| sellingPrice | double | NO |  | NULL |  |
| costPrice | double | YES |  | NULL |  |
| currentStock | int(11) | NO |  | 0 |  |
| branchId | int(11) | NO | MUL | NULL |  |
| isActive | tinyint(1) | NO |  | 1 |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |

## Table: `pt_bookings`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| memberId | int(11) | NO |  | NULL |  |
| trainerId | int(11) | NO |  | NULL |  |
| sessionId | int(11) | YES | MUL | NULL |  |
| date | date | NO |  | NULL |  |
| startTime | time | NO |  | NULL |  |
| endTime | time | NO |  | NULL |  |
| bookingStatus | varchar(20) | YES |  | Booked |  |
| paymentStatus | varchar(20) | YES |  | Pending |  |
| notes | text | YES |  | NULL |  |
| branchId | int(11) | NO |  | NULL |  |
| createdAt | datetime | YES |  | current_timestamp() |  |
| updatedAt | datetime | YES |  | current_timestamp() | on update current_timestamp() |

## Table: `purchase`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| selectedPlan | varchar(191) | NO |  | NULL |  |
| companyName | varchar(191) | NO |  | NULL |  |
| email | varchar(191) | NO |  | NULL |  |
| billingDuration | varchar(191) | NO |  | NULL |  |
| startDate | datetime(3) | NO |  | NULL |  |
| purchaseDate | datetime(3) | NO |  | current_timestamp(3) |  |
| status | varchar(191) | NO |  | pending |  |

## Table: `role`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| name | varchar(191) | NO | UNI | NULL |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |

## Table: `salary`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| salaryId | varchar(255) | NO | UNI | NULL |  |
| staffId | int(11) | NO | MUL | NULL |  |
| role | varchar(255) | YES |  | NULL |  |
| periodStart | datetime | NO |  | NULL |  |
| periodEnd | datetime | NO |  | NULL |  |
| hoursWorked | int(11) | YES |  | 0 |  |
| hourlyRate | double | YES |  | 0 |  |
| hourlyTotal | double | YES |  | 0 |  |
| fixedSalary | double | YES |  | 0 |  |
| commissionTotal | double | YES |  | 0 |  |
| bonuses | longtext | YES |  | NULL |  |
| deductions | longtext | YES |  | NULL |  |
| netPay | double | NO |  | NULL |  |
| status | varchar(50) | NO |  | Generated |  |
| createdAt | datetime | NO |  | current_timestamp() |  |

## Table: `session`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| adminId | int(11) | NO |  | NULL |  |
| sessionName | varchar(191) | NO |  | NULL |  |
| trainerId | int(11) | NO | MUL | NULL |  |
| branchId | int(11) | YES | MUL | NULL |  |
| date | datetime(3) | NO |  | NULL |  |
| time | varchar(191) | NO |  | NULL |  |
| duration | int(11) | NO |  | NULL |  |
| description | varchar(191) | YES |  | NULL |  |
| status | varchar(191) | NO |  | Upcoming |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |

## Table: `shifts`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| staffIds | int(11) | YES |  | NULL |  |
| branchId | int(11) | YES |  | NULL |  |
| shiftDate | date | NO |  | NULL |  |
| startTime | time | NO |  | NULL |  |
| endTime | time | NO |  | NULL |  |
| shiftType | varchar(100) | NO |  | NULL |  |
| description | text | YES |  | NULL |  |
| status | varchar(50) | NO |  | Pending |  |
| createdById | int(11) | NO |  | NULL |  |
| createdAt | timestamp | NO |  | current_timestamp() |  |

## Table: `staff`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| userId | int(11) | NO |  | NULL |  |
| adminId | int(11) | YES |  | NULL |  |
| branchId | int(11) | YES |  | NULL |  |
| gender | varchar(191) | NO |  | NULL |  |
| dateOfBirth | datetime(3) | NO |  | NULL |  |
| joinDate | datetime(3) | NO |  | NULL |  |
| exitDate | datetime(3) | YES |  | NULL |  |
| profilePhoto | varchar(191) | YES |  | NULL |  |
| status | varchar(191) | NO |  | Active |  |

## Table: `staffattendance`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| shiftId | int(11) | YES |  | NULL |  |
| staffId | int(11) | NO |  | NULL |  |
| branchId | int(11) | NO |  | NULL |  |
| checkIn | datetime(3) | NO |  | current_timestamp(3) |  |
| checkOut | datetime(3) | YES |  | NULL |  |
| mode | varchar(20) | YES |  | Manual |  |
| status | varchar(20) | YES |  | Present |  |
| notes | text | YES |  | NULL |  |
| createdAt | timestamp | YES |  | current_timestamp() |  |

## Table: `stockmovement`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| productId | int(11) | NO | MUL | NULL |  |
| type | varchar(191) | NO |  | NULL |  |
| quantity | int(11) | NO |  | NULL |  |
| note | varchar(191) | YES |  | NULL |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |

## Table: `tasks`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| assignedTo | int(11) | NO |  | NULL |  |
| branchId | int(11) | YES |  | NULL |  |
| taskTitle | varchar(255) | NO |  | NULL |  |
| description | text | YES |  | NULL |  |
| dueDate | date | NO |  | NULL |  |
| priority | varchar(50) | NO |  | NULL |  |
| status | varchar(50) | NO |  | Pending |  |
| createdById | int(11) | NO |  | NULL |  |
| createdAt | timestamp | NO |  | current_timestamp() |  |

## Table: `unified_bookings`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| memberId | int(11) | NO |  | NULL |  |
| trainerId | int(11) | YES |  | NULL |  |
| sessionId | int(11) | YES |  | NULL |  |
| classId | int(11) | YES |  | NULL |  |
| date | date | NO |  | NULL |  |
| endDate | date | YES |  | NULL |  |
| startTime | time | NO |  | NULL |  |
| endTime | time | NO |  | NULL |  |
| bookingType | enum('PT','GROUP') | NO |  | NULL |  |
| bookingStatus | varchar(50) | YES |  | Booked |  |
| paymentStatus | varchar(50) | YES |  | Pending |  |
| price | decimal(10,2) | YES |  | NULL |  |
| notes | varchar(255) | YES |  | NULL |  |
| branchId | int(11) | YES |  | NULL |  |
| createdAt | timestamp | YES |  | current_timestamp() |  |
| updatedAt | timestamp | YES |  | current_timestamp() | on update current_timestamp() |

## Table: `user`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| adminId | int(11) | YES |  | NULL |  |
| fullName | varchar(191) | NO |  | NULL |  |
| email | varchar(191) | NO | UNI | NULL |  |
| password | varchar(191) | NO |  | NULL |  |
| phone | varchar(191) | YES |  | NULL |  |
| roleId | int(11) | NO | MUL | NULL |  |
| branchId | int(11) | YES | MUL | NULL |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |
| address | varchar(191) | YES |  | NULL |  |
| description | varchar(191) | YES |  | NULL |  |
| duration | varchar(191) | YES |  | NULL |  |
| gymName | varchar(191) | YES |  | NULL |  |
| planName | varchar(191) | YES |  | NULL |  |
| price | varchar(191) | YES |  | NULL |  |
| status | varchar(191) | YES |  | NULL |  |
| dateOfBirth | date | YES |  | NULL |  |
| gender | varchar(50) | YES |  | NULL |  |
| address_street | varchar(191) | YES |  | NULL |  |
| address_city | varchar(191) | YES |  | NULL |  |
| address_state | varchar(191) | YES |  | NULL |  |
| address_zip | varchar(50) | YES |  | NULL |  |
| profileImage | varchar(255) | YES |  | NULL |  |
| gstNumber | varchar(50) | YES |  | NULL |  |
| tax | decimal(10,2) | YES |  | NULL |  |
| gymAddress | text | YES |  | NULL |  |

## Table: `workoutexercise`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| workoutPlanId | int(11) | NO | MUL | NULL |  |
| name | varchar(191) | NO |  | NULL |  |
| sets | int(11) | YES |  | NULL |  |
| reps | int(11) | YES |  | NULL |  |
| duration | varchar(191) | YES |  | NULL |  |

## Table: `workoutplan`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| title | varchar(191) | NO |  | NULL |  |
| notes | varchar(191) | YES |  | NULL |  |
| createdBy | int(11) | NO |  | NULL |  |
| branchId | int(11) | NO |  | NULL |  |
| createdAt | datetime(3) | NO |  | current_timestamp(3) |  |

## Table: `workoutplanassignment`

| Field | Type | Null | Key | Default | Extra |
|-------|------|------|-----|---------|-------|
| id | int(11) | NO | PRI | NULL | auto_increment |
| workoutPlanId | int(11) | NO | MUL | NULL |  |
| memberId | int(11) | NO | MUL | NULL |  |
| assignedAt | datetime(3) | NO |  | current_timestamp(3) |  |

