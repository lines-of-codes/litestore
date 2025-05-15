/**
 * Generates a random string. The API doesn't necessarily need
 * to generate a cryptographically secure random string but
 * this code is just easy to write.
 * @param length Length of the output string.
 * Must be divisible by two or else will cause unexpected behavior.
 */
export function cryptoRandomString(length: number) {
	let arr = new Uint8Array(Math.round(length / 2));
	crypto.getRandomValues(arr);
	return arr.toHex();
}
