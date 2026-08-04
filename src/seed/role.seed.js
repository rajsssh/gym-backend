import { prisma } from "../config/db.js";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const roles = ["Superadmin", "Admin", "Staff", "Member"];

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Roles inserted ✔");
}

main().finally(() => prisma.$disconnect());
