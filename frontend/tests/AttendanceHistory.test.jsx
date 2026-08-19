import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import AttendanceHistory from "../src/pages/AttendanceHistory.jsx";

import { attendanceService } from "../src/api/apiClient.js";

jest.mock("../src/api/apiClient.js", () => ({
  attendanceService: {
    summary: jest.fn(),
  },
}));

describe("AttendanceHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    attendanceService.summary.mockResolvedValue({
      summaries: [],
    });
  });

  test("renders attendance history controls and empty state", async () => {
    render(
      <MemoryRouter>
        <AttendanceHistory />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: /comprehensive attendance history & date review/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/search by cell or date/i),
    ).toBeInTheDocument();

    expect(
      await screen.findByText(/no historical log matching sheets found/i),
    ).toBeInTheDocument();

    expect(attendanceService.summary).toHaveBeenCalledTimes(1);
  });
  test("displays calculated attendance statistics correctly", async () => {
    attendanceService.summary.mockResolvedValue({
      summaries: [
        {
          _id: "history1",
          date: "2026-08-10",
          cellName: "Cell 1",
          totalPresent: 8,
          totalAbsent: 2,
        },
      ],
    });

    render(
      <MemoryRouter>
        <AttendanceHistory />
      </MemoryRouter>,
    );

    expect(await screen.findByText("2026-08-10")).toBeInTheDocument();

    expect(screen.getByText("Cell 1")).toBeInTheDocument();

    expect(screen.getByText("8 Members")).toBeInTheDocument();

    expect(screen.getByText("2 Members")).toBeInTheDocument();

    // 8 present / 10 tracked = 80%
    expect(screen.getByText("80%")).toBeInTheDocument();
  });
  test("filters attendance history by cell or date search", async () => {
    const user = userEvent.setup();

    attendanceService.summary.mockResolvedValue({
      summaries: [
        {
          _id: "history1",
          date: "2026-08-10",
          cellName: "Cell 1",
          totalPresent: 8,
          totalAbsent: 2,
        },
        {
          _id: "history2",
          date: "2026-08-09",
          cellName: "Cell 2",
          totalPresent: 6,
          totalAbsent: 4,
        },
      ],
    });

    render(
      <MemoryRouter>
        <AttendanceHistory />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Cell 1")).toBeInTheDocument();
    expect(screen.getByText("Cell 2")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search by cell or date/i);

    await user.type(searchInput, "Cell 2");

    expect(screen.getByText("Cell 2")).toBeInTheDocument();

    expect(screen.queryByText("Cell 1")).not.toBeInTheDocument();
  });
  test("loads a historical sheet and navigates to attendance", async () => {
    const user = userEvent.setup();

    attendanceService.summary.mockResolvedValue({
      summaries: [
        {
          _id: "history1",
          date: "2026-08-10",
          cellName: "Cell 1",
          totalPresent: 8,
          totalAbsent: 2,
        },
      ],
    });

    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(
      <MemoryRouter>
        <AttendanceHistory />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Cell 1")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /load sheet/i,
      }),
    );

    expect(localStorage.getItem("cell_date")).toBe("2026-08-10");
    expect(localStorage.getItem("cell_loc")).toBe("Cell 1");
    expect(localStorage.getItem("is_history_override")).toBe("true");

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringContaining("Historical Register worksheet"),
    );

    alertSpy.mockRestore();
  });
  test("paginates attendance history records", async () => {
    const user = userEvent.setup();

    const summaries = Array.from({ length: 6 }, (_, index) => ({
      _id: `history${index + 1}`,
      date: `2026-08-${String(10 - index).padStart(2, "0")}`,
      cellName: `Cell ${index + 1}`,
      totalPresent: 8,
      totalAbsent: 2,
    }));

    attendanceService.summary.mockResolvedValue({
      summaries,
    });

    render(
      <MemoryRouter>
        <AttendanceHistory />
      </MemoryRouter>,
    );

    // First page contains the first five records.
    expect(await screen.findByText("Cell 1")).toBeInTheDocument();
    expect(screen.getByText("Cell 5")).toBeInTheDocument();

    // Sixth record should not be on the first page.
    expect(screen.queryByText("Cell 6")).not.toBeInTheDocument();

    // Move to page 2.
    await user.click(
      screen.getByRole("button", {
        name: "2",
      }),
    );

    expect(screen.getByText("Cell 6")).toBeInTheDocument();

    // First-page record should no longer be displayed.
    expect(screen.queryByText("Cell 1")).not.toBeInTheDocument();
  });
});
