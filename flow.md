# System Flow Document

> This document explains the primary operational workflows of the Backend.

To update this file, run `npm run docs`.

## 1. Authentication Flow
- User calls `/api/auth/login` (Admin/Staff/Member).
- System validates credentials and returns a JWT Token.
- User uses `Authorization: Bearer <token>` for protected endpoints.

## 2. Membership & Plan Flow
- Admin/Staff creates Plans via `/api/plans`.
- Member is registered via `/api/members`.
- Plan is assigned to Member via `/api/member-plan-assignments`.
- System Cron job checks for plan expiry every day.

## 3. Attendance Flow
- Universal QR System scans member/staff.
- Request goes to `/api/attendance` (for members) or `/api/staff-attendance` (for staff).
- Database logs check-in/check-out time.

