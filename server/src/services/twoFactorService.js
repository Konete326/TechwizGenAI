import speakeasy from "speakeasy";
import qrcode from "qrcode";

export const generateTwoFactorSecret = async (userEmail) => {
  const secret = speakeasy.generateSecret({
    name: `TechwizGenAI (${userEmail})`,
    issuer: "TechwizGenAI",
    length: 20
  });
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
  return { secret: secret.base32, qrCodeUrl };
};

export const verifyTwoFactorToken = ({ secret, token }) => {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token: String(token),
    window: 1
  });
};

export default { generateTwoFactorSecret, verifyTwoFactorToken };
