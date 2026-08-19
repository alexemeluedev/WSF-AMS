// npm test -- --runInBand tests/NotFoundPage.test.jsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFoundPage from "../src/pages/NotFoundPage.jsx";

describe("NotFoundPage", () => {
  test("renders the 404 not found message", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    expect(screen.getByText("404 Not Found")).toBeInTheDocument();

    expect(screen.getByText("This page does not exist")).toBeInTheDocument();
  });

  test("renders a Go Back link pointing to the home page", () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );

    const goBackLink = screen.getByRole("link", {
      name: /go back/i,
    });

    expect(goBackLink).toBeInTheDocument();
    expect(goBackLink).toHaveAttribute("href", "/");
  });
});
