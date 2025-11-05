#!/usr/bin/env node

/**
 * i18n String Extraction Script
 * 
 * This script scans React components for i18n prop usage and extracts
 * strings to translation JSON files.
 * 
 * Usage: node scripts/extract-i18n.js
 */

const fs = require('fs')
const path = require('path')
const { glob } = require('glob')

const MESSAGES_DIR = path.join(__dirname, '../messages')
const COMPONENTS_DIR = path.join(__dirname, '../components')
const APP_DIR = path.join(__dirname, '../app')

// Load existing translations
function loadTranslations(locale) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`)
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return {}
  }
}

// Save translations
function saveTranslations(locale, translations) {
  const filePath = path.join(MESSAGES_DIR, `${locale}.json`)
  fs.writeFileSync(
    filePath,
    JSON.stringify(translations, null, 2) + '\n',
    'utf8'
  )
}

// Extract strings from JSX with i18n prop
function extractStrings(content) {
  const strings = new Set()
  
  // Match: <Component i18n>Text</Component>
  const i18nTagRegex = /<(\w+)[^>]*\si18n[^>]*>([^<]+)<\/\1>/g
  let match
  while ((match = i18nTagRegex.exec(content)) !== null) {
    const text = match[2].trim()
    if (text) {
      strings.add(text)
    }
  }
  
  // Match: <Component i18n="key">Text</Component>
  const i18nKeyRegex = /<(\w+)[^>]*\si18n="([^"]+)"[^>]*>([^<]*)<\/\1>/g
  while ((match = i18nKeyRegex.exec(content)) !== null) {
    const key = match[2]
    const text = match[3].trim()
    if (text) {
      strings.add(text)
    }
  }
  
  return Array.from(strings)
}

// Convert text to translation key
function textToKey(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '.')
    .substring(0, 50)
}

async function main() {
  console.log('Extracting i18n strings...')
  
  // Find all component files
  const files = await glob([
    path.join(COMPONENTS_DIR, '**/*.{tsx,jsx}'),
    path.join(APP_DIR, '**/*.{tsx,jsx}'),
  ], { ignore: ['**/node_modules/**'] })
  
  const allStrings = new Set()
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8')
    const strings = extractStrings(content)
    strings.forEach(s => allStrings.add(s))
  }
  
  console.log(`Found ${allStrings.size} strings to translate`)
  
  // Load existing translations
  const en = loadTranslations('en')
  const zh = loadTranslations('zh')
  
  // Add new strings to English (as base)
  for (const str of allStrings) {
    const key = textToKey(str)
    if (!en[key]) {
      en[key] = str
    }
  }
  
  // Save translations
  saveTranslations('en', en)
  saveTranslations('zh', zh)
  
  console.log('✓ Extraction complete!')
  console.log(`✓ Updated messages/en.json`)
  console.log(`✓ Updated messages/zh.json`)
  console.log('\nPlease fill in the Chinese translations in messages/zh.json')
}

main().catch(console.error)

