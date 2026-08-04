/**
 * Calculates attendance statistics for a member over a given period.
 * Classifies each day strictly as PRESENT, ABSENT, NON_APPLICABLE, or FUTURE.
 * 
 * @param {Object} member - The member object. Must include membershipFrom and membershipTo.
 * @param {Date|string} periodStart - The start date of the calculation period.
 * @param {Date|string} periodEnd - The end date of the calculation period.
 * @param {Array} attendances - Array of attendance records containing checkIn dates.
 * @param {Object} options - Configuration options (e.g., excludeSundays).
 * @returns {Object} - The attendance statistics.
 */
export const calculateAttendanceStats = (member, periodStart, periodEnd, attendances, options = { excludeSundays: true }) => {
  const start = new Date(periodStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(periodEnd);
  end.setHours(0, 0, 0, 0);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const memberStart = member.membershipFrom ? new Date(member.membershipFrom) : null;
  if (memberStart) memberStart.setHours(0, 0, 0, 0);
  const memberEnd = member.membershipTo ? new Date(member.membershipTo) : null;
  if (memberEnd) memberEnd.setHours(0, 0, 0, 0);
  
  // Create a set of dates (YYYY-MM-DD) the member was present
  const presentDates = new Set();
  if (attendances && Array.isArray(attendances)) {
    attendances.forEach(record => {
      if (record.checkIn) {
        const d = new Date(record.checkIn);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        presentDates.add(dateStr);
      }
    });
  }

  let totalApplicableDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  const dailyStatuses = [];

  // Iterate through each day in the period
  let current = new Date(start);
  while (current <= end) {
    const currentStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    
    const isFuture = current > today;
    const isBeforeMembership = memberStart ? current < memberStart : false;
    const isAfterMembership = memberEnd ? current > memberEnd : false;
    const isSunday = current.getDay() === 0;

    const isPresent = presentDates.has(currentStr);
    let status = 'NON_APPLICABLE';

    if (isFuture) {
      status = 'FUTURE';
    } else if (isBeforeMembership || isAfterMembership) {
      status = 'NON_APPLICABLE';
    } else if (options.excludeSundays && isSunday && !isPresent) {
      // If it's a Sunday and they didn't show up, it's non-applicable
      // However, if they DID show up on a Sunday, we count it as an applicable day and mark them present!
      status = 'NON_APPLICABLE';
    } else {
      status = isPresent ? 'PRESENT' : 'ABSENT';
    }

    if (status === 'PRESENT') {
      presentDays++;
      totalApplicableDays++;
    } else if (status === 'ABSENT') {
      absentDays++;
      totalApplicableDays++;
    }
    
    dailyStatuses.push({
      date: currentStr,
      dayLabel: current.toLocaleDateString("en-US", { weekday: "short" }),
      status,
      checkIns: isPresent ? 1 : 0
    });

    current.setDate(current.getDate() + 1);
  }

  let attendancePercentage = 0;
  if (totalApplicableDays > 0) {
    attendancePercentage = Math.round((presentDays / totalApplicableDays) * 100);
  }

  return {
    totalApplicableDays,
    presentDays,
    absentDays,
    attendancePercentage,
    dailyStatuses
  };
};
