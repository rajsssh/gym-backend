// Convert number to words in Indian format
export const numberToWords = (num) => {
  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
    "Seventeen", "Eighteen", "Nineteen"
  ];

  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
  ];

  const convertHundreds = (n) => {
    if (n === 0) return "";
    let result = "";
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0) {
      result += ones[n] + " ";
    }
    return result.trim();
  };

  if (num === 0) return "Zero Rupees";

  const numInt = Math.floor(num);
  let result = "";
  let remaining = numInt;
  
  // Handle crores
  const crores = Math.floor(remaining / 10000000);
  if (crores > 0) {
    result += convertHundreds(crores) + " Crore ";
  }
  remaining = remaining % 10000000;

  // Handle lakhs
  const lakhs = Math.floor(remaining / 100000);
  if (lakhs > 0) {
    result += convertHundreds(lakhs) + " Lakh ";
  }
  remaining = remaining % 100000;

  // Handle thousands
  const thousands = Math.floor(remaining / 1000);
  if (thousands > 0) {
    result += convertHundreds(thousands) + " Thousand ";
  }
  remaining = remaining % 1000;

  // Handle hundreds, tens, ones
  if (remaining > 0) {
    result += convertHundreds(remaining);
  }

  return result.trim() + " Rupees";
};

