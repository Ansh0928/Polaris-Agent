import fs from 'fs'
import path from 'path'

export function loadSoul(): string {
  const soulPath = path.join(process.cwd(), 'soul.md')
  if (!fs.existsSync(soulPath)) return ''
  try {
    return fs.readFileSync(soulPath, 'utf-8').trim()
  } catch {
    return ''
  }
}
