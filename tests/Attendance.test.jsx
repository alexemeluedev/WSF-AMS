// npm test -- --runInBand tests/Attendance.test.jsx
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { AttendanceRegister } from "../src/pages/AttendanceRegister.jsx";

import {
  attendanceService,
  memberService,
  cellService,
} from "../src/api/apiClient.js";

jest.mock("../src/api/apiClient.js", () => ({
  attendanceService: {
    get: jest.fn(),
    getByDateAndCell: jest.fn(),
    save: jest.fn(),
    getHistory: jest.fn(),
    delete: jest.fn(),
  },
  memberService: {
    list: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
  cellService: {
    list: jest.fn(),
  },
}));

jest.mock("../src/contexts/StatsContext.jsx", () => ({
  useStats: () => ({
    refreshStats: jest.fn(),
  }),
}));

jest.mock("../src/contexts/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: {
      role: "admin",
    },
  }),
}));

describe("AttendanceRegister", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    cellService.list.mockResolvedValue({
      cells: [],
    });

    memberService.list.mockResolvedValue({
      members: [],
    });

    attendanceService.get.mockResolvedValue({
      records: [],
    });

    attendanceService.getByDateAndCell.mockResolvedValue({
      record: null,
    });

    attendanceService.getHistory.mockResolvedValue({
      records: [],
    });
  });

  test("renders the attendance controls and roster", async () => {
    render(
      <MemoryRouter>
        <AttendanceRegister />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/attendance register/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /save attendance roster/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /print report/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /export excel\/csv/i,
      }),
    ).toBeInTheDocument();
  });
  test("displays loaded members in the attendance roster", async () => {
    cellService.list.mockResolvedValue({
      cells: [
        {
          _id: "cell1",
          name: "Cell 1",
        },
      ],
    });

    memberService.list.mockResolvedValue({
      members: [
        {
          id: "member1",
          name: "John Doe",
          phone: "08012345678",
          gender: "MALE",
        },
        {
          id: "member2",
          name: "Jane Doe",
          phone: "08098765432",
          gender: "FEMALE",
        },
      ],
    });

    render(
      <MemoryRouter>
        <AttendanceRegister />
      </MemoryRouter>,
    );

    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("08012345678")).toBeInTheDocument();

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("08098765432")).toBeInTheDocument();
  });
  test("marks a member as present", async () => {
    const user = userEvent.setup();

    memberService.list.mockResolvedValue({
      members: [
        {
          id: "member1",
          name: "John Doe",
          phone: "08012345678",
          gender: "MALE",
        },
      ],
    });

    render(
      <MemoryRouter>
        <AttendanceRegister />
      </MemoryRouter>,
    );

    const memberName = await screen.findByText("John Doe");

    // Get the member's table row
    const row = memberName.closest("tr");

    // Initially the Present button displays "P"
    const presentButton = within(row).getByRole("button", {
      name: "P",
    });

    await user.click(presentButton);

    // After clicking, the button changes to "✔ PRESENT"
    expect(
      within(row).getByRole("button", {
        name: /present/i,
      }),
    ).toBeInTheDocument();
  });
  test("marks a member as absent", async () => {
    const user = userEvent.setup();

    memberService.list.mockResolvedValue({
      members: [
        {
          id: "member1",
          name: "John Doe",
          phone: "08012345678",
          gender: "MALE",
        },
      ],
    });

    render(
      <MemoryRouter>
        <AttendanceRegister />
      </MemoryRouter>,
    );

    const memberName = await screen.findByText("John Doe");

    const row = memberName.closest("tr");

    const absentButton = within(row).getByRole("button", {
      name: "A",
    });

    await user.click(absentButton);

    expect(
      within(row).getByRole("button", {
        name: /absent/i,
      }),
    ).toBeInTheDocument();
  });
  test("saves a fully marked attendance roster", async () => {
    const user = userEvent.setup();

    memberService.list.mockResolvedValue({
      members: [
        {
          id: "member1",
          name: "John Doe",
          phone: "08012345678",
          gender: "MALE",
        },
        {
          id: "member2",
          name: "Jane Doe",
          phone: "08098765432",
          gender: "FEMALE",
        },
      ],
    });

    attendanceService.save.mockResolvedValue({
      record: {
        _id: "attendance1",
      },
    });

    render(
      <MemoryRouter>
        <AttendanceRegister />
      </MemoryRouter>,
    );

    const johnRow = (await screen.findByText("John Doe")).closest("tr");

    const janeRow = screen.getByText("Jane Doe").closest("tr");

    // Mark John Present
    await user.click(
      within(johnRow).getByRole("button", {
        name: "P",
      }),
    );

    // Mark Jane Absent
    await user.click(
      within(janeRow).getByRole("button", {
        name: "A",
      }),
    );

    // Save attendance
    await user.click(
      screen.getByRole("button", {
        name: /save attendance roster/i,
      }),
    );

    expect(attendanceService.save).toHaveBeenCalled();
  });
  test("prevents saving when a member is unmarked", async () => {
    const user = userEvent.setup();

    memberService.list.mockResolvedValue({
      members: [
        {
          id: "member1",
          name: "John Doe",
          phone: "08012345678",
          gender: "MALE",
        },
        {
          id: "member2",
          name: "Jane Doe",
          phone: "08098765432",
          gender: "FEMALE",
        },
      ],
    });

    render(
      <MemoryRouter>
        <AttendanceRegister />
      </MemoryRouter>,
    );

    const johnRow = (await screen.findByText("John Doe")).closest("tr");

    // Mark only John as Present
    await user.click(
      within(johnRow).getByRole("button", {
        name: "P",
      }),
    );

    // Jane remains unmarked
    await user.click(
      screen.getByRole("button", {
        name: /save attendance roster/i,
      }),
    );

    expect(attendanceService.save).not.toHaveBeenCalled();
  });
});
