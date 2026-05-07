import fs from 'fs'
import path from 'path'

// Load SKILL.md files from skills/ directory and inject into system prompt.
// Frontmatter (--- ... ---) is stripped; only the body is used.
// Pattern adapted from hermes-agent skill_utils.py parse_frontmatter.

function stripFrontmatter(content: string): string {
  if (!content.startsWith('---')) return content
  const end = content.indexOf('\n---', 3)
  if (end === -1) return content
  return content.slice(end + 4).trim()
}

export function loadSkills(): string {
  const skillsDir = path.join(process.cwd(), 'skills')
  if (!fs.existsSync(skillsDir)) return ''

  const parts: string[] = []
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(skillsDir, { withFileTypes: true })
  } catch {
    return ''
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md')
    if (!fs.existsSync(skillFile)) continue
    try {
      const content = fs.readFileSync(skillFile, 'utf-8')
      parts.push(stripFrontmatter(content))
    } catch {
      // Skip unreadable skill files
    }
  }

  return parts.length
    ? `\n\n## Loaded Skills\n\n${parts.join('\n\n---\n\n')}`
    : ''
}
