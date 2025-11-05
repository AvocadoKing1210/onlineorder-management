#!/usr/bin/env node

/**
 * i18n Coverage Checker
 * 
 * This script scans components for hardcoded English strings that should be translated
 * 
 * Usage: node scripts/check-i18n.js
 */

const fs = require('fs')
const path = require('path')
const { glob } = require('glob')

const COMPONENTS_DIR = path.join(__dirname, '../components')
const APP_DIR = path.join(__dirname, '../app')

// Common English words that might indicate untranslated strings
const ENGLISH_INDICATORS = [
  /\b(Submit|Cancel|Save|Delete|Edit|Add|Remove|Create|Update|Search|Filter|Sort|Export|Import)\b/i,
  /\b(Dashboard|Settings|Menu|Orders|Notifications|Analytics|Reports)\b/i,
  /\b(Yes|No|OK|Confirm|Close|Back|Next|Previous|Finish)\b/i,
  /\b(Error|Success|Warning|Info|Loading|Please|Required|Optional)\b/i,
]

// Skip these patterns (they're likely dynamic content or already translated)
const SKIP_PATTERNS = [
  /user\.(name|email)/i,
  /user\.(avatar|picture)/i,
  /className/i,
  /href/i,
  /url/i,
  /id=/i,
  /alt=/i,
  /placeholder=/i,
  /\/\//, // Comments
  /console\./i,
  /import.*from/i,
  /export.*from/i,
  /useState|useEffect|useRef/i,
  /className=|className:/i,
  /\/dashboard|\/orders|\/menu/i, // URLs
  /\/\*.*\*\//, // Block comments
]

function isLikelyUntranslated(str) {
  // Skip if it's a variable name or code
  if (str.includes('{') || str.includes('}') || str.includes('$')) {
    return false
  }
  
  // Skip if it matches skip patterns
  if (SKIP_PATTERNS.some(pattern => pattern.test(str))) {
    return false
  }
  
  // Check if it contains English words
  if (ENGLISH_INDICATORS.some(pattern => pattern.test(str))) {
    // But skip if it's already in a translation function
    return !str.includes('t(') && !str.includes('translations(') && !str.includes('useTranslation')
  }
  
  return false
}

function extractStrings(content, filePath) {
  const issues = []
  
  // Match string literals in JSX
  const stringLiteralRegex = />([^<{]+)</g
  let match
  while ((match = stringLiteralRegex.exec(content)) !== null) {
    const text = match[1].trim()
    if (text && text.length > 1 && isLikelyUntranslated(text)) {
      // Skip if it's in a translation call
      const beforeMatch = content.substring(0, match.index)
      const afterMatch = content.substring(match.index)
      
      if (!beforeMatch.includes('t(') && !beforeMatch.includes('translations(') && !afterMatch.includes('i18n')) {
        issues.push({
          text,
          line: content.substring(0, match.index).split('\n').length,
        })
      }
    }
  }
  
  // Match string literals in quotes
  const quotedStringRegex = /["']([A-Z][^"']{2,})["']/g
  while ((match = quotedStringRegex.exec(content)) !== null) {
    const text = match[1]
    if (isLikelyUntranslated(text)) {
      const beforeMatch = content.substring(0, match.index)
      if (!beforeMatch.includes('t(') && !beforeMatch.includes('translations(')) {
        issues.push({
          text,
          line: content.substring(0, match.index).split('\n').length,
        })
      }
    }
  }
  
  return issues
}

async function main() {
  console.log('🔍 Checking for untranslated strings...\n')
  
  const files = await glob([
    path.join(COMPONENTS_DIR, '**/*.{tsx,jsx}'),
    path.join(APP_DIR, '**/*.{tsx,jsx}'),
  ], { 
    ignore: [
      '**/node_modules/**',
      '**/ui/**', // Skip UI components (they're usually not translated)
      '**/*.d.ts',
    ]
  })
  
  const allIssues = []
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    const issues = extractStrings(content, file)
    
    if (issues.length > 0) {
      allIssues.push({
        file: path.relative(process.cwd(), file),
        issues,
      })
    }
  }
  
  if (allIssues.length === 0) {
    console.log('✅ No untranslated strings found!')
    return
  }
  
  console.log(`⚠️  Found ${allIssues.length} files with potential untranslated strings:\n`)
  
  for (const { file, issues } of allIssues) {
    console.log(`📄 ${file}`)
    for (const issue of issues.slice(0, 5)) { // Show max 5 per file
      console.log(`   Line ${issue.line}: "${issue.text}"`)
    }
    if (issues.length > 5) {
      console.log(`   ... and ${issues.length - 5} more`)
    }
    console.log()
  }
  
  console.log('\n💡 Tip: Use t("key") or useTranslation() hook to translate these strings')
  console.log('   Add translations to messages/en.json and messages/zh.json')
}

main().catch(console.error)

