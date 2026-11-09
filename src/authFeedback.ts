export type AuthMode = "login" | "register" | "reset" | "confirm";
export function authErrorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code ?? "")
    : "";
}
export function needsEmailConfirmation(error: unknown): boolean {
  if (authErrorCode(error) === "email_not_confirmed") return true;
  return (
    error instanceof Error && /email (?:not|no) confirmed/i.test(error.message)
  );
}
export function authErrorMessage(error: unknown): string {
  const code = authErrorCode(error);
  if (needsEmailConfirmation(error))
    return "Email Anda belum diverifikasi. Buka email konfirmasi dari FrRoutine/Supabase, klik tautannya, lalu masuk kembali. Password Anda tidak perlu diganti.";
  if (code === "invalid_credentials")
    return "Email atau password belum sesuai. Periksa kembali atau gunakan Lupa password.";
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit"
  )
    return "Terlalu banyak permintaan. Tunggu beberapa saat sebelum mengirim email lagi.";
  if (code === "email_address_not_authorized")
    return "Layanan email proyek belum mengizinkan pengiriman ke alamat ini. Hubungi admin FrRoutine untuk konfigurasi email.";
  if (code === "otp_expired")
    return "Tautan verifikasi sudah kedaluwarsa atau pernah digunakan. Minta email verifikasi baru.";
  if (code === "email_address_invalid")
    return "Alamat email tidak valid. Periksa ejaannya.";
  return error instanceof Error
    ? error.message
    : "Permintaan belum berhasil. Coba lagi.";
}
