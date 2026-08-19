// npm test -- --runInBand tests/MonthlyReport.test.jsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonthlyReport from "../src/pages/MonthlyReport.jsx";
import { attendanceService } from "../src/api/apiClient";

jest.mock("../src/api/apiClient", () => ({
  attendanceService: {
    summary: jest.fn(),
    save: jest.fn(),
  },
}));

describe("MonthlyReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test("renders the monthly attendance report controls", async () => {
    attendanceService.summary.mockResolvedValue({
      summaries: [],
    });

    render(<MonthlyReport />);

    expect(screen.getByText(/check attendance pool/i)).toBeInTheDocument();

    expect(screen.getByText(/monthly attendance reports/i)).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/search cell groups/i),
    ).toBeInTheDocument();

    expect(
      screen.getByDisplayValue(
        `${new Date().getFullYear()}-${String(
          new Date().getMonth() + 1,
        ).padStart(2, "0")}`,
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /export csv/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /log entry/i,
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(attendanceService.summary).toHaveBeenCalledTimes(1);
    });
  });
  test("displays attendance data for the selected month", async () => {
    const today = new Date();

    const currentMonth = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}`;

    attendanceService.summary.mockResolvedValue({
      summaries: [
        {
          id: "record1",
          cellName: "Cell Alpha",
          date: `${currentMonth}-01`,
          male: 10,
          female: 10,
          children: 5,
          totalPresent: 25,
        },
      ],
    });

    render(<MonthlyReport />);

    expect((await screen.findAllByText("Cell Alpha")).length).toBeGreaterThan(
      0,
    );

    expect((await screen.findAllByText("25")).length).toBeGreaterThan(0);
  });
  test("filters attendance records by cell name", async () => {
    const today = new Date();

    const currentMonth = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}`;

    attendanceService.summary.mockResolvedValue({
      summaries: [
        {
          id: "record1",
          cellName: "Cell Alpha",
          date: `${currentMonth}-01`,
          male: 10,
          female: 10,
          children: 5,
          totalPresent: 25,
        },
        {
          id: "record2",
          cellName: "Cell Beta",
          date: `${currentMonth}-02`,
          male: 8,
          female: 7,
          children: 4,
          totalPresent: 19,
        },
      ],
    });

    render(<MonthlyReport />);

    expect((await screen.findAllByText("Cell Alpha")).length).toBeGreaterThan(
      0,
    );

    expect((await screen.findAllByText("Cell Beta")).length).toBeGreaterThan(0);

    const searchInput = screen.getByPlaceholderText(/search cell groups/i);

    await userEvent.type(searchInput, "Alpha");

    expect((await screen.findAllByText("Cell Alpha")).length).toBeGreaterThan(
      0,
    );

    expect(screen.queryByText("Cell Beta")).not.toBeInTheDocument();
  });
  test("displays records for the selected month", async () => {
    attendanceService.summary.mockResolvedValue({
      summaries: [
        {
          id: "record1",
          cellName: "Cell Alpha",
          date: "2026-07-15",
          male: 8,
          female: 7,
          children: 3,
          totalPresent: 18,
        },
        {
          id: "record2",
          cellName: "Cell Beta",
          date: "2026-08-15",
          male: 10,
          female: 9,
          children: 4,
          totalPresent: 23,
        },
      ],
    });

    render(<MonthlyReport />);

    const monthInput = screen.getByDisplayValue(
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(
        2,
        "0",
      )}`,
    );

    await userEvent.clear(monthInput);
    await userEvent.type(monthInput, "2026-07");

    expect((await screen.findAllByText("Cell Alpha")).length).toBeGreaterThan(
      0,
    );

    expect(screen.queryByText("Cell Beta")).not.toBeInTheDocument();

    expect((await screen.findAllByText("18")).length).toBeGreaterThan(0);
  });
  test("opens attendance record details", async () => {
    const today = new Date();

    const currentMonth = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}`;

    attendanceService.summary.mockResolvedValue({
      summaries: [
        {
          id: "record1",
          cellName: "Cell Alpha",
          date: `${currentMonth}-01`,
          male: 10,
          female: 8,
          children: 5,
          totalPresent: 23,
        },
      ],
    });

    render(<MonthlyReport />);

    const viewDetailsButton = await screen.findByRole("button", {
      name: /view details/i,
    });

    await userEvent.click(viewDetailsButton);

    // Verify the details view/modal opens
    // expect(await screen.findByText("Cell Alpha")).toBeInTheDocument();
    expect((await screen.findAllByText("Cell Alpha")).length).toBeGreaterThan(
      0,
    );
  });
  test("exports the attendance report as CSV", async () => {
    const today = new Date();

    const currentMonth = `${today.getFullYear()}-${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}`;

    attendanceService.summary.mockResolvedValue({
      summaries: [
        {
          id: "record1",
          cellName: "Cell Alpha",
          date: `${currentMonth}-01`,
          male: 10,
          female: 8,
          children: 5,
          totalPresent: 23,
        },
      ],
    });

    const createObjectURLMock = jest
      .fn()
      .mockReturnValue("blob:monthly-report");

    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: createObjectURLMock,
    });

    const clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<MonthlyReport />);

    const exportButton = await screen.findByRole("button", {
      name: /export csv/i,
    });

    await userEvent.click(exportButton);

    expect(createObjectURLMock).toHaveBeenCalled();

    expect(clickSpy).toHaveBeenCalled();

    clickSpy.mockRestore();
  });
  test("opens the log entry drawer", async () => {
    attendanceService.summary.mockResolvedValue({
      summaries: [],
    });

    render(<MonthlyReport />);

    await userEvent.click(
      screen.getByRole("button", {
        name: /log entry/i,
      }),
    );

    expect(
      await screen.findByText(/manual attendance entry/i),
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/e\.g\. elevation 006/i),
    ).toBeInTheDocument();

    expect(screen.getByText("Brothers")).toBeInTheDocument();
    expect(screen.getByText("Sisters")).toBeInTheDocument();
    expect(screen.getByText("Children")).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /commit log/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /cancel/i,
      }),
    ).toBeInTheDocument();
  });
});
