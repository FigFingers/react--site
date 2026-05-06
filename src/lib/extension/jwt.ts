import { SignJWT, jwtVerify } from "jose";

export type ExtensionTokenPayload = {
  extensionInstanceId: string;
  userId: string;
};

const EXPIRY = "30d";
const ALG = "HS256";

function getSecret() {
  const secret = process.env.EXTENSION_JWT_SECRET;
  if (!secret) throw new Error("EXTENSION_JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signExtensionToken(
  payload: ExtensionTokenPayload
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret());
}

export async function verifyExtensionToken(
  token: unknown
): Promise<ExtensionTokenPayload | null> {
  if (typeof token !== "string") return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const { extensionInstanceId, userId } = payload;
    if (typeof extensionInstanceId !== "string" || typeof userId !== "string") {
      return null;
    }
    return { extensionInstanceId, userId };
  } catch {
    return null;
  }
}
