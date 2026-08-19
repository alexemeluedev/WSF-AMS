// npm test -- --runInBand tests/ZonalAuditHistory.test.jsx

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
// import userEvent from "@testing-library/user-event";
import ZonalAuditHistory from "../src/pages/ZonalAuditHistory.jsx";
import { auditService } from "../src/api/apiClient";

jest.mock("../src/api/apiClient", () => ({
  auditService: {
    list: jest.fn(),
  },
}));

describe("ZonalAuditHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders the audit history controls", async () => {
    auditService.list.mockResolvedValue({
      logs: [],
    });

    render(<ZonalAuditHistory />);

    expect(
      screen.getByRole("heading", {
        name: /admin audit history/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /audit trail for admin actions, member changes, and attendance activity/i,
      ),
    ).toBeInTheDocument();

    expect(screen.getAllByText("Action").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Resource").length).toBeGreaterThan(0);
    expect(screen.getByText("Actor Email")).toBeInTheDocument();
    expect(screen.getByText("Start Date")).toBeInTheDocument();
    expect(screen.getByText("End Date")).toBeInTheDocument();

    expect(screen.getByPlaceholderText(/create member/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/member, user/i)).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/admin@example\.com/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /clear filters/i,
      }),
    ).toBeInTheDocument();

    // Wait for the async API request and resulting state updates
    await screen.findByText(/no audit logs found for the selected filters/i);

    expect(auditService.list).toHaveBeenCalledTimes(1);
  });

  test("displays audit logs returned by the API", async () => {
    auditService.list.mockResolvedValue({
      logs: [
        {
          _id: "log1",
          createdAt: "2026-08-17T10:30:00.000Z",
          actorEmail: "admin@example.com",
          actorRole: "Admin",
          action: "Create member",
          resourceType: "Member",
          resourceSummary: "John Doe",
          details: "Created a new member record",
          ip: "192.168.1.10",
        },
      ],
    });

    render(<ZonalAuditHistory />);

    expect(await screen.findByText("admin@example.com")).toBeInTheDocument();

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Create member")).toBeInTheDocument();
    expect(screen.getByText("Member")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Created a new member record")).toBeInTheDocument();
    expect(screen.getByText("192.168.1.10")).toBeInTheDocument();

    expect(
      screen.getByText(/showing 1 of 1 total audit record/i),
    ).toBeInTheDocument();
  });
  test("reloads audit logs when the action filter changes", async () => {
    auditService.list
      .mockResolvedValueOnce({
        logs: [],
      })
      .mockResolvedValueOnce({
        logs: [
          {
            _id: "log2",
            createdAt: "2026-08-18T10:30:00.000Z",
            actorEmail: "admin@example.com",
            actorRole: "Admin",
            action: "Delete member",
            resourceType: "Member",
            resourceSummary: "Jane Doe",
            details: "Deleted a member record",
            ip: "192.168.1.20",
          },
        ],
      });

    render(<ZonalAuditHistory />);

    // Wait for the initial API request
    await waitFor(() => {
      expect(auditService.list).toHaveBeenCalledTimes(1);
    });

    const actionInput = screen.getByPlaceholderText(/create member/i);

    fireEvent.change(actionInput, {
      target: { value: "Delete member" },
    });

    await waitFor(() => {
      expect(auditService.list).toHaveBeenCalledTimes(2);
    });

    expect(auditService.list).toHaveBeenLastCalledWith("?action=Delete+member");

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Delete member")).toBeInTheDocument();
  });
  test("clears all filters and reloads the audit logs", async () => {
    auditService.list
      .mockResolvedValueOnce({
        logs: [],
      })
      .mockResolvedValueOnce({
        logs: [],
      });

    render(<ZonalAuditHistory />);

    // Wait for the initial API request
    await waitFor(() => {
      expect(auditService.list).toHaveBeenCalledTimes(1);
    });

    const actionInput = screen.getByPlaceholderText(/create member/i);
    const resourceInput = screen.getByPlaceholderText(/member, user/i);
    const actorEmailInput = screen.getByPlaceholderText(/admin@example\.com/i);

    // Set filter values directly
    fireEvent.change(actionInput, {
      target: { value: "Delete member" },
    });

    fireEvent.change(resourceInput, {
      target: { value: "Member" },
    });

    fireEvent.change(actorEmailInput, {
      target: { value: "admin@example.com" },
    });

    // Wait for the filter-triggered requests
    await waitFor(() => {
      expect(auditService.list.mock.calls.length).toBeGreaterThan(1);
    });

    // Clear all filters
    fireEvent.click(
      screen.getByRole("button", {
        name: /clear filters/i,
      }),
    );

    await waitFor(() => {
      expect(auditService.list).toHaveBeenLastCalledWith("");
    });

    expect(actionInput).toHaveValue("");
    expect(resourceInput).toHaveValue("");
    expect(actorEmailInput).toHaveValue("");
  });
  test("paginates audit logs when more than 10 records are returned", async () => {
    const logs = Array.from({ length: 11 }, (_, index) => ({
      _id: `log${index + 1}`,
      createdAt: `2026-08-${String(10 + index).padStart(2, "0")}T10:30:00.000Z`,
      actorEmail: `admin${index + 1}@example.com`,
      actorRole: "Admin",
      action: "Create member",
      resourceType: "Member",
      resourceSummary: `Member ${index + 1}`,
      details: `Created member ${index + 1}`,
      ip: `192.168.1.${index + 1}`,
    }));

    auditService.list.mockResolvedValue({
      logs,
    });

    render(<ZonalAuditHistory />);

    // Wait for the API data to render
    expect(await screen.findByText("Member 1")).toBeInTheDocument();

    // Page 1 should contain 10 records
    expect(
      screen.getByText(/showing 10 of 11 total audit records/i),
    ).toBeInTheDocument();

    expect(screen.getByText("Member 10")).toBeInTheDocument();
    expect(screen.queryByText("Member 11")).not.toBeInTheDocument();

    // Pagination should be visible
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    const nextButton = screen.getByRole("button", {
      name: /next page/i,
    });

    expect(nextButton).toBeEnabled();

    fireEvent.click(nextButton);

    // Page 2 should contain the remaining record
    expect(await screen.findByText("Member 11")).toBeInTheDocument();

    expect(
      screen.getByText(/showing 1 of 11 total audit records/i),
    ).toBeInTheDocument();

    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    expect(screen.queryByText("Member 1")).not.toBeInTheDocument();

    // Return to page 1
    const previousButton = screen.getByRole("button", {
      name: /previous page/i,
    });

    expect(previousButton).toBeEnabled();

    fireEvent.click(previousButton);

    expect(await screen.findByText("Member 1")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });
  test("displays an error message when loading audit logs fails", async () => {
    auditService.list.mockRejectedValueOnce(
      new Error("Unable to load audit logs"),
    );

    render(<ZonalAuditHistory />);

    expect(
      await screen.findByText("Unable to load audit logs"),
    ).toBeInTheDocument();

    expect(screen.getByText("Unable to load audit logs")).toBeInTheDocument();
  });
});
