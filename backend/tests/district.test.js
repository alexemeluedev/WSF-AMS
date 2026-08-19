// npm test -- --runInBand tests/district.test.js
import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import District from "../models/District.js";

jest.unstable_mockModule("../utils/auditLogger.js", () => ({
  logAudit: jest.fn(),
}));

const { default: app } = await import("../app.js");

const { createTestToken } = await import("./helpers/token.js");
const { createDistrict, createZone, createCell } =
  await import("./helpers/factories.js");

describe("District API", () => {
  test("GET /api/districts returns districts for an authenticated user", async () => {
    const token = createTestToken();

    await createDistrict({
      name: "Lagos District",
      code: "LG01",
    });

    const response = await request(app)
      .get("/api/districts")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe("Lagos District");
    expect(response.body[0].code).toBe("LG01");
    expect(response.body[0].dateCreated).toBeDefined();
    expect(response.body[0].dateCreated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  test("GET /api/districts searches districts by name", async () => {
    const token = createTestToken();

    await createDistrict({
      name: "Lagos District",
      code: "LG01",
    });

    await createDistrict({
      name: "Abuja District",
      code: "AB01",
    });

    const response = await request(app)
      .get("/api/districts?search=lagos")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe("Lagos District");
  });
  test("GET /api/districts searches districts by code", async () => {
    const token = createTestToken();

    await createDistrict({
      name: "Lagos District",
      code: "LG01",
    });

    await createDistrict({
      name: "Abuja District",
      code: "AB01",
    });

    const response = await request(app)
      .get("/api/districts?search=AB01")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].name).toBe("Abuja District");
    expect(response.body[0].code).toBe("AB01");
  });
  test("GET /api/districts calculates activeCells across all zones", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Test District With Cells",
      code: "CELL-001",
    });

    const zone1 = await createZone(district._id, {
      name: "Zone One",
    });

    const zone2 = await createZone(district._id, {
      name: "Zone Two",
    });

    await createCell(zone1._id, {
      name: "Cell One",
    });

    await createCell(zone1._id, {
      name: "Cell Two",
    });

    await createCell(zone2._id, {
      name: "Cell Three",
    });

    const response = await request(app)
      .get("/api/districts")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    const returnedDistrict = response.body.find(
      (item) => item._id === district._id.toString(),
    );

    expect(returnedDistrict).toBeDefined();
    expect(returnedDistrict.activeCells).toBe(3);
  });
  test("POST /api/districts creates and normalizes a district", async () => {
    const token = createTestToken();

    const response = await request(app)
      .post("/api/districts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "  Lagos District  ",
        code: " lg01 ",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.name).toBe("Lagos District");
    expect(response.body.code).toBe("LG01");
  });

  test("POST /api/districts rejects duplicate district names", async () => {
    const token = createTestToken();

    await createDistrict({
      name: "Lagos District",
      code: "LG01",
    });

    const response = await request(app)
      .post("/api/districts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "lagos district",
        code: "LG02",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("District profile name already exists.");
  });
  test("GET /api/districts requires authentication", async () => {
    const response = await request(app).get("/api/districts");

    expect(response.statusCode).toBe(401);
  });
  test("POST /api/districts requires authentication", async () => {
    const response = await request(app).post("/api/districts").send({
      name: "Protected District",
      code: "PD01",
    });

    expect(response.statusCode).toBe(401);
  });
  test("PUT /api/districts/:id updates and normalizes a district", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Old District",
      code: "OLD01",
    });

    const response = await request(app)
      .put(`/api/districts/${district._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "  Updated District  ",
        code: " new01 ",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.name).toBe("Updated District");
    expect(response.body.code).toBe("NEW01");
  });
  test("PUT /api/districts/:id returns 404 for a nonexistent district", async () => {
    const token = createTestToken();

    const fakeId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .put(`/api/districts/${fakeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Missing District",
        code: "MISS01",
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("District target record not found.");
  });
  test("PUT /api/districts/:id rejects a duplicate district name", async () => {
    const token = createTestToken();

    await createDistrict({
      name: "Existing District",
      code: "EX01",
    });

    const districtToUpdate = await createDistrict({
      name: "Another District",
      code: "AN01",
    });

    const response = await request(app)
      .put(`/api/districts/${districtToUpdate._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Existing District",
        code: "AN02",
      });

    expect(response.statusCode).toBe(400);
  });
  test("PUT /api/districts/:id requires authentication", async () => {
    const district = await createDistrict({
      name: "Protected Update District",
      code: "PU01",
    });

    const response = await request(app)
      .put(`/api/districts/${district._id}`)
      .send({
        name: "Updated Without Token",
        code: "UT01",
      });

    expect(response.statusCode).toBe(401);
  });
  test("DELETE /api/districts/:id deletes an existing district", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "District To Delete",
      code: "DEL01",
    });

    const response = await request(app)
      .delete(`/api/districts/${district._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("District removed successfully.");

    const deletedDistrict = await District.findById(district._id);

    expect(deletedDistrict).toBeNull();
  });
  test("DELETE /api/districts/:id returns 404 for a nonexistent district", async () => {
    const token = createTestToken();

    const fakeId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .delete(`/api/districts/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("District target record not found.");
  });
  test("DELETE /api/districts/:id requires authentication", async () => {
    const district = await createDistrict({
      name: "Protected Delete District",
      code: "PD01",
    });

    const response = await request(app).delete(
      `/api/districts/${district._id}`,
    );

    expect(response.statusCode).toBe(401);
  });
});
