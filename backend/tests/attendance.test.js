// npm test -- --runInBand tests/attendance.test.js
import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import Member from "../models/Member.js";

jest.unstable_mockModule("../utils/auditLogger.js", () => ({
  logAudit: jest.fn(),
}));
jest.unstable_mockModule("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({
        data: {
          id: "test-resend-message-id",
        },
        error: null,
      }),
    },
  })),
}));

const { default: app } = await import("../app.js");

const { createTestToken } = await import("./helpers/token.js");
const { createDistrict, createZone, createCell } =
  await import("./helpers/factories.js");

describe("Attendance API", () => {
  test("POST /api/attendance creates an attendance record", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Attendance District",
      code: "ATD01",
    });

    const zone = await createZone(district._id, {
      name: "Attendance Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Attendance Cell",
    });

    const member = await Member.create({
      name: "Attendance Member",
      phone: "08011111111",
      cell: cell._id,
      gender: "Male",
      status: "Active",
    });

    const response = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "2026-08-04",
        cellName: cell.name,
        leaderName: "John Leader",
        leaderPhone: "08022222222",
        records: [
          {
            memberId: member._id,
            name: member.name,
            phone: member.phone,
            gender: member.gender,
            status: "Present",
          },
        ],
        notes: "First attendance test",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.attendance).toBeDefined();
    expect(response.body.attendance.date).toBe("2026-08-04");
    expect(response.body.attendance.cellName).toBe("Attendance Cell");
    expect(response.body.attendance.leaderName).toBe("John Leader");
    expect(response.body.attendance.leaderPhone).toBe("08022222222");
    expect(response.body.attendance.notes).toBe("First attendance test");
    expect(response.body.attendance.records).toHaveLength(1);
    expect(response.body.attendance.records[0].name).toBe("Attendance Member");
    expect(response.body.attendance.records[0].status).toBe("Present");
  });
  test("POST /api/attendance requires authentication", async () => {
    const response = await request(app).post("/api/attendance").send({
      date: "2026-08-04",
      cellName: "Protected Attendance Cell",
      leaderName: "Protected Leader",
      leaderPhone: "08033333333",
      records: [],
      notes: "Unauthorized attendance",
    });

    expect(response.statusCode).toBe(401);
  });
  test("POST /api/attendance updates existing attendance for the same date and cell", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Duplicate Attendance District",
      code: "DAD01",
    });

    const zone = await createZone(district._id, {
      name: "Duplicate Attendance Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Duplicate Attendance Cell",
    });

    const member = await Member.create({
      name: "Attendance Update Member",
      phone: "08044444444",
      cell: cell._id,
      gender: "Female",
      status: "Active",
    });

    const firstResponse = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "2026-08-04",
        cellName: cell.name,
        leaderName: "First Leader",
        leaderPhone: "08055555555",
        records: [
          {
            memberId: member._id,
            name: member.name,
            phone: member.phone,
            gender: member.gender,
            status: "Absent",
          },
        ],
        notes: "First submission",
      });

    expect(firstResponse.statusCode).toBe(201);

    const secondResponse = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "2026-08-04",
        cellName: cell.name,
        leaderName: "Updated Leader",
        leaderPhone: "08066666666",
        records: [
          {
            memberId: member._id,
            name: member.name,
            phone: member.phone,
            gender: member.gender,
            status: "Present",
          },
        ],
        notes: "Updated submission",
      });

    expect(secondResponse.statusCode).toBe(201);
    expect(secondResponse.body.attendance.leaderName).toBe("Updated Leader");
    expect(secondResponse.body.attendance.leaderPhone).toBe("08066666666");
    expect(secondResponse.body.attendance.records[0].status).toBe("Present");
    expect(secondResponse.body.attendance.notes).toBe("Updated submission");

    const attendanceCount = await Attendance.countDocuments({
      date: "2026-08-04",
      cellName: cell.name,
    });

    expect(attendanceCount).toBe(1);
  });

  test("POST /api/attendance rejects attendance without a date", async () => {
    const token = createTestToken();

    const response = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${token}`)
      .send({
        cellName: "Missing Date Cell",
        leaderName: "Test Leader",
        leaderPhone: "08077777777",
        records: [],
        notes: "Missing date test",
      });

    expect(response.statusCode).toBe(400);
  });
  test("POST /api/attendance rejects attendance without a cell name", async () => {
    const token = createTestToken();

    const response = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "2026-08-04",
        leaderName: "Test Leader",
        leaderPhone: "08088888888",
        records: [],
        notes: "Missing cell name test",
      });

    expect(response.statusCode).toBe(400);
  });
  test("POST /api/attendance rejects attendance without records", async () => {
    const token = createTestToken();

    const response = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "2026-08-04",
        cellName: "Missing Records Cell",
        leaderName: "Test Leader",
        leaderPhone: "08099999999",
        notes: "Missing records test",
      });

    expect(response.statusCode).toBe(400);
  });
  test("POST /api/attendance saves multiple member attendance records", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Multiple Records District",
      code: "MRD01",
    });

    const zone = await createZone(district._id, {
      name: "Multiple Records Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Multiple Records Cell",
    });

    const memberOne = await Member.create({
      name: "Member One",
      phone: "08011111111",
      cell: cell._id,
      gender: "Male",
      status: "Active",
    });

    const memberTwo = await Member.create({
      name: "Member Two",
      phone: "08022222222",
      cell: cell._id,
      gender: "Female",
      status: "Active",
    });

    const response = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "2026-08-05",
        cellName: cell.name,
        leaderName: "Multiple Records Leader",
        leaderPhone: "08033333333",
        records: [
          {
            memberId: memberOne._id,
            name: memberOne.name,
            phone: memberOne.phone,
            gender: memberOne.gender,
            status: "Present",
          },
          {
            memberId: memberTwo._id,
            name: memberTwo.name,
            phone: memberTwo.phone,
            gender: memberTwo.gender,
            status: "Absent",
          },
        ],
        notes: "Multiple member attendance",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.attendance.records).toHaveLength(2);

    expect(response.body.attendance.records[0].name).toBe("Member One");
    expect(response.body.attendance.records[0].status).toBe("Present");

    expect(response.body.attendance.records[1].name).toBe("Member Two");
    expect(response.body.attendance.records[1].status).toBe("Absent");

    const savedAttendance = await Attendance.findById(
      response.body.attendance._id,
    );

    expect(savedAttendance.records).toHaveLength(2);
  });

  test("POST /api/attendance stores the authenticated user as createdBy", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Created By District",
      code: "CBD01",
    });

    const zone = await createZone(district._id, {
      name: "Created By Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Created By Cell",
    });

    const member = await Member.create({
      name: "Created By Member",
      phone: "08044444444",
      cell: cell._id,
      gender: "Male",
      status: "Active",
    });

    const response = await request(app)
      .post("/api/attendance")
      .set("Authorization", `Bearer ${token}`)
      .send({
        date: "2026-08-06",
        cellName: cell.name,
        leaderName: "Created By Leader",
        leaderPhone: "08055555555",
        records: [
          {
            memberId: member._id,
            name: member.name,
            phone: member.phone,
            gender: member.gender,
            status: "Present",
          },
        ],
        notes: "Created by test",
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.attendance.createdBy).toBeDefined();
  });
  test("GET /api/attendance/cell/:cellName returns attendance for a cell", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Cell Attendance District",
      code: "CAD01",
    });

    const zone = await createZone(district._id, {
      name: "Cell Attendance Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Cell Attendance Test",
    });

    await Attendance.create({
      date: "2026-08-01",
      cellName: cell.name,
      leaderName: "Cell Leader",
      leaderPhone: "08011111111",
      records: [],
      notes: "First attendance",
    });

    await Attendance.create({
      date: "2026-08-02",
      cellName: cell.name,
      leaderName: "Cell Leader",
      leaderPhone: "08011111111",
      records: [],
      notes: "Second attendance",
    });

    const response = await request(app)
      .get(`/api/attendance/cell/${encodeURIComponent(cell.name)}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.records).toHaveLength(2);

    expect(response.body.records[0].date).toBe("2026-08-02");
    expect(response.body.records[1].date).toBe("2026-08-01");
  });
  test("GET /api/attendance/cell/:cellName requires authentication", async () => {
    const response = await request(app).get(
      "/api/attendance/cell/Protected%20Attendance%20Cell",
    );

    expect(response.statusCode).toBe(401);
  });

  test("GET /api/attendance/history returns attendance for date and cell", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "History District",
      code: "HST01",
    });

    const zone = await createZone(district._id, {
      name: "History Zone",
    });

    const cell = await createCell(zone._id, {
      name: "History Test Cell",
    });

    await Attendance.create({
      date: "2026-08-07",
      cellName: cell.name,
      leaderName: "History Leader",
      leaderPhone: "08012345678",
      records: [
        {
          name: "History Member",
          phone: "08087654321",
          gender: "Female",
          status: "Present",
        },
      ],
      notes: "History attendance",
    });

    const response = await request(app)
      .get("/api/attendance/history")
      .query({
        date: "2026-08-07",
        cellName: cell.name,
      })
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.record).toBeDefined();
    expect(response.body.record.date).toBe("2026-08-07");
    expect(response.body.record.cellName).toBe(cell.name);
    expect(response.body.record.leaderName).toBe("History Leader");
    expect(response.body.record.leaderPhone).toBe("08012345678");
    expect(response.body.record.records).toHaveLength(1);
    expect(response.body.record.records[0].name).toBe("History Member");
    expect(response.body.record.records[0].status).toBe("Present");
  });
  test("GET /api/attendance/history returns a blank record when attendance does not exist", async () => {
    const token = createTestToken();

    const response = await request(app)
      .get("/api/attendance/history")
      .query({
        date: "2099-12-31",
        cellName: "Nonexistent Attendance Cell",
      })
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.record).toBeDefined();
    expect(response.body.record.records).toEqual([]);
    expect(response.body.record.notes).toBe("");
    expect(response.body.record.leaderName).toBe("");
    expect(response.body.record.leaderPhone).toBe("");
  });
  test("GET /api/attendance/history requires authentication", async () => {
    const response = await request(app).get("/api/attendance/history").query({
      date: "2026-08-07",
      cellName: "Protected History Cell",
    });

    expect(response.statusCode).toBe(401);
  });
  test("GET /api/attendance/summary calculates attendance statistics correctly", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Summary District",
      code: "SUM01",
    });

    const zone = await createZone(district._id, {
      name: "Summary Zone",
    });

    const cell = await createCell(zone._id, {
      name: "Summary Test Cell",
    });

    await Attendance.create({
      date: "2026-08-08",
      cellName: cell.name,
      leaderName: "Summary Leader",
      leaderPhone: "08011112222",
      records: [
        {
          name: "Present Male",
          phone: "08011111111",
          gender: "Male",
          status: "Present",
        },
        {
          name: "Present Female",
          phone: "08022222222",
          gender: "Female",
          status: "Present",
        },
        {
          name: "Absent Male",
          phone: "08033333333",
          gender: "Male",
          status: "Absent",
        },
        {
          name: "Present Child",
          phone: "08044444444",
          gender: "Children",
          status: "Present",
        },
      ],
    });

    const response = await request(app)
      .get("/api/attendance/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.summaries).toHaveLength(1);

    const summary = response.body.summaries[0];

    expect(summary.cellName).toBe(cell.name);
    expect(summary.date).toBe("2026-08-08");

    expect(summary.totalPresent).toBe(3);
    expect(summary.totalAbsent).toBe(1);

    expect(summary.male).toBe(1);
    expect(summary.female).toBe(1);
    expect(summary.children).toBe(1);
  });
  test("GET /api/attendance/summary requires authentication", async () => {
    const response = await request(app).get("/api/attendance/summary");

    expect(response.statusCode).toBe(401);
  });
  test("GET /api/attendance/summary separates summaries by cell and date", async () => {
    const token = createTestToken();

    const district = await createDistrict({
      name: "Grouping District",
      code: "GRP01",
    });

    const zone = await createZone(district._id, {
      name: "Grouping Zone",
    });

    const cellOne = await createCell(zone._id, {
      name: "Grouping Cell One",
    });

    const cellTwo = await createCell(zone._id, {
      name: "Grouping Cell Two",
    });

    await Attendance.create({
      date: "2026-08-08",
      cellName: cellOne.name,
      records: [
        {
          name: "Cell One Member",
          phone: "08011111111",
          gender: "Male",
          status: "Present",
        },
      ],
    });

    await Attendance.create({
      date: "2026-08-09",
      cellName: cellOne.name,
      records: [
        {
          name: "Cell One Member",
          phone: "08011111111",
          gender: "Male",
          status: "Absent",
        },
      ],
    });

    await Attendance.create({
      date: "2026-08-08",
      cellName: cellTwo.name,
      records: [
        {
          name: "Cell Two Member",
          phone: "08022222222",
          gender: "Female",
          status: "Present",
        },
      ],
    });

    const response = await request(app)
      .get("/api/attendance/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.summaries).toHaveLength(3);

    const summaryOne = response.body.summaries.find(
      (item) => item.cellName === cellOne.name && item.date === "2026-08-08",
    );

    const summaryTwo = response.body.summaries.find(
      (item) => item.cellName === cellOne.name && item.date === "2026-08-09",
    );

    const summaryThree = response.body.summaries.find(
      (item) => item.cellName === cellTwo.name && item.date === "2026-08-08",
    );

    expect(summaryOne.totalPresent).toBe(1);
    expect(summaryOne.totalAbsent).toBe(0);

    expect(summaryTwo.totalPresent).toBe(0);
    expect(summaryTwo.totalAbsent).toBe(1);

    expect(summaryThree.totalPresent).toBe(1);
    expect(summaryThree.totalAbsent).toBe(0);
  });
  test("GET /api/attendance/summary excludes attendance sheets with no member records", async () => {
    const token = createTestToken();

    await Attendance.create({
      date: "2026-08-10",
      cellName: "Empty Summary Cell",
      records: [],
      notes: "No attendance records",
    });

    const response = await request(app)
      .get("/api/attendance/summary")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    const emptyCellSummary = response.body.summaries.find(
      (summary) =>
        summary.cellName === "Empty Summary Cell" &&
        summary.date === "2026-08-10",
    );

    expect(emptyCellSummary).toBeUndefined();
  });
  test("DELETE /api/attendance/:id deletes an attendance sheet", async () => {
    const token = createTestToken();

    const attendance = await Attendance.create({
      date: "2026-08-11",
      cellName: "Delete Attendance Cell",
      leaderName: "Delete Leader",
      leaderPhone: "08012345678",
      records: [],
      notes: "Attendance to delete",
    });

    const response = await request(app)
      .delete(`/api/attendance/${attendance._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    const deletedAttendance = await Attendance.findById(attendance._id);

    expect(deletedAttendance).toBeNull();
  });
  test("DELETE /api/attendance/:id requires authentication", async () => {
    const attendance = await Attendance.create({
      date: "2026-08-12",
      cellName: "Protected Delete Cell",
      records: [],
      notes: "Should not be deleted",
    });

    const response = await request(app).delete(
      `/api/attendance/${attendance._id}`,
    );

    expect(response.statusCode).toBe(401);

    const existingAttendance = await Attendance.findById(attendance._id);

    expect(existingAttendance).not.toBeNull();
  });
  test("DELETE /api/attendance/:id returns 404 when attendance does not exist", async () => {
    const token = createTestToken();

    const fakeId = new mongoose.Types.ObjectId();

    const response = await request(app)
      .delete(`/api/attendance/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(404);
  });

  test("DELETE /api/attendance/reset-all-data removes all attendance data", async () => {
    const token = createTestToken();

    await Attendance.create([
      {
        date: "2026-08-13",
        cellName: "Reset Cell One",
        records: [],
        notes: "Reset test one",
      },
      {
        date: "2026-08-14",
        cellName: "Reset Cell Two",
        records: [],
        notes: "Reset test two",
      },
      {
        date: "2026-08-15",
        cellName: "Reset Cell Three",
        records: [],
        notes: "Reset test three",
      },
    ]);

    const beforeReset = await Attendance.countDocuments();

    expect(beforeReset).toBeGreaterThanOrEqual(3);

    const response = await request(app)
      .delete("/api/attendance/reset-all-data")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe(
      "Database master reset successful. All historical attendance sheets have been permanently wiped.",
    );

    const remainingAttendance = await Attendance.countDocuments();

    expect(remainingAttendance).toBe(0);
  });
  test("DELETE /api/attendance/reset-all-data rejects non-admin users", async () => {
    const token = createTestToken({ role: "user" });

    await Attendance.create({
      date: "2026-08-16",
      cellName: "Protected Reset Cell",
      records: [],
      notes: "Must survive unauthorized reset",
    });

    const response = await request(app)
      .delete("/api/attendance/reset-all-data")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(403);

    expect(response.body.message).toBe("Administrator privileges required.");

    const remainingAttendance = await Attendance.countDocuments({
      cellName: "Protected Reset Cell",
    });

    expect(remainingAttendance).toBe(1);
  });
  test("DELETE /api/attendance/:id rejects non-admin users", async () => {
    const token = createTestToken({ role: "user" });

    const attendance = await Attendance.create({
      date: "2026-08-17",
      cellName: "Protected Individual Delete Cell",
      records: [],
      notes: "Must not be deleted",
    });

    const response = await request(app)
      .delete(`/api/attendance/${attendance._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(403);

    expect(response.body.message).toBe("Administrator privileges required.");

    const remainingAttendance = await Attendance.findById(attendance._id);

    expect(remainingAttendance).not.toBeNull();
  });
  test("POST /api/attendance/dispatch-report requires a destination email", async () => {
    const token = createTestToken();

    const response = await request(app)
      .post("/api/attendance/dispatch-report")
      .set("Authorization", `Bearer ${token}`)
      .send({
        targetDate: "2026-08-17",
        present: 10,
        absent: 2,
        rate: 83.33,
        tableRows: "<tr><td>Test Cell</td></tr>",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      "Destination email address is required.",
    );
  });
  test("POST /api/attendance/dispatch-report dispatches an email successfully", async () => {
    const token = createTestToken();

    const response = await request(app)
      .post("/api/attendance/dispatch-report")
      .set("Authorization", `Bearer ${token}`)
      .send({
        destination: "admin@example.com",
        targetDate: "2026-08-17",
        present: 15,
        absent: 5,
        rate: 75,
        tableRows:
          "<tr><td>Test Cell</td><td>15</td><td>5</td><td>75%</td></tr>",
      });

    expect(response.statusCode).toBe(200);

    expect(response.body.message).toBe(
      "Automated digest data compiled and dispatched onto headquarters server successfully.",
    );

    expect(response.body.messageId).toBe("test-resend-message-id");
  });
  test("POST /api/attendance/dispatch-report handles Resend failure", async () => {
    const token = createTestToken();

    const resendModule = await import("resend");

    resendModule.Resend.mockImplementationOnce(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({
          data: null,
          error: {
            message: "Simulated Resend failure",
          },
        }),
      },
    }));

    const response = await request(app)
      .post("/api/attendance/dispatch-report")
      .set("Authorization", `Bearer ${token}`)
      .send({
        destination: "admin@example.com",
        targetDate: "2026-08-17",
        present: 15,
        absent: 5,
        rate: 75,
        tableRows:
          "<tr><td>Test Cell</td><td>15</td><td>5</td><td>75%</td></tr>",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.message).toBe(
      "Resend SDK rejected the email request.",
    );

    expect(response.body.error.message).toBe("Simulated Resend failure");
  });
  test("POST /api/attendance/dispatch-report requires authentication", async () => {
    const response = await request(app)
      .post("/api/attendance/dispatch-report")
      .send({
        destination: "admin@example.com",
        targetDate: "2026-08-17",
        present: 15,
        absent: 5,
        rate: 75,
        tableRows:
          "<tr><td>Test Cell</td><td>15</td><td>5</td><td>75%</td></tr>",
      });

    expect(response.statusCode).toBe(401);
  });
});
