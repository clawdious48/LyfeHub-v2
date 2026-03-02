const db = require('./schema')
import { v4 as uuidv4 } from 'uuid'

interface MailAccount {
  id: string
  user_id: string
  email: string
  access_token: string
  refresh_token: string
  token_expiry: string
  hotkeys: string
  created_at: string
  updated_at: string
}

export async function getMailAccount(userId: string): Promise<MailAccount | null> {
  const row = await db.getOne(
    'SELECT * FROM mail_accounts WHERE user_id = $1',
    [userId],
  )
  return row as MailAccount | null
}

export async function createMailAccount(
  userId: string,
  email: string,
  accessToken: string,
  refreshToken: string,
  tokenExpiry: Date,
): Promise<MailAccount> {
  const id = uuidv4()
  await db.run(
    `INSERT INTO mail_accounts (id, user_id, email, access_token, refresh_token, token_expiry)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, userId, email, accessToken, refreshToken, tokenExpiry.toISOString()],
  )
  return (await getMailAccount(userId))!
}

export async function updateTokens(
  userId: string,
  accessToken: string,
  tokenExpiry: Date,
): Promise<void> {
  await db.run(
    `UPDATE mail_accounts SET access_token = $1, token_expiry = $2, updated_at = NOW()
     WHERE user_id = $3`,
    [accessToken, tokenExpiry.toISOString(), userId],
  )
}

export async function updateHotkeys(
  userId: string,
  hotkeys: Record<string, string>,
): Promise<void> {
  await db.run(
    `UPDATE mail_accounts SET hotkeys = $1, updated_at = NOW() WHERE user_id = $2`,
    [JSON.stringify(hotkeys), userId],
  )
}

export async function deleteMailAccount(userId: string): Promise<void> {
  await db.run('DELETE FROM mail_accounts WHERE user_id = $1', [userId])
}

module.exports = { getMailAccount, createMailAccount, updateTokens, updateHotkeys, deleteMailAccount }
