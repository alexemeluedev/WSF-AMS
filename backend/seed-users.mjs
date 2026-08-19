import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

const uri = "mongodb://127.0.0.1:27017/wsf_pract";

async function main() {
  await mongoose.connect(uri);
  const users = [
    { email: "admin@example.com", password: "Admin@1234", role: "admin" },
    { email: "user@example.com", password: "User@1234", role: "user" },
  ];

  for (const u of users) {
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      console.log("already exists", u.email);
      continue;
    }
    const hash = await bcrypt.hash(u.password, 10);
    await User.create({ email: u.email, password: hash, role: u.role });
    console.log("created", u.email);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
