import XLSX from 'xlsx';

/**
 * Generates an Excel buffer for the member import template
 */
export const generateMemberTemplate = () => {
  const sampleData = [
    {
      "Full Name": "John Doe",
      "Phone": "9876543210",
      "Email": "john.doe@example.com",
      "Gender": "Male",
      "Address": "123 Street Name, City",
      "Plan Name": "Main Plan", // Replace with a plan name existing in their DB for easy testing
      "Goal": "Weight Loss",
      "Date Of Birth": "1995-05-15"
    },
    {
      "Full Name": "Jane Smith",
      "Phone": "9876543211",
      "Email": "jane.smith@example.com",
      "Gender": "Female",
      "Address": "456 Avenue Rd, City",
      "Plan Name": "Main Plan",
      "Goal": "Body Building",
      "Date Of Birth": "1998-10-22"
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Members Template");

  // Write to buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  return buffer;
};
