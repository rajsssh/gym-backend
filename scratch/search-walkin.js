import fs from "fs";

const content = fs.readFileSync("c:/Users/bhagy/OneDrive/Desktop/Kiaan technoligy/GYM_FULLCODE/Gym/Frontend/src/Dashboard/Receptionist/ReceptionistWalkinMember.jsx", "utf8");
const lines = content.split("\n");

console.log("Matching lines in ReceptionistWalkinMember.jsx:");
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes("memberplan") || line.toLowerCase().includes("fetchplans")) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
