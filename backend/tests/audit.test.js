// npm test -- --runInBand tests/audit.test.js

import { jest } from "@jest/globals";
import request from "supertest";
import AuditLog from "../models/AuditLog.js";
import User from "../models/User.js";

const { default: app } = await import("../app.js");
import { createAuditLog } from "./helpers/factories.js";
import { createTestToken } from "./helpers/token.js";
describe("Audit API", () => {
  test("GET /api/audit returns an empty logs array when no audit logs exist", async () => {
    const admin = await User.create({
      email: "admin@example.com",
      password: "hashedpassword",
      role: "admin",
    });

    const adminToken = createTestToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    const response = await request(app)
      .get("/api/audit")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.logs).toEqual([]);
    expect(response.body.totalPages).toBe(0);
    expect(response.body.currentPage).toBe(1);
  });
  test("GET /api/audit returns all audit logs", async () => {
    const admin = await User.create({
      email: "admin@example.com",
      password: "hashedpassword",
      role: "admin",
    });

    const adminToken = createTestToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    await createAuditLog({
      action: "Member Created",
      resourceType: "Member",
    });

    await createAuditLog({
      action: "Cell Updated",
      resourceType: "Cell",
    });

    const response = await request(app)
      .get("/api/audit")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.logs).toHaveLength(2);

    expect(response.body.logs[0]).toHaveProperty("action");
    expect(response.body.logs[0]).toHaveProperty("resourceType");
    expect(response.body.logs[0]).toHaveProperty("createdAt");
  });
  test("GET /api/audit filters audit logs by action", async () => {
    const admin = await User.create({
      email: "admin@example.com",
      password: "hashedpassword",
      role: "admin",
    });

    const adminToken = createTestToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    await createAuditLog({
      action: "Member Created",
      resourceType: "Member",
    });

    await createAuditLog({
      action: "Member Deleted",
      resourceType: "Member",
    });

    const response = await request(app)
      .get("/api/audit?action=Member Created")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.logs).toHaveLength(1);
    expect(response.body.logs[0].action).toBe("Member Created");
  });
  test("GET /api/audit filters audit logs by resourceType", async () => {
    const admin = await User.create({
      email: "admin@example.com",
      password: "hashedpassword",
      role: "admin",
    });

    const adminToken = createTestToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    await createAuditLog({
      action: "Member Created",
      resourceType: "Member",
    });

    await createAuditLog({
      action: "Cell Updated",
      resourceType: "Cell",
    });

    const response = await request(app)
      .get("/api/audit?resourceType=Cell")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.logs).toHaveLength(1);
    expect(response.body.logs[0].resourceType).toBe("Cell");
  });
  test("GET /api/audit filters audit logs by action and resourceType", async () => {
    const admin = await User.create({
      email: "admin@example.com",
      password: "hashedpassword",
      role: "admin",
    });

    const adminToken = createTestToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    await createAuditLog({
      action: "Member Created",
      resourceType: "Member",
    });

    await createAuditLog({
      action: "Member Created",
      resourceType: "Cell",
    });

    await createAuditLog({
      action: "Member Deleted",
      resourceType: "Member",
    });

    const response = await request(app)
      .get("/api/audit?action=Member Created&resourceType=Member")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.logs).toHaveLength(1);
    expect(response.body.logs[0].action).toBe("Member Created");
    expect(response.body.logs[0].resourceType).toBe("Member");
  });
  test("GET /api/audit paginates audit logs", async () => {
    const admin = await User.create({
      email: "admin@example.com",
      password: "hashedpassword",
      role: "admin",
    });

    const adminToken = createTestToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    for (let i = 1; i <= 5; i++) {
      await createAuditLog({
        action: `Action ${i}`,
        resourceType: "Member",
      });
    }

    const response = await request(app)
      .get("/api/audit?page=2&limit=2")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.logs).toHaveLength(2);
    expect(response.body.totalPages).toBe(3);
    expect(response.body.currentPage).toBe(2);
  });
  test("GET /api/audit returns audit logs in descending createdAt order", async () => {
    const admin = await User.create({
      email: "admin@example.com",
      password: "hashedpassword",
      role: "admin",
    });

    const adminToken = createTestToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    await createAuditLog({
      action: "First Action",
    });

    // Small delay so MongoDB timestamps differ
    await new Promise((resolve) => setTimeout(resolve, 20));

    await createAuditLog({
      action: "Second Action",
    });

    const response = await request(app)
      .get("/api/audit")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.logs).toHaveLength(2);

    expect(response.body.logs[0].action).toBe("Second Action");
    expect(response.body.logs[1].action).toBe("First Action");
  });
  test("GET /api/audit rejects requests without a token", async () => {
    const response = await request(app).get("/api/audit");

    expect(response.statusCode).toBe(401);
  });
  test("GET /api/audit rejects an invalid token", async () => {
    const response = await request(app)
      .get("/api/audit")
      .set("Authorization", "Bearer this-is-not-a-valid-jwt");

    expect(response.statusCode).toBe(401);
  });
  test("GET /api/audit rejects authenticated non-admin users", async () => {
    const user = await User.create({
      email: "user@example.com",
      password: "hashedpassword",
      role: "user",
    });

    const userToken = createTestToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const response = await request(app)
      .get("/api/audit")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.statusCode).toBe(403);
  });
  test("GET /api/audit returns 500 when the database query fails", async () => {
    const admin = await User.create({
      email: "admin@example.com",
      password: "hashedpassword",
      role: "admin",
    });

    const adminToken = createTestToken({
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role,
    });

    jest
      .spyOn(AuditLog, "countDocuments")
      .mockRejectedValueOnce(new Error("Database failure"));

    const response = await request(app)
      .get("/api/audit")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe("Could not fetch audit history logs.");
    expect(response.body.error).toBe("Database failure");

    jest.restoreAllMocks();
  });
});
