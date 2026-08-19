// npm test -- --runInBand
// npm install --save-dev jest supertest
// npm install --save-dev mongodb-memory-server
import { jest } from "@jest/globals";
import request from "supertest";

jest.unstable_mockModule("../utils/auditLogger.js", () => ({
  logAudit: jest.fn(),
}));

const { default: app } = await import("../app.js");

const { createTestToken } = await import("./helpers/token.js");
const { createDistrict, createZone } = await import("./helpers/factories.js");
import Zone from "../models/Zone.js";

describe("Zone API", () => {
  test("GET /api/zones searches zones by name", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    await createZone(district._id, {
      name: "Lagos Zone",
      headquarters: "Lagos HQ",
    });

    await createZone(district._id, {
      name: "Abuja Zone",
      headquarters: "Abuja HQ",
    });

    const response = await request(app)
      .get("/api/zones?search=lagos")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.totalItems).toBe(1);
    expect(response.body.zones).toHaveLength(1);
    expect(response.body.zones[0].name).toBe("Lagos Zone");
  });
  test("GET /api/zones searches zones by headquarters", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    await createZone(district._id, {
      name: "Lagos Zone",
      headquarters: "Victoria Island HQ",
    });

    await createZone(district._id, {
      name: "Abuja Zone",
      headquarters: "Garki HQ",
    });

    const response = await request(app)
      .get("/api/zones?search=victoria")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.totalItems).toBe(1);
    expect(response.body.zones).toHaveLength(1);
    expect(response.body.zones[0].headquarters).toBe("Victoria Island HQ");
  });
  test("GET /api/zones supports pagination", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    await createZone(district._id, {
      name: "Zone A",
      headquarters: "HQ A",
    });

    await createZone(district._id, {
      name: "Zone B",
      headquarters: "HQ B",
    });

    await createZone(district._id, {
      name: "Zone C",
      headquarters: "HQ C",
    });

    const response = await request(app)
      .get("/api/zones?page=2&limit=2")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.currentPage).toBe(2);
    expect(response.body.totalItems).toBe(3);
    expect(response.body.totalPages).toBe(2);

    expect(response.body.zones).toHaveLength(1);
    expect(response.body.zones[0].name).toBe("Zone C");
  });
  test("GET /api/zones supports search", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    await createZone(district._id, {
      name: "Lagos Zone",
      headquarters: "Ikeja",
    });

    await createZone(district._id, {
      name: "Abuja Zone",
      headquarters: "Garki",
    });

    await createZone(district._id, {
      name: "Port Harcourt Zone",
      headquarters: "Mile 1",
    });

    const response = await request(app)
      .get("/api/zones?search=Lagos")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.totalItems).toBe(1);

    expect(response.body.zones).toHaveLength(1);

    expect(response.body.zones[0].name).toBe("Lagos Zone");
  });
  test("POST /api/zones creates a new zone", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    const response = await request(app)
      .post("/api/zones")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "New Zone",
        headquarters: "New HQ",
        district: district._id,
      });

    expect(response.statusCode).toBe(201);

    expect(response.body.name).toBe("New Zone");
    expect(response.body.headquarters).toBe("New HQ");
  });
  test("POST /api/zones rejects a zone without a name", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    const response = await request(app)
      .post("/api/zones")
      .set("Authorization", `Bearer ${token}`)
      .send({
        headquarters: "New HQ",
        district: district._id,
      });

    expect(response.statusCode).toBe(400);
  });
  test("POST /api/zones rejects an invalid district", async () => {
    const token = createTestToken();

    const response = await request(app)
      .post("/api/zones")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Invalid District Zone",
        headquarters: "Invalid HQ",
        district: "507f1f77bcf86cd799439011",
      });

    expect(response.statusCode).toBe(400);
  });
  test("PUT /api/zones/:id updates an existing zone", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    const zone = await createZone(district._id, {
      name: "Original Zone",
      headquarters: "Original HQ",
    });

    const response = await request(app)
      .put(`/api/zones/${zone._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated Zone",
        headquarters: "Updated HQ",
        district: district._id,
      });

    expect(response.statusCode).toBe(200);

    expect(response.body.name).toBe("Updated Zone");
    expect(response.body.headquarters).toBe("Updated HQ");
  });
  test("PUT /api/zones/:id returns 404 for a nonexistent zone", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    const nonexistentZoneId = "507f1f77bcf86cd799439011";

    const response = await request(app)
      .put(`/api/zones/${nonexistentZoneId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated Zone",
        headquarters: "Updated HQ",
        district: district._id,
      });

    expect(response.statusCode).toBe(404);

    expect(response.body.message).toBe("Zone target record not found.");
  });
  test("DELETE /api/zones/:id deletes an existing zone", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    const zone = await createZone(district._id, {
      name: "Zone To Delete",
      headquarters: "Delete HQ",
    });

    const response = await request(app)
      .delete(`/api/zones/${zone._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe("Zone removed successfully.");
  });
  test("DELETE /api/zones/:id returns 404 for a nonexistent zone", async () => {
    const token = createTestToken();

    const nonexistentZoneId = "507f1f77bcf86cd799439011";

    const response = await request(app)
      .delete(`/api/zones/${nonexistentZoneId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);

    expect(response.body.message).toBe("Zone target record not found.");
  });
  test("PUT /api/zones/:id rejects an invalid district", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    const zone = await createZone(district._id, {
      name: "Zone To Update",
      headquarters: "Original HQ",
    });

    const response = await request(app)
      .put(`/api/zones/${zone._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated Zone",
        headquarters: "Updated HQ",
        district: "507f1f77bcf86cd799439011",
      });

    expect(response.statusCode).toBe(400);
  });
  test("PUT /api/zones/:id rejects missing required fields", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    const zone = await createZone(district._id, {
      name: "Zone To Validate",
      headquarters: "Original HQ",
    });

    const response = await request(app)
      .put(`/api/zones/${zone._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        headquarters: "Updated HQ",
        district: district._id,
      });

    expect(response.statusCode).toBe(400);
  });
  test("POST /api/zones rejects duplicate zone names", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    await createZone(district._id, {
      name: "Unique Zone",
      headquarters: "HQ One",
    });

    const response = await request(app)
      .post("/api/zones")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Unique Zone",
        headquarters: "HQ Two",
        district: district._id,
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      'A zone named "Unique Zone" already exists.',
    );
  });
  test("PUT /api/zones/:id rejects duplicate zone names", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    await createZone(district._id, {
      name: "Existing Zone",
      headquarters: "Existing HQ",
    });

    const zoneToUpdate = await createZone(district._id, {
      name: "Zone To Update",
      headquarters: "Original HQ",
    });

    const response = await request(app)
      .put(`/api/zones/${zoneToUpdate._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Existing Zone",
        headquarters: "Updated HQ",
        district: district._id,
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      'A zone named "Existing Zone" already exists.',
    );
  });
  test("POST /api/zones requires authentication", async () => {
    const district = await createDistrict();

    const response = await request(app).post("/api/zones").send({
      name: "Unauthenticated Zone",
      headquarters: "Unauthorized HQ",
      district: district._id,
    });

    expect(response.statusCode).toBe(401);
  });
  test("PUT /api/zones/:id requires authentication", async () => {
    const district = await createDistrict();

    const zone = await createZone(district._id, {
      name: "Protected Zone",
      headquarters: "Protected HQ",
    });

    const response = await request(app).put(`/api/zones/${zone._id}`).send({
      name: "Updated Protected Zone",
      headquarters: "Updated HQ",
      district: district._id,
    });

    expect(response.statusCode).toBe(401);
  });
  test("DELETE /api/zones/:id requires authentication", async () => {
    const district = await createDistrict();

    const zone = await createZone(district._id, {
      name: "Protected Delete Zone",
      headquarters: "Protected Delete HQ",
    });

    const response = await request(app).delete(`/api/zones/${zone._id}`);

    expect(response.statusCode).toBe(401);
  });
  test("DELETE /api/zones/:id deletes an existing zone for an authenticated user", async () => {
    const token = createTestToken();

    const district = await createDistrict();

    const zone = await createZone(district._id, {
      name: "Zone To Delete",
      headquarters: "Delete HQ",
    });

    const response = await request(app)
      .delete(`/api/zones/${zone._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Zone removed successfully.");

    const deletedZone = await Zone.findById(zone._id);
    expect(deletedZone).toBeNull();
  });
});
