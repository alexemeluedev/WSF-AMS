// const token = jwt.sign(
//   { id: "...", role: "admin" },
//   process.env.JWT_SECRET || "supersecretkey",
// );

import jwt from "jsonwebtoken";

export const createTestToken = (overrides = {}) => {
  const payload = {
    id: "507f1f77bcf86cd799439011",
    role: "admin",
    ...overrides,
  };

  return jwt.sign(payload, process.env.JWT_SECRET || "supersecretkey", {
    expiresIn: "1h",
  });
};
