// npm test -- --runInBand tests/cell.test.js
import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import Cell from "../models/Cell.js";
import Member from "../models/Member.js";

jest.unstable_mockModule("../utils/auditLogger.js", () => ({
  logAudit: jest.fn(),
}));

const { default: app } = await import("../app.js");

const { createTestToken } = await import("./helpers/token.js");
const { createDistrict, createZone, createCell } =
  await import("./helpers/factories.js");

describe("Cell API", () => {
  test("GET /api/cells returns cells for an authenticated user", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Test District",
      code: "TD01",
    });

    const zone = await createZone(district._id, {
      name: "Test Zone",
    });

    await createCell(zone._id, {
      name: "Test Cell",
      address: "Test Address",
    });

    const response = await request(app)
      .get("/api/cells")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.cells).toHaveLength(1);
    expect(response.body.cells[0].name).toBe("Test Cell");
    expect(response.body.cells[0].address).toBe("Test Address");
  });

  test("GET /api/cells searches cells by name", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Search District",
      code: "SD01",
    });

    const zone = await createZone(district._id, {
      name: "Search Zone",
    });

    await createCell(zone._id, {
      name: "Lagos Central Cell",
      address: "Lagos Address",
    });

    await createCell(zone._id, {
      name: "Abuja Central Cell",
      address: "Abuja Address",
    });

    const response = await request(app)
      .get("/api/cells?search=lagos")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.cells).toHaveLength(1);
    expect(response.body.cells[0].name).toBe("Lagos Central Cell");
  });
  test("GET /api/cells searches cells by address", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Address Search District",
      code: "ASD01",
    });

    const zone = await createZone(district._id, {
      name: "Address Search Zone",
    });

    await createCell(zone._id, {
      name: "Cell One",
      address: "123 Lagos Street",
    });

    await createCell(zone._id, {
      name: "Cell Two",
      address: "456 Abuja Road",
    });

    const response = await request(app)
      .get("/api/cells?search=lagos")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.cells).toHaveLength(1);
    expect(response.body.cells[0].name).toBe("Cell One");
    expect(response.body.cells[0].address).toBe("123 Lagos Street");
  });

  test("GET /api/cells filters cells by zone", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Zone Filter District",
      code: "ZFD01",
    });

    const zoneOne = await createZone(district._id, {
      name: "Zone One",
    });

    const zoneTwo = await createZone(district._id, {
      name: "Zone Two",
    });

    await createCell(zoneOne._id, {
      name: "Zone One Cell",
      address: "Zone One Address",
    });

    await createCell(zoneTwo._id, {
      name: "Zone Two Cell",
      address: "Zone Two Address",
    });

    const response = await request(app)
      .get(`/api/cells?zone=${zoneOne._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.cells).toHaveLength(1);
    expect(response.body.cells[0].name).toBe("Zone One Cell");
    expect(response.body.cells[0].zone).toBe(zoneOne._id.toString());
  });

  test("GET /api/cells supports pagination", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Pagination District",
      code: "PGD01",
    });

    const zone = await createZone(district._id, {
      name: "Pagination Zone",
    });

    await createCell(zone._id, {
      name: "Pagination Cell One",
    });

    await createCell(zone._id, {
      name: "Pagination Cell Two",
    });

    await createCell(zone._id, {
      name: "Pagination Cell Three",
    });

    const response = await request(app)
      .get("/api/cells?search=Pagination&page=2&limit=1")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.cells).toHaveLength(1);
    expect(response.body.currentPage).toBe(2);
    expect(response.body.totalPages).toBe(3);
    expect(response.body.totalItems).toBe(3);
    expect(response.body.cells[0].name).toBe("Pagination Cell Three");
  });
  test("POST /api/cells creates and normalizes a cell", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Create Cell District",
      code: "CCD01",
    });

    const zone = await createZone(district._id, {
      name: "Create Cell Zone",
    });

    const response = await request(app)
      .post("/api/cells")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "  Lagos Central Cell  ",
        zone: zone._id,
        address: "  Lagos Street  ",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.cell.name).toBe("Lagos Central Cell");
    expect(response.body.cell.zone).toBe(zone._id.toString());
    expect(response.body.cell.address).toBe("Lagos Street");

    const createdCell = await Cell.findOne({
      name: "Lagos Central Cell",
    });

    expect(createdCell).not.toBeNull();
  });
  test("POST /api/cells rejects missing required fields", async () => {
    const token = createTestToken();

    const response = await request(app)
      .post("/api/cells")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Incomplete Cell",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("All fields are required.");
  });

  test("POST /api/cells rejects duplicate cell names", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Duplicate Cell District",
      code: "DCD01",
    });

    const zone = await createZone(district._id, {
      name: "Duplicate Cell Zone",
    });

    await createCell(zone._id, {
      name: "Lagos Central Cell",
    });

    const response = await request(app)
      .post("/api/cells")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "lagos central cell",
        zone: zone._id,
        address: "Another Address",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
      'A cell group named "lagos central cell" already exists.',
    );
  });
  test("POST /api/cells requires authentication", async () => {
    const district = await createDistrict({
      name: "Protected Create District",
      code: "PCD01",
    });

    const zone = await createZone(district._id, {
      name: "Protected Create Zone",
    });

    const response = await request(app).post("/api/cells").send({
      name: "Protected Cell",
      zone: zone._id,
      address: "Protected Address",
    });

    expect(response.statusCode).toBe(401);
  });

  test("PUT /api/cells/:id updates a cell", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Update Cell District",
      code: "UCD01",
    });

    const zone = await createZone(district._id, {
      name: "Update Cell Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Old Cell Name",
      address: "Old Address",
    });

    const response = await request(app)
      .put(`/api/cells/${cell._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated Cell Name",
        address: "Updated Address",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.cell.name).toBe("Updated Cell Name");
    expect(response.body.cell.address).toBe("Updated Address");

    const updatedCell = await Cell.findById(cell._id);

    expect(updatedCell).not.toBeNull();
    expect(updatedCell.name).toBe("Updated Cell Name");
    expect(updatedCell.address).toBe("Updated Address");
  });

  test("PUT /api/cells/:id returns 404 for a nonexistent cell", async () => {
    const token = createTestToken();

    const fakeId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .put(`/api/cells/${fakeId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Missing Cell",
        address: "Missing Address",
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Cell not found.");
  });

  test("PUT /api/cells/:id rejects a duplicate cell name", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Update Duplicate District",
      code: "UDD01",
    });

    const zone = await createZone(district._id, {
      name: "Update Duplicate Zone",
    });

    await createCell(zone._id, {
      name: "Existing Cell",
      address: "Existing Address",
    });

    const cellToUpdate = await createCell(zone._id, {
      name: "Another Cell",
      address: "Another Address",
    });

    const response = await request(app)
      .put(`/api/cells/${cellToUpdate._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "existing cell",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe("Cell name already exists.");
  });
  test("PUT /api/cells/:id requires authentication", async () => {
    const district = await createDistrict({
      name: "Protected Update District",
      code: "PUD01",
    });

    const zone = await createZone(district._id, {
      name: "Protected Update Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Protected Update Cell",
      address: "Protected Address",
    });

    const response = await request(app).put(`/api/cells/${cell._id}`).send({
      name: "Updated Without Token",
      address: "Updated Address",
    });

    expect(response.statusCode).toBe(401);
  });
  test("DELETE /api/cells/:id deletes an existing cell", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Delete Cell District",
      code: "DEL01",
    });

    const zone = await createZone(district._id, {
      name: "Delete Cell Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Cell To Delete",
      address: "Delete Address",
    });

    const response = await request(app)
      .delete(`/api/cells/${cell._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe(
      "Cell and all associated members removed successfully.",
    );

    const deletedCell = await Cell.findById(cell._id);

    expect(deletedCell).toBeNull();
  });
  test("DELETE /api/cells/:id also deletes associated members", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Cascade Delete District",
      code: "CDD01",
    });

    const zone = await createZone(district._id, {
      name: "Cascade Delete Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Cell With Members",
      address: "Cascade Address",
    });

    const memberOne = await Member.create({
      name: "Member One",
      phone: "08011111111",
      cell: cell._id,
    });

    const memberTwo = await Member.create({
      name: "Member Two",
      phone: "08022222222",
      cell: cell._id,
    });

    const response = await request(app)
      .delete(`/api/cells/${cell._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    const deletedCell = await Cell.findById(cell._id);
    const deletedMemberOne = await Member.findById(memberOne._id);
    const deletedMemberTwo = await Member.findById(memberTwo._id);

    expect(deletedCell).toBeNull();
    expect(deletedMemberOne).toBeNull();
    expect(deletedMemberTwo).toBeNull();
  });
  test("DELETE /api/cells/:id returns 404 for a nonexistent cell", async () => {
    const token = createTestToken();

    const fakeId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .delete(`/api/cells/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Cell not found.");
  });
  test("DELETE /api/cells/:id requires authentication", async () => {
    const district = await createDistrict({
      name: "Protected Delete District",
      code: "PDD01",
    });

    const zone = await createZone(district._id, {
      name: "Protected Delete Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Protected Delete Cell",
      address: "Protected Address",
    });

    const response = await request(app).delete(`/api/cells/${cell._id}`);

    expect(response.statusCode).toBe(401);
  });
});
