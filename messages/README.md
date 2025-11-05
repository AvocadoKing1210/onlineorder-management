# Internationalization (i18n)

This directory contains translation files for the application.

## Supported Languages

- **English (en)** - Default language
- **Chinese/Mandarin (zh)** - 中文

## Translation File Structure

Translation files are JSON files with nested keys:

```json
{
  "common": {
    "cancel": "Cancel",
    "save": "Save"
  },
  "settings": {
    "title": "Settings",
    "general": "General"
  }
}
```

## Usage in Components

### Using the translation hook:

```tsx
import { useTranslation } from '@/components/i18n-text'

function MyComponent() {
  const { t } = useTranslation()
  
  return <div>{t('settings.title')}</div>
}
```

### Using the translation function directly:

```tsx
import { useLocale } from '@/lib/locale-context'
import { t } from '@/lib/i18n'

function MyComponent() {
  const { locale } = useLocale()
  const translations = t(locale)
  
  return <div>{translations('settings.title')}</div>
}
```

## Adding New Translations

1. Add the English translation to `messages/en.json`
2. Add the Chinese translation to `messages/zh.json`
3. Use the translation key in your component

## String Extraction (Future)

The `extract-i18n` script can extract strings from components with `i18n` prop:

```tsx
<Button i18n>Submit</Button>
```

Run the extraction:
```bash
npm run extract-i18n
```

This will scan components and add new strings to the translation files.

