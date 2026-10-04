import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  const username = process.env.STAFF_DEFAULT_USERNAME || "officer@apexfinserve.com";
  const rawPassword = process.env.STAFF_DEFAULT_PASSWORD || "ApexStaff2025!Secure";
  const name = process.env.STAFF_DEFAULT_NAME || "Loan Operations Officer";

  console.log(`Seeding staff user: ${username}`);
  const passwordHash = hashPassword(rawPassword);

  const user = await prisma.staffUser.upsert({
    where: { username },
    update: {
      passwordHash,
      name,
    },
    create: {
      username,
      name,
      passwordHash,
      role: "STAFF",
    },
  });

  console.log("✔ Staff user seeded successfully:", {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
