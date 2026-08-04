/**
 * Formats a Date object into IST (Asia/Kolkata) with strict accuracy.
 *
 * @param {Date|string} dateInput - The date to format
 * @returns {Object} - { formatted_date, formatted_time, timezone }
 */
export const formatISTDate = (dateInput) => {
  const dateObj = new Date(dateInput);
  if (isNaN(dateObj.getTime())) {
    return {
      formatted_date: "Invalid Date",
      formatted_time: "Invalid Time",
      timezone: "IST"
    };
  }

  // Format the time in IST
  const timeFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Format the full date in IST
  const dateFormatter = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });

  // Get current date in IST for "Today" / "Yesterday" comparisons
  const now = new Date();
  const todayISTStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayISTStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(yesterday);

  const targetISTStr = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(dateObj);

  let finalDateStr = dateFormatter.format(dateObj); // fallback e.g. "23 Jul 2026"
  
  // Format string looks like "23/07/2026" depending on en-IN options, let's just do an exact match check
  if (targetISTStr === todayISTStr) {
    finalDateStr = "Today";
  } else if (targetISTStr === yesterdayISTStr) {
    finalDateStr = "Yesterday";
  }

  return {
    formatted_date: finalDateStr,
    formatted_time: timeFormatter.format(dateObj).toUpperCase(),
    timezone: "IST"
  };
};
