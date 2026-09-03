export const isValidEmail = (email) => {
  if (typeof email !== "string") {
    return false;
  }
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
};

export const isStrongPassword = (password) => {
  if (typeof password !== "string") {
    return false;
  }
  return password.length >= 6;
};

export const sanitizeText = (text) => {
  if (typeof text !== "string") {
    return "";
  }
  return text.replace(/<[^>]*>/g, "").replace(/[<>]/g, "").trim();
};
