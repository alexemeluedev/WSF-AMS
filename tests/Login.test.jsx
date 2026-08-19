// npm test -- --runInBand tests/Login.test.jsx
// npm ls babel-jest @babel/core @babel/preset-react
// npm install --save-dev @babel/preset-react@7
// npm install --save-dev jest-environment-jsdom@30
// npm install --save-dev @testing-library/user-event

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Login from "../src/pages/Login.jsx";

const mockLogin = jest.fn();
const mockNavigate = jest.fn();

let mockAuthError = null;
let mockLoading = false;
let mockUser = null;

jest.mock("../src/contexts/AuthContext.jsx", () => ({
  useAuth: () => ({
    user: mockUser,
    login: mockLogin,
    loading: mockLoading,
    error: mockAuthError,
  }),
}));

jest.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("Login Page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthError = null;
    mockLoading = false;
    mockUser = null;
    localStorage.clear();
  });
  test("renders the login page", () => {
    render(<Login />);

    expect(
      screen.getByRole("heading", {
        name: /wsf attendance portal/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(/sign in to view attendance, members, and reports/i),
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  test("logs in successfully and navigates to home", async () => {
    mockLogin.mockResolvedValueOnce({});
    const user = userEvent.setup();
    render(<Login />);
    await user.type(screen.getByLabelText(/email/i), "admin@example.com");
    await user.type(screen.getByLabelText(/password/i), "password123");

    await user.click(
      screen.getByRole("button", {
        name: /sign in/i,
      }),
    );

    expect(mockLogin).toHaveBeenCalledWith("admin@example.com", "password123");
    expect(mockNavigate).toHaveBeenCalledWith("/", {
      replace: true,
    });
  });

  test("does not navigate when login fails", async () => {
    mockLogin.mockRejectedValueOnce(new Error("Invalid credentials"));

    const user = userEvent.setup();

    render(<Login />);

    await user.type(screen.getByLabelText(/email/i), "admin@example.com");

    await user.type(screen.getByLabelText(/password/i), "wrongpassword");

    await user.click(
      screen.getByRole("button", {
        name: /sign in/i,
      }),
    );

    expect(mockLogin).toHaveBeenCalledWith(
      "admin@example.com",
      "wrongpassword",
    );

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("displays the authentication error", () => {
    mockAuthError = "Invalid email or password";

    render(<Login />);

    expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
  });
  test("shows loading state while logging in", () => {
    mockLoading = true;

    render(<Login />);

    const button = screen.getByRole("button", {
      name: /logging in/i,
    });

    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("Logging in...");
  });

  test("redirects authenticated user to home", () => {
    mockUser = {
      id: "123",
      email: "admin@example.com",
    };

    localStorage.setItem("wsf_token", "test-token");

    render(<Login />);

    expect(mockNavigate).toHaveBeenCalledWith("/", {
      replace: true,
    });
  });
});
