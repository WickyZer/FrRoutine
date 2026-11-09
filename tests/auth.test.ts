import test from "node:test";
import assert from "node:assert/strict";
import {
  authErrorMessage,
  needsEmailConfirmation,
} from "../src/authFeedback.ts";
test("unconfirmed email errors give verification instructions rather than password reset", () => {
  const error = Object.assign(new Error("Email not confirmed"), {
    code: "email_not_confirmed",
  });
  assert.equal(needsEmailConfirmation(error), true);
  assert.match(authErrorMessage(error), /belum diverifikasi/);
  assert.match(authErrorMessage(error), /tidak perlu diganti/);
});
test("invalid credentials never masquerade as an unconfirmed email", () => {
  const error = Object.assign(new Error("Invalid login credentials"), {
    code: "invalid_credentials",
  });
  assert.equal(needsEmailConfirmation(error), false);
  assert.match(authErrorMessage(error), /Email atau password/);
});
test("email delivery rate limits and expired links have actionable feedback", () => {
  assert.match(
    authErrorMessage({ code: "over_email_send_rate_limit" }),
    /Tunggu/,
  );
  assert.match(authErrorMessage({ code: "otp_expired" }), /kedaluwarsa/);
  assert.match(
    authErrorMessage({ code: "email_address_not_authorized" }),
    /konfigurasi email/,
  );
});
