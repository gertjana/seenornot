import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
const options = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/** @param {string} password @param {Buffer} salt @returns {Promise<Buffer>} */
function deriveKey(password, salt) {
	return new Promise((resolve, reject) => {
		scrypt(password, salt, 64, options, (error, key) => {
			if (error) reject(error);
			else resolve(key);
		});
	});
}

// Unknown users must still incur the same scrypt work as an incorrect password.
export const DUMMY_PASSWORD_HASH = `scrypt$16384$8$1$${'00'.repeat(16)}$${'00'.repeat(64)}`;

/** @param {string} password */
export async function hashPassword(password) {
	const salt = randomBytes(16);
	const key = await deriveKey(password, salt);
	return `scrypt$16384$8$1$${salt.toString('hex')}$${key.toString('hex')}`;
}

/** @param {string} password @param {string} passwordHash */
export async function verifyPassword(password, passwordHash) {
	const valid = /^scrypt\$16384\$8\$1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(passwordHash);
	const parts = (valid ? passwordHash : DUMMY_PASSWORD_HASH).split('$');
	const key = await deriveKey(password, Buffer.from(parts[4], 'hex'));
	return timingSafeEqual(key, Buffer.from(parts[5], 'hex')) && valid;
}
