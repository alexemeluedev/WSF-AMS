// npm test -- --runInBand tests/member.test.js
import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import Member from "../models/Member.js";

jest.unstable_mockModule("../utils/auditLogger.js", () => ({
  logAudit: jest.fn(),
}));

const { default: app } = await import("../app.js");

const { createTestToken } = await import("./helpers/token.js");
const { createDistrict, createZone, createCell } =
  await import("./helpers/factories.js");

describe("Member API", () => {
  test("GET /api/members returns members for an authenticated user", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Member District",
      code: "MD01",
    });

    const zone = await createZone(district._id, {
      name: "Member Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Member Cell",
      address: "Member Address",
    });

    await Member.create({
      name: "John Member",
      phone: "08012345678",
      cell: cell._id,
    });

    const response = await request(app)
      .get("/api/members")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.members).toHaveLength(1);
    expect(response.body.members[0].name).toBe("John Member");
    expect(response.body.members[0].phone).toBe("08012345678");
  });
  test("GET /api/members populates cell information", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Populate District",
      code: "PD01",
    });

    const zone = await createZone(district._id, {
      name: "Populate Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Populate Cell",
      address: "Populate Address",
    });

    await Member.create({
      name: "Populated Member",
      phone: "08098765432",
      cell: cell._id,
    });

    const response = await request(app)
      .get("/api/members")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.members).toHaveLength(1);

    expect(response.body.members[0].cell).toBeDefined();
    expect(response.body.members[0].cell._id).toBe(cell._id.toString());
    expect(response.body.members[0].cell.name).toBe("Populate Cell");
    expect(response.body.members[0].cell.zone).toBe(zone._id.toString());
  });
  test("GET /api/members filters members by cell ObjectId", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Filter District",
      code: "FD01",
    });

    const zone = await createZone(district._id, {
      name: "Filter Zone",
    });

    const cellOne = await createCell(zone._id, {
      name: "Cell One",
    });

    const cellTwo = await createCell(zone._id, {
      name: "Cell Two",
    });

    await Member.create({
      name: "Member One",
      phone: "08011111111",
      cell: cellOne._id,
    });

    await Member.create({
      name: "Member Two",
      phone: "08022222222",
      cell: cellTwo._id,
    });

    const response = await request(app)
      .get(`/api/members?cell=${cellOne._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.members).toHaveLength(1);
    expect(response.body.members[0].name).toBe("Member One");
    expect(response.body.members[0].cell._id).toBe(cellOne._id.toString());
  });

  test("GET /api/members filters members by cell name", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Name Filter District",
      code: "NFD01",
    });

    const zone = await createZone(district._id, {
      name: "Name Filter Zone",
    });

    const cellOne = await createCell(zone._id, {
      name: "Lagos Central Cell",
    });

    const cellTwo = await createCell(zone._id, {
      name: "Abuja Central Cell",
    });

    await Member.create({
      name: "Lagos Member",
      phone: "08033333333",
      cell: cellOne._id,
    });

    await Member.create({
      name: "Abuja Member",
      phone: "08044444444",
      cell: cellTwo._id,
    });

    const response = await request(app)
      .get("/api/members?cell=Lagos%20Central%20Cell")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.members).toHaveLength(1);
    expect(response.body.members[0].name).toBe("Lagos Member");
    expect(response.body.members[0].cell.name).toBe("Lagos Central Cell");
  });
  test("GET /api/members returns an empty array for a nonexistent cell name", async () => {
    const token = createTestToken();

    const response = await request(app)
      .get("/api/members?cell=Nonexistent%20Cell")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.members).toEqual([]);
  });
  test("POST /api/members creates a member using a cell ObjectId", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Create Member District",
      code: "CMD01",
    });

    const zone = await createZone(district._id, {
      name: "Create Member Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Create Member Cell",
    });

    const response = await request(app)
      .post("/api/members")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "New Member",
        phone: "08055555555",
        cell: cell._id,
        gender: "Female",
        status: "Active",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.member).toBeDefined();
    expect(response.body.member.name).toBe("New Member");
    expect(response.body.member.phone).toBe("08055555555");
    expect(response.body.member.cell).toBe(cell._id.toString());
    expect(response.body.member.gender).toBe("Female");
    expect(response.body.member.status).toBe("Active");
  });
  test("POST /api/members creates a member using a cell name", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Create By Name District",
      code: "CBN01",
    });

    const zone = await createZone(district._id, {
      name: "Create By Name Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Create By Name Cell",
    });

    const response = await request(app)
      .post("/api/members")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Member By Cell Name",
        phone: "08066666666",
        cell: "Create By Name Cell",
        gender: "Male",
        status: "Active",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.member).toBeDefined();
    expect(response.body.member.name).toBe("Member By Cell Name");
    expect(response.body.member.phone).toBe("08066666666");
    expect(response.body.member.cell).toBe(cell._id.toString());
  });
  test("POST /api/members rejects missing required fields", async () => {
    const token = createTestToken();

    const response = await request(app)
      .post("/api/members")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Incomplete Member",
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe(
      "Name, phone, and cell assignment are required.",
    );
  });

  test("POST /api/members returns 404 for a nonexistent cell", async () => {
    const token = createTestToken();

    const fakeCellId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .post("/api/members")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Invalid Cell Member",
        phone: "08077777777",
        cell: fakeCellId,
        gender: "Male",
        status: "Active",
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Assigned cell group not found.");
  });
  test("POST /api/members requires authentication", async () => {
    const district = await createDistrict({
      name: "Protected Member District",
      code: "PMD01",
    });

    const zone = await createZone(district._id, {
      name: "Protected Member Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Protected Member Cell",
    });

    const response = await request(app).post("/api/members").send({
      name: "Protected Member",
      phone: "08088888888",
      cell: cell._id,
    });

    expect(response.statusCode).toBe(401);
  });
  test("PUT /api/members/:id updates an existing member", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Update Member District",
      code: "UMD01",
    });

    const zone = await createZone(district._id, {
      name: "Update Member Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Update Member Cell",
    });

    const member = await Member.create({
      name: "Old Member Name",
      phone: "08099999999",
      cell: cell._id,
      gender: "Male",
      status: "Active",
    });

    const response = await request(app)
      .put(`/api/members/${member._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Updated Member Name",
        phone: "08111111111",
        gender: "Female",
        status: "Inactive",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.member.name).toBe("Updated Member Name");
    expect(response.body.member.phone).toBe("08111111111");
    expect(response.body.member.gender).toBe("Female");
    expect(response.body.member.status).toBe("Inactive");
    expect(response.body.member.cell).toBe(cell._id.toString());
  });
  test("PUT /api/members/:id reassigns a member to another cell using a cell ObjectId", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Reassign District",
      code: "RAD01",
    });

    const zone = await createZone(district._id, {
      name: "Reassign Zone",
    });

    const oldCell = await createCell(zone._id, {
      name: "Old Member Cell",
    });

    const newCell = await createCell(zone._id, {
      name: "New Member Cell",
    });

    const member = await Member.create({
      name: "Reassign Member",
      phone: "08012312312",
      cell: oldCell._id,
      gender: "Male",
      status: "Active",
    });

    const response = await request(app)
      .put(`/api/members/${member._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        cell: newCell._id,
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.member.cell).toBe(newCell._id.toString());
  });
  test("PUT /api/members/:id reassigns a member using a cell name", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Reassign Name District",
      code: "RND01",
    });

    const zone = await createZone(district._id, {
      name: "Reassign Name Zone",
    });

    const oldCell = await createCell(zone._id, {
      name: "Original Cell",
    });

    const newCell = await createCell(zone._id, {
      name: "Replacement Cell",
    });

    const member = await Member.create({
      name: "Name Reassign Member",
      phone: "08023456789",
      cell: oldCell._id,
      gender: "Male",
      status: "Active",
    });

    const response = await request(app)
      .put(`/api/members/${member._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        cell: "Replacement Cell",
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.member.cell).toBe(newCell._id.toString());
  });
  test("PUT /api/members/:id returns 404 for a nonexistent member", async () => {
    const token = createTestToken();

    const fakeMemberId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .put(`/api/members/${fakeMemberId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Missing Member",
        phone: "08034567890",
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Member not found.");
  });
  test("PUT /api/members/:id returns 404 when assigning a nonexistent cell", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Invalid Reassign District",
      code: "IRD01",
    });

    const zone = await createZone(district._id, {
      name: "Invalid Reassign Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Valid Original Cell",
    });

    const member = await Member.create({
      name: "Member With Invalid Reassignment",
      phone: "08034561234",
      cell: cell._id,
      gender: "Male",
      status: "Active",
    });

    const fakeCellId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .put(`/api/members/${member._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        cell: fakeCellId,
      });

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("New assigned cell group not found.");
  });
  test("PUT /api/members/:id requires authentication", async () => {
    const district = await createDistrict({
      name: "Protected Update District",
      code: "PUD01",
    });

    const zone = await createZone(district._id, {
      name: "Protected Update Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Protected Update Cell",
    });

    const member = await Member.create({
      name: "Protected Update Member",
      phone: "08045678901",
      cell: cell._id,
      gender: "Male",
      status: "Active",
    });

    const response = await request(app).put(`/api/members/${member._id}`).send({
      name: "Unauthorized Update",
    });

    expect(response.statusCode).toBe(401);
  });
  test("DELETE /api/members/:id deletes an existing member", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Delete Member District",
      code: "DMD01",
    });

    const zone = await createZone(district._id, {
      name: "Delete Member Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Delete Member Cell",
    });

    const member = await Member.create({
      name: "Member To Delete",
      phone: "08056789012",
      cell: cell._id,
      gender: "Male",
      status: "Active",
    });

    const response = await request(app)
      .delete(`/api/members/${member._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe("Member deleted successfully.");

    const deletedMember = await Member.findById(member._id);

    expect(deletedMember).toBeNull();
  });
  test("DELETE /api/members/:id returns 404 for a nonexistent member", async () => {
    const token = createTestToken();

    const fakeMemberId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .delete(`/api/members/${fakeMemberId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
    expect(response.body.message).toBe("Member not found.");
  });
  test("DELETE /api/members/:id requires authentication", async () => {
    const district = await createDistrict({
      name: "Protected Delete District",
      code: "PDD01",
    });

    const zone = await createZone(district._id, {
      name: "Protected Delete Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Protected Delete Cell",
    });

    const member = await Member.create({
      name: "Protected Delete Member",
      phone: "08067890123",
      cell: cell._id,
      gender: "Male",
      status: "Active",
    });

    const response = await request(app).delete(`/api/members/${member._id}`);

    expect(response.statusCode).toBe(401);
  });
});
