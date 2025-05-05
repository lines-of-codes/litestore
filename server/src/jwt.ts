import * as jose from "@panva/jose";
import { config } from "./config";

const alg = "HS256";
let secret: Uint8Array = new Uint8Array();

export async function prepareJwtSecret() {
	const secretFile = Bun.file("jwt_secret");

	if (await secretFile.exists()) {
		secret = await secretFile.bytes();
		return;
	}

	secret = new Uint8Array(32);
	crypto.getRandomValues(secret);

	secretFile.write(secret.toHex());
}

export async function signJwt(userId: number) {
	const token = await new jose.SignJWT({ uid: userId })
		.setProtectedHeader({ alg })
		.setIssuedAt()
		.setExpirationTime(config.jwtExpiration)
		.sign(secret);

	return token;
}

export function verifyJwt(jwt: string): Promise<jose.JWTVerifyResult> {
	return jose.jwtVerify(jwt, secret);
}
