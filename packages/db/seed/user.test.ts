import { describe, expect, it } from "vitest";
import { readUserInput } from "./user";

describe("readUserInput", () => {
  it("reads the email and password from USER_EMAIL and USER_PASSWORD", () => {
    expect(readUserInput({ USER_EMAIL: " Ana@Example.TEST ", USER_PASSWORD: "abcd1234" })).toEqual({
      email: "Ana@Example.TEST",
      password: "abcd1234",
    });
  });

  it("explains how to run the command when a variable is missing", () => {
    expect(() => readUserInput({ USER_PASSWORD: "abcd1234" })).toThrow(/USER_EMAIL/);
    expect(() => readUserInput({ USER_EMAIL: "ana@example.test" })).toThrow(/USER_PASSWORD/);
  });
});
