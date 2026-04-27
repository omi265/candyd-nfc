import { db } from "./lib/db";

async function checkUser() {
  const email = "devyanituli@gmail.com";
  const user = await db.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log("User not found in the current DB.");
  } else {
    console.log("User found:");
    console.log("- ID:", user.id);
    console.log("- Email:", user.email);
    console.log("- Has Password:", !!user.password);
    console.log("- Setup Required:", user.setupRequired);
    console.log("- Role:", user.role);
  }
}

checkUser()
  .catch(console.error)
  .finally(() => process.exit());
