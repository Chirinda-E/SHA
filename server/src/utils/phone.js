/** Normalise Zimbabwe phone numbers to 07XXXXXXXX. */
export function normalisePhone(input) {
  if (!input) return '';
  const digits = String(input).replace(/\D/g, '');
  if (digits.startsWith('263') && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return digits;
  }
  if (digits.length === 9 && digits.startsWith('7')) {
    return `0${digits}`;
  }
  return String(input).trim();
}

export function isValidZwPhone(phone) {
  return /^07\d{8}$/.test(normalisePhone(phone));
}
