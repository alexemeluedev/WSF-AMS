// npm test -- --runInBand tests/Members.test.jsx
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import MemberManager from "../src/pages/MemberManager.jsx";

import { memberService, cellService } from "../src/api/apiClient.js";

jest.mock("../src/api/apiClient.js", () => ({
  memberService: {
    list: jest.fn(),
    create: jest.fn(),
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

describe("MemberManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    memberService.list.mockResolvedValue({
      members: [],
    });

    cellService.list.mockResolvedValue({
      cells: [],
    });
  });

  test("renders the member search, cell filter, and registration controls", async () => {
    render(
      <MemoryRouter>
        <MemberManager />
      </MemoryRouter>,
    );

    expect(
      await screen.findByPlaceholderText(/search with name or phone/i),
    ).toBeInTheDocument();

    expect(screen.getByText(/select cell/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: /induct new member/i,
      }),
    ).toBeInTheDocument();
  });
  test("displays existing member data", async () => {
    cellService.list.mockResolvedValue({
      cells: [
        {
          _id: "cell1",
          name: "Cell 1",
          zone: "Zone 1",
        },
      ],
    });

    memberService.list.mockResolvedValue({
      members: [
        {
          _id: "member1",
          name: "John Doe",
          phone: "08012345678",
          cell: {
            _id: "cell1",
            name: "Cell 1",
          },
          gender: "Male",
          status: "Active",
        },
      ],
    });

    render(
      <MemoryRouter>
        <MemberManager />
      </MemoryRouter>,
    );

    expect(await screen.findByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("08012345678")).toBeInTheDocument();
    expect(screen.getByText("Cell 1")).toBeInTheDocument();
    expect(screen.getByText("Male")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
  test("opens the register member form", async () => {
    const user = userEvent.setup();

    cellService.list.mockResolvedValue({
      cells: [
        {
          _id: "cell1",
          name: "Cell 1",
          zone: "Zone 1",
        },
      ],
    });

    render(
      <MemoryRouter>
        <MemberManager />
      </MemoryRouter>,
    );

    await user.click(
      await screen.findByRole("button", {
        name: /induct new member/i,
      }),
    );

    expect(
      screen.getByRole("heading", {
        name: /induct new member/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/full identity name/i)).toBeInTheDocument();
    expect(screen.getByText(/mobile contact phone/i)).toBeInTheDocument();
    expect(screen.getByText(/assigned cell registry/i)).toBeInTheDocument();
    expect(screen.getByText(/gender grouping/i)).toBeInTheDocument();
    expect(screen.getByText(/status flag/i)).toBeInTheDocument();
  });
  test("creates a new member", async () => {
    const user = userEvent.setup();

    cellService.list.mockResolvedValue({
      cells: [
        {
          _id: "cell1",
          name: "Cell 1",
          zone: "Zone 1",
        },
      ],
    });

    memberService.create.mockResolvedValue({
      member: {
        _id: "member2",
        name: "Jane Doe",
        phone: "08098765432",
        cell: {
          _id: "cell1",
          name: "Cell 1",
        },
        gender: "Female",
        status: "Active",
        attendance: "Present",
      },
    });

    render(
      <MemoryRouter>
        <MemberManager />
      </MemoryRouter>,
    );

    // Wait for the page to finish loading
    await user.click(
      await screen.findByRole("button", {
        name: /induct new member/i,
      }),
    );

    // Fill member name
    await user.type(
      screen.getByPlaceholderText(/e\.g\. john doe/i),
      "Jane Doe",
    );

    // Fill phone
    await user.type(
      screen.getByPlaceholderText(/e\.g\. \+234/i),
      "08098765432",
    );

    // Select cell
    const cellSelect = screen
      .getByText(/assigned cell registry/i)
      .closest("div")
      .querySelector("select");

    await user.selectOptions(cellSelect, "cell1");

    // Select gender
    const genderSelect = screen
      .getByText(/gender grouping/i)
      .closest("div")
      .querySelector("select");
    await user.selectOptions(genderSelect, "Female");

    // Submit
    await user.click(
      screen.getByRole("button", {
        name: /save changes/i,
      }),
    );

    expect(memberService.create).toHaveBeenCalledWith({
      name: "Jane Doe",
      attendance: "Present",
      cell: "cell1",
      phone: "08098765432",
      status: "Active",
      gender: "Female",
    });
  });
  test("opens the edit form with existing member data", async () => {
    const user = userEvent.setup();

    cellService.list.mockResolvedValue({
      cells: [
        {
          _id: "cell1",
          name: "Cell 1",
          zone: "Zone 1",
        },
      ],
    });

    memberService.list.mockResolvedValue({
      members: [
        {
          _id: "member1",
          name: "John Doe",
          phone: "08012345678",
          cell: {
            _id: "cell1",
            name: "Cell 1",
          },
          gender: "Male",
          status: "Active",
          attendance: "Present",
        },
      ],
    });

    render(
      <MemoryRouter>
        <MemberManager />
      </MemoryRouter>,
    );

    // Wait for the existing member to appear
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // Open the member actions menu
    await user.click(
      screen.getByRole("button", {
        name: "•••",
      }),
    );

    // Click Edit Info
    await user.click(
      screen.getByRole("button", {
        name: /edit info/i,
      }),
    );

    // Verify edit form opens
    expect(
      screen.getByRole("heading", {
        name: /modify member core details/i,
      }),
    ).toBeInTheDocument();

    // Verify existing member data
    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();

    expect(screen.getByDisplayValue("08012345678")).toBeInTheDocument();

    // Verify existing cell is selected
    const cellSelect = screen
      .getByText(/assigned cell registry/i)
      .closest("div")
      .querySelector("select");

    expect(cellSelect).toHaveValue("cell1");

    // Verify existing gender and status
    const genderSelect = screen
      .getByText(/gender grouping/i)
      .closest("div")
      .querySelector("select");

    expect(genderSelect).toHaveValue("Male");

    const statusSelect = screen
      .getByText(/status flag/i)
      .closest("div")
      .querySelector("select");

    expect(statusSelect).toHaveValue("Active");
  });
  test("updates an existing member", async () => {
    const user = userEvent.setup();

    cellService.list.mockResolvedValue({
      cells: [
        {
          _id: "cell1",
          name: "Cell 1",
          zone: "Zone 1",
        },
      ],
    });

    memberService.list.mockResolvedValue({
      members: [
        {
          _id: "member1",
          name: "John Doe",
          phone: "08012345678",
          cell: {
            _id: "cell1",
            name: "Cell 1",
          },
          gender: "Male",
          status: "Active",
          attendance: "Present",
        },
      ],
    });

    memberService.update.mockResolvedValue({
      member: {
        _id: "member1",
        name: "John Updated",
        phone: "08098765432",
        cell: {
          _id: "cell1",
          name: "Cell 1",
        },
        gender: "Male",
        status: "Active",
        attendance: "Present",
      },
    });

    render(
      <MemoryRouter>
        <MemberManager />
      </MemoryRouter>,
    );

    // Wait for the existing member
    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // Open actions menu
    await user.click(
      screen.getByRole("button", {
        name: "•••",
      }),
    );

    // Open edit form
    await user.click(
      screen.getByRole("button", {
        name: /edit info/i,
      }),
    );

    // Update name
    const nameInput = screen.getByDisplayValue("John Doe");
    await user.clear(nameInput);
    await user.type(nameInput, "John Updated");

    // Update phone
    const phoneInput = screen.getByDisplayValue("08012345678");
    await user.clear(phoneInput);
    await user.type(phoneInput, "08098765432");

    // Submit
    await user.click(
      screen.getByRole("button", {
        name: /save changes/i,
      }),
    );

    expect(memberService.update).toHaveBeenCalledWith("member1", {
      name: "John Updated",
      attendance: "Present",
      cell: "cell1",
      phone: "08098765432",
      status: "Active",
      gender: "Male",
    });
  });
  test("deletes an existing member", async () => {
    const user = userEvent.setup();

    cellService.list.mockResolvedValue({
      cells: [
        {
          _id: "cell1",
          name: "Cell 1",
          zone: "Zone 1",
        },
      ],
    });

    memberService.list.mockResolvedValue({
      members: [
        {
          _id: "member1",
          name: "John Doe",
          phone: "08012345678",
          cell: {
            _id: "cell1",
            name: "Cell 1",
          },
          gender: "Male",
          status: "Active",
          attendance: "Present",
        },
      ],
    });

    memberService.remove.mockResolvedValue({});

    render(
      <MemoryRouter>
        <MemberManager />
      </MemoryRouter>,
    );

    expect(await screen.findByText("John Doe")).toBeInTheDocument();

    // Open actions menu
    await user.click(
      screen.getByRole("button", {
        name: "•••",
      }),
    );

    // Open delete confirmation
    await user.click(
      screen.getByRole("button", {
        name: /^delete$/i,
      }),
    );

    // Verify confirmation modal
    expect(
      screen.getByRole("heading", {
        name: /expel member record/i,
      }),
    ).toBeInTheDocument();

    expect(screen.getByText(/"john doe"/i)).toBeInTheDocument();

    // Confirm deletion
    await user.click(
      screen.getByRole("button", {
        name: /expel member/i,
      }),
    );

    expect(memberService.remove).toHaveBeenCalledWith("member1");
  });
});
