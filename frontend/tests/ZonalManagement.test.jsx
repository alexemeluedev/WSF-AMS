// npm test -- --runInBand tests/ZonalManagement.test.jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "../src/contexts/AuthContext.jsx";
import ZonalManagement from "../src/pages/ZonalManagement.jsx";
import {
  authService,
  statsService,
  attendanceService,
} from "../src/api/apiClient";

jest.mock("../src/api/apiClient", () => ({
  authService: {
    getUsers: jest.fn(),
  },
  statsService: {
    getSummary: jest.fn(),
  },
  attendanceService: {
    summary: jest.fn(),
    dispatchEmailReport: jest.fn(),
  },
}));

jest.mock("../src/contexts/AuthContext.jsx", () => ({
  useAuth: jest.fn(),
}));

describe("ZonalManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useAuth.mockReturnValue({
      user: {
        email: "admin@example.com",
        role: "admin",
      },
    });

    statsService.getSummary.mockResolvedValue({
      totalMembers: 25,
    });

    authService.getUsers.mockResolvedValue({
      users: [],
    });
  });

  test("renders the privilege access board", async () => {
    render(<ZonalManagement />);

    expect(
      screen.getByRole("button", {
        name: /privilege access board/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /email dispatch compiler/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /dark profile mode/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/zonal user access & privileges directory/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/configure administrative access parameters/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(statsService.getSummary).toHaveBeenCalledTimes(1);
      expect(authService.getUsers).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText(/total synced turnout/i)).toBeInTheDocument();
  });
  test("displays users returned by the API", async () => {
    authService.getUsers.mockResolvedValue({
      users: [
        {
          _id: "user1",
          email: "admin@example.com",
          role: "admin",
        },
        {
          _id: "user2",
          email: "leader@example.com",
          role: "user",
        },
      ],
    });

    statsService.getSummary.mockResolvedValue({
      totalMembers: 25,
    });

    render(<ZonalManagement />);

    expect(await screen.findByText("Evang. Mary Whiten")).toBeInTheDocument();

    expect(screen.getByText("Deacon Ademomo")).toBeInTheDocument();

    expect(screen.getByText("Zonal Coordinator")).toBeInTheDocument();

    expect(screen.getByText("Cell Leader")).toBeInTheDocument();

    expect(screen.getByText("All Center Scope")).toBeInTheDocument();

    expect(screen.getByText("EMPOWERMENT003")).toBeInTheDocument();

    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
  });
  test("toggles dark profile mode", async () => {
    authService.getUsers.mockResolvedValue({
      users: [],
    });

    statsService.getSummary.mockResolvedValue({
      totalMembers: 25,
    });

    render(<ZonalManagement />);

    // Wait for the initial async data loading to complete
    await waitFor(() => {
      expect(screen.getByText("25 Active")).toBeInTheDocument();
    });

    const toggleButton = screen.getByRole("button", {
      name: /dark profile mode/i,
    });

    expect(toggleButton).toBeInTheDocument();

    await userEvent.click(toggleButton);

    expect(
      screen.getByRole("button", {
        name: /light profile mode/i,
      }),
    ).toBeInTheDocument();
  });
  test("opens the email dispatch compiler", async () => {
    authService.getUsers.mockResolvedValue({
      users: [],
    });

    statsService.getSummary.mockResolvedValue({
      totalMembers: 25,
    });

    render(<ZonalManagement />);

    await waitFor(() => {
      expect(screen.getByText("25 Active")).toBeInTheDocument();
    });

    const reportingButton = screen.getByRole("button", {
      name: /email dispatch compiler/i,
    });

    await userEvent.click(reportingButton);

    expect(
      screen.getByText(/hq automated email integration/i),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /compile and dispatch real-time encrypted data summaries/i,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText(/destination headquarters email address/i),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /dispatch summary/i,
      }),
    ).toBeInTheDocument();
  });
  test("dispatches the attendance summary email", async () => {
    attendanceService.summary.mockResolvedValue({
      summaries: [
        {
          cellName: "Cell Alpha",
          totalPresent: 20,
          totalAbsent: 5,
        },
        {
          cellName: "Cell Beta",
          totalPresent: 15,
          totalAbsent: 10,
        },
      ],
    });

    attendanceService.dispatchEmailReport.mockResolvedValue({
      message: "Report dispatched successfully",
    });

    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    localStorage.setItem("wsf_token", "test-token");
    localStorage.setItem("cell_date", "2026-08-19");

    render(<ZonalManagement />);

    await userEvent.click(
      screen.getByRole("button", {
        name: /email dispatch compiler/i,
      }),
    );

    const emailInput = screen.getByLabelText(
      /destination headquarters email address/i,
    );

    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, "hq@example.com");

    await userEvent.click(
      screen.getByRole("button", {
        name: /dispatch summary/i,
      }),
    );

    await waitFor(() => {
      expect(attendanceService.summary).toHaveBeenCalledTimes(1);
      expect(attendanceService.dispatchEmailReport).toHaveBeenCalledTimes(1);
    });

    const dispatchBody = attendanceService.dispatchEmailReport.mock.calls[0][0];

    expect(dispatchBody).toEqual(
      expect.objectContaining({
        destination: "hq@example.com",
        targetDate: "2026-08-19",
        present: 35,
        absent: 15,
        rate: 70,
      }),
    );

    expect(typeof dispatchBody.tableRows).toBe("string");

    expect(dispatchBody.tableRows).toContain("Cell Alpha");
    expect(dispatchBody.tableRows).toContain("Cell Beta");

    console.log("ALERT CALLS:", alertSpy.mock.calls);

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining("Automated digest data compiled successfully"),
    );

    alertSpy.mockRestore();
  });
});
