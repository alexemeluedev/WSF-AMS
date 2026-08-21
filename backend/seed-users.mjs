import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]); // This fixes the querySrv error
// const uri = "mongodb://127.0.0.1:27017/wsf_pract";
const uri = "mongodb+srv://WSF_AMS:alexemelue@cluster0.3vfdkbm.mongodb.net/";

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
