import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getSecret(): Buffer {
  const hex = process.env.AGENT_KEY_SECRET
  if (!hex || hex.length < 64) {
    throw new Error(
      'AGENT_KEY_SECRET is missing or too short. Generate one with: openssl rand -hex 32',
    )
  }
  return Buffer.from(hex, 'hex')
}

/** Encrypt a plaintext string. Returns `iv:ciphertext:tag` in hex. */
export function encryptApiKey(plaintext: string): string {
  const key = getSecret()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [
    iv.toString('hex'),
    encrypted.toString('hex'),
    tag.toString('hex'),
  ].join(':')
}

/** Decrypt a string produced by `encryptApiKey`. */
export function decryptApiKey(ciphertext: string): string {
  const key = getSecret()
  const [ivHex, encHex, tagHex] = ciphertext.split(':')
  if (!ivHex || !encHex || !tagHex) {
    throw new Error('Malformed encrypted value — expected iv:ciphertext:tag')
  }

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ])

  return decrypted.toString('utf8')
}
