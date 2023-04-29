import React from "react";
import { render } from "@testing-library/react";
import Message from "./Message";

describe("Message", () => {
  it("renders the message correctly", () => {
    const date = { _seconds: 1640102400, _nanoseconds: 0 }; // Jan 21, 2022 12:00:00 AM UTC
    const { getByText } = render(<Message date={date}>Hello world</Message>);
    expect(getByText("Hello world")).toBeInTheDocument();
  });

  it("displays the correct title attribute", () => {
    const date = { _seconds: 1640102400, _nanoseconds: 0 }; // Jan 21, 2022 12:00:00 AM UTC
    const { getByRole } = render(<Message date={date}>Hello world</Message>);
    expect(getByRole("listitem")).toHaveAttribute(
      "title",
      "1/21/2022, 12:00:00 AM"
    );
  });
});
