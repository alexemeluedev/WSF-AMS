import District from "../../models/District.js";
import Zone from "../../models/Zone.js";
import Cell from "../../models/Cell.js";
import AuditLog from "../../models/AuditLog.js";

export const createDistrict = async (overrides = {}) => {
  return District.create({
    name: "Test District",
    code: "TEST-001",
    ...overrides,
  });
};

export const createZone = async (districtId, overrides = {}) => {
  return Zone.create({
    name: "Test Zone",
    headquarters: "Test Headquarters",
    district: districtId,
    ...overrides,
  });
};
export const createCell = async (zoneId, overrides = {}) => {
  return Cell.create({
    name: "Test Cell",
    zone: zoneId,
    address: "Test Address",
    ...overrides,
  });
};

export const createAuditLog = async (overrides = {}) => {
  return AuditLog.create({
    actorEmail: "admin@example.com",
    actorRole: "admin",
    action: "Member Created",
    resourceType: "Member",
    resourceId: "507f1f77bcf86cd799439011",
    resourceSummary: "John Doe",
    details: "Created successfully",
    ip: "127.0.0.1",
    userAgent: "Jest",
    ...overrides,
  });
};
