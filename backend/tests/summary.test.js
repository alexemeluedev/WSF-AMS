// npm test -- --runInBand tests/summary.test.js
import { jest } from "@jest/globals";
import request from "supertest";

import Cell from "../models/Cell.js";
import Member from "../models/Member.js";
import User from "../models/User.js";
import Zone from "../models/Zone.js";
import District from "../models/District.js";

const { default: app } = await import("../app.js");

import { createTestToken } from "./helpers/token.js";
import { createDistrict, createZone, createCell } from "./helpers/factories.js";

describe("Summary API", () => {
  test("GET /api/summary-counts returns zero counts when the database is empty", async () => {
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
      .get("/api/summary-counts")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      cells: 0,
      members: 0,
      users: 1,
      districts: 0,
      zones: 0,
    });
  });
  test("GET /api/summary-counts returns correct counts", async () => {
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

    // Create District
    const district = await District.create({
      name: "District A",
      code: "D001",
    });

    // Create Zone
    const zone = await Zone.create({
      name: "Zone A",
      headquarters: "Central Headquarters",
      district: district._id,
    });

    // Create Cell
    const cell = await Cell.create({
      name: "Cell A",
      zone: zone._id,
      address: "12 Church Street",
    });

    // Create Member
    await Member.create({
      name: "John Doe",
      phone: "08012345678",
      cell: cell._id,
      gender: "Male",
      status: "Active",
    });

    const response = await request(app)
      .get("/api/summary-counts")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      cells: 1,
      members: 1,
      users: 1,
      districts: 1,
      zones: 1,
    });
  });
  test("GET /api/summary-counts returns 401 when no token is provided", async () => {
    const response = await request(app).get("/api/summary-counts");

    expect(response.statusCode).toBe(401);
  });
  test("GET /api/summary-counts returns 401 when token is invalid", async () => {
    const response = await request(app)
      .get("/api/summary-counts")
      .set("Authorization", "Bearer invalid-token");

    expect(response.statusCode).toBe(401);
  });
  test("GET /api/summary-counts returns 500 when a database error occurs", async () => {
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

    const countSpy = jest
      .spyOn(Cell, "countDocuments")
      .mockRejectedValue(new Error("Database failure"));

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    try {
      const response = await request(app)
        .get("/api/summary-counts")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(500);
      expect(response.body.message).toBe(
        "Failed to compile sidebar telemetry metrics.",
      );

      expect(consoleErrorSpy).toHaveBeenCalled();
    } finally {
      countSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });
});
