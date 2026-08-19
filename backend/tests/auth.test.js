// npm test -- --runInBand tests/auth.test.js
import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const mockLogAudit = jest.fn();

jest.unstable_mockModule("../utils/auditLogger.js", () => ({
  logAudit: mockLogAudit,
}));

const { default: app } = await import("../app.js");

const { createTestToken } = await import("./helpers/token.js");
describe("Auth API", () => {
  beforeEach(() => {
    mockLogAudit.mockClear();
  });
  test("POST /api/auth/register creates the first user as admin", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "firstadmin@example.com",
      password: "Password123!",
      role: "user",
    });

    expect(response.statusCode).toBe(201);

    expect(response.body.user.email).toBe("firstadmin@example.com");
    expect(response.body.user.role).toBe("admin");

    expect(response.body.token).toBeDefined();

    const createdUser = await User.findOne({
      email: "firstadmin@example.com",
    });

    expect(createdUser).not.toBeNull();
    expect(createdUser.role).toBe("admin");
  });
  test("POST /api/auth/register hashes the user's password", async () => {
    const plainPassword = "Password123!";

    const response = await request(app).post("/api/auth/register").send({
      email: "hashed@example.com",
      password: plainPassword,
      role: "user",
    });

    expect(response.statusCode).toBe(201);

    const createdUser = await User.findOne({
      email: "hashed@example.com",
    });

    expect(createdUser).not.toBeNull();

    // Password must never be stored as plaintext
    expect(createdUser.password).not.toBe(plainPassword);

    // Verify that the stored hash actually matches the original password
    const passwordMatches = await bcrypt.compare(
      plainPassword,
      createdUser.password,
    );

    expect(passwordMatches).toBe(true);
  });
  test("POST /api/auth/register rejects a duplicate email", async () => {
    await User.create({
      email: "duplicate@example.com",
      password: await bcrypt.hash("Password123!", 10),
      role: "user",
    });

    const response = await request(app).post("/api/auth/register").send({
      email: "DUPLICATE@EXAMPLE.COM",
      password: "AnotherPassword123!",
      role: "user",
    });

    expect(response.statusCode).toBe(409);

    expect(response.body.message).toBe("User already exists.");

    const users = await User.find({
      email: "duplicate@example.com",
    });

    expect(users).toHaveLength(1);
  });
  test("POST /api/auth/register rejects a missing email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      password: "Password123!",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Email and password are required.");
  });

  test("POST /api/auth/register rejects a missing password", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "missingpassword@example.com",
    });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Email and password are required.");
  });
  test("POST /api/auth/register requires an administrator token after initialization", async () => {
    await User.create({
      email: "existing@example.com",
      password: await bcrypt.hash("Password123!", 10),
      role: "admin",
    });

    const response = await request(app).post("/api/auth/register").send({
      email: "unauthorized@example.com",
      password: "Password123!",
      role: "user",
    });

    expect(response.statusCode).toBe(401);

    expect(response.body.message).toBe("Administrator token required.");

    const createdUser = await User.findOne({
      email: "unauthorized@example.com",
    });

    expect(createdUser).toBeNull();
  });
  test("POST /api/auth/register rejects a non-admin user", async () => {
    await User.create({
      email: "normaluser@example.com",
      password: await bcrypt.hash("Password123!", 10),
      role: "user",
    });

    const userToken = createTestToken({
      id: "507f1f77bcf86cd799439012",
      email: "normaluser@example.com",
      role: "user",
    });

    const response = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        email: "newuser@example.com",
        password: "Password123!",
        role: "user",
      });

    expect(response.statusCode).toBe(403);

    expect(response.body.message).toBe("Administrator privileges required.");

    const createdUser = await User.findOne({
      email: "newuser@example.com",
    });

    expect(createdUser).toBeNull();
  });
  test("POST /api/auth/register allows an admin to create a normal user", async () => {
    const adminToken = createTestToken({
      id: "507f1f77bcf86cd799439013",
      email: "admin@example.com",
      role: "admin",
    });

    await User.create({
      email: "admin@example.com",
      password: await bcrypt.hash("Password123!", 10),
      role: "admin",
    });

    const response = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: "createduser@example.com",
        password: "Password123!",
        role: "user",
      });

    expect(response.statusCode).toBe(201);

    expect(response.body.user.email).toBe("createduser@example.com");
    expect(response.body.user.role).toBe("user");
    expect(response.body.token).toBeDefined();

    const createdUser = await User.findOne({
      email: "createduser@example.com",
    });

    expect(createdUser).not.toBeNull();
    expect(createdUser.role).toBe("user");
  });
  test("POST /api/auth/register allows an admin to create another admin", async () => {
    await User.create({
      email: "primaryadmin@example.com",
      password: await bcrypt.hash("Password123!", 10),
      role: "admin",
    });

    const adminToken = createTestToken({
      id: "507f1f77bcf86cd799439014",
      email: "primaryadmin@example.com",
      role: "admin",
    });

    const response = await request(app)
      .post("/api/auth/register")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        email: "secondadmin@example.com",
        password: "Password123!",
        role: "admin",
      });

    expect(response.statusCode).toBe(201);

    expect(response.body.user.email).toBe("secondadmin@example.com");
    expect(response.body.user.role).toBe("admin");

    const createdAdmin = await User.findOne({
      email: "secondadmin@example.com",
    });

    expect(createdAdmin).not.toBeNull();
    expect(createdAdmin.role).toBe("admin");
  });
  test("POST /api/auth/login rejects a missing email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      password: "Password123!",
    });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe("Email and password are required.");
  });
  test("POST /api/auth/login rejects a missing password", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "user@example.com",
    });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe("Email and password are required.");
  });
  test("POST /api/auth/login rejects an unknown email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "doesnotexist@example.com",
      password: "Password123!",
    });

    expect(response.statusCode).toBe(401);

    expect(response.body.message).toBe("Invalid credentials.");

    expect(response.body.token).toBeUndefined();
  });
  test("POST /api/auth/login rejects an incorrect password", async () => {
    await User.create({
      email: "wrongpassword@example.com",
      password: await bcrypt.hash("CorrectPassword123!", 10),
      role: "user",
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "wrongpassword@example.com",
      password: "WrongPassword123!",
    });

    expect(response.statusCode).toBe(401);

    expect(response.body.message).toBe("Invalid credentials.");
    expect(response.body.token).toBeUndefined();
  });
  test("POST /api/auth/login authenticates a user and returns a JWT", async () => {
    const password = "CorrectPassword123!";

    const user = await User.create({
      email: "loginuser@example.com",
      password: await bcrypt.hash(password, 10),
      role: "user",
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "LOGINUSER@EXAMPLE.COM",
      password,
    });

    expect(response.statusCode).toBe(200);

    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe("loginuser@example.com");
    expect(response.body.user.role).toBe("user");
    expect(response.body.user.id).toBe(user._id.toString());

    expect(response.body.token).toBeDefined();

    // Verify the JWT returned by the login endpoint
    const decoded = jwt.verify(
      response.body.token,
      process.env.JWT_SECRET || "supersecretkey",
    );

    expect(decoded.id).toBe(user._id.toString());
    expect(decoded.email).toBe("loginuser@example.com");
    expect(decoded.role).toBe("user");

    // Password must never be exposed in the response
    expect(response.body.user.password).toBeUndefined();
  });
  test("POST /api/auth/login records a successful login audit", async () => {
    const password = "AuditPassword123!";

    const user = await User.create({
      email: "auditlogin@example.com",
      password: await bcrypt.hash(password, 10),
      role: "user",
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "auditlogin@example.com",
      password,
    });

    expect(response.statusCode).toBe(200);

    expect(mockLogAudit).toHaveBeenCalledTimes(1);

    expect(mockLogAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "User login",
        resourceType: "User",
        resourceId: user._id,
        resourceSummary: "auditlogin@example.com",
        details: "Successful login",
        actor: expect.objectContaining({
          id: user._id,
          email: "auditlogin@example.com",
          role: "user",
        }),
      }),
    );
  });
  test("GET /api/auth/users requires authentication", async () => {
    const response = await request(app).get("/api/auth/users");

    expect(response.statusCode).toBe(401);
  });
  test("GET /api/auth/users rejects a non-admin user", async () => {
    const userToken = createTestToken({
      id: "507f1f77bcf86cd799439015",
      email: "normal@example.com",
      role: "user",
    });

    const response = await request(app)
      .get("/api/auth/users")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.statusCode).toBe(403);

    expect(response.body.message).toBe("Administrator privileges required.");
  });

  test("GET /api/auth/users allows an admin to retrieve users without passwords", async () => {
    const adminToken = createTestToken({
      id: "507f1f77bcf86cd799439016",
      email: "directoryadmin@example.com",
      role: "admin",
    });

    await User.create({
      email: "olderuser@example.com",
      password: await bcrypt.hash("Password123!", 10),
      role: "user",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    await User.create({
      email: "neweruser@example.com",
      password: await bcrypt.hash("Password456!", 10),
      role: "admin",
    });

    const response = await request(app)
      .get("/api/auth/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);
    expect(response.body.users).toBeDefined();
    expect(response.body.users).toHaveLength(2);

    expect(response.body.users[0].email).toBe("neweruser@example.com");
    expect(response.body.users[1].email).toBe("olderuser@example.com");

    response.body.users.forEach((user) => {
      expect(user.password).toBeUndefined();
    });
  });

  test("DELETE /api/auth/users/:id allows an admin to delete another user", async () => {
    const admin = await User.create({
      email: "deleteadmin@example.com",
      password: await bcrypt.hash("Password123!", 10),
      role: "admin",
    });

    const targetUser = await User.create({
      email: "targetuser@example.com",
      password: await bcrypt.hash("Password456!", 10),
      role: "user",
    });

    const adminToken = createTestToken({
      id: admin._id.toString(),
      email: admin.email,
      role: "admin",
    });

    const response = await request(app)
      .delete(`/api/auth/users/${targetUser._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe(
      `Account platform clearance for ${targetUser.email} permanently revoked successfully.`,
    );

    const deletedUser = await User.findById(targetUser._id);

    expect(deletedUser).toBeNull();
  });

  test("DELETE /api/auth/users/:id prevents an admin from deleting their own account", async () => {
    const admin = await User.create({
      email: "selfdeleteadmin@example.com",
      password: await bcrypt.hash("Password123!", 10),
      role: "admin",
    });

    const adminToken = createTestToken({
      id: admin._id.toString(),
      email: admin.email,
      role: "admin",
    });

    const response = await request(app)
      .delete(`/api/auth/users/${admin._id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      "You cannot terminate your own active administrator account session.",
    );

    const existingAdmin = await User.findById(admin._id);

    expect(existingAdmin).not.toBeNull();
    expect(existingAdmin.email).toBe("selfdeleteadmin@example.com");
  });

  test("DELETE /api/auth/users/:id requires authentication", async () => {
    const user = await User.create({
      email: "protecteddelete@example.com",
      password: await bcrypt.hash("Password123!", 10),
      role: "user",
    });

    const response = await request(app).delete(`/api/auth/users/${user._id}`);

    expect(response.statusCode).toBe(401);

    const existingUser = await User.findById(user._id);

    expect(existingUser).not.toBeNull();
  });

  test("DELETE /api/auth/users/:id rejects a non-admin user", async () => {
    const targetUser = await User.create({
      email: "protectedtarget@example.com",
      password: await bcrypt.hash("Password123!", 10),
      role: "user",
    });

    const normalUserToken = createTestToken({
      id: "507f1f77bcf86cd799439017",
      email: "normaldelete@example.com",
      role: "user",
    });

    const response = await request(app)
      .delete(`/api/auth/users/${targetUser._id}`)
      .set("Authorization", `Bearer ${normalUserToken}`);

    expect(response.statusCode).toBe(403);

    expect(response.body.message).toBe("Administrator privileges required.");

    const existingUser = await User.findById(targetUser._id);

    expect(existingUser).not.toBeNull();
  });

  test("DELETE /api/auth/users/:id returns 404 for a nonexistent user", async () => {
    const adminToken = createTestToken({
      id: "507f1f77bcf86cd799439018",
      email: "admin@example.com",
      role: "admin",
    });

    const fakeId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .delete(`/api/auth/users/${fakeId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(404);

    expect(response.body.message).toBe(
      "Target user credentials profile not found inside data clusters.",
    );
  });
  test("GET /api/auth/users rejects an invalid token", async () => {
    const response = await request(app)
      .get("/api/auth/users")
      .set("Authorization", "Bearer this-is-not-a-valid-jwt");

    expect(response.statusCode).toBe(401);
  });
});
