const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[0-9]{10,15}$/;

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function validateInputField(field, value) {
  const safeValue = normalize(value);

  if (field === "fullName") {
    if (!safeValue) return "Full name is required";
    if (safeValue.length < 3) return "Full name must be at least 3 characters";
    return "";
  }

  if (field === "whatsappPhone") {
    if (!safeValue) return "WhatsApp phone number is required";
    if (!PHONE_REGEX.test(safeValue)) return "Enter a valid WhatsApp number (10-15 digits)";
    return "";
  }

  if (field === "email") {
    if (!safeValue) return "";
    if (!EMAIL_REGEX.test(safeValue)) return "Enter a valid email address";
    return "";
  }

  if (field === "stage") {
    if (!safeValue) return "Stage is required";
    if (safeValue.length < 2) return "Stage must be at least 2 characters";
    return "";
  }

  if (field === "sacco") {
    if (!safeValue) return "Sacco is required";
    if (safeValue.length < 2) return "Sacco must be at least 2 characters";
    return "";
  }

  return "";
}

export function validateInputFields(values = {}, fields = []) {
  const errors = {};

  fields.forEach((field) => {
    const error = validateInputField(field, values[field]);
    if (error) errors[field] = error;
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
