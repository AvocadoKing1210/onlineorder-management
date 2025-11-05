# Complete i18n Implementation Guide

## Overview

This application has full internationalization (i18n) support for English and Chinese (Mandarin). All static UI text is translated, while dynamic content (user names, data values) remains as-is.

## Translation Coverage

### ✅ Fully Translated Components

1. **Navigation & Sidebar**
   - Menu items (Dashboard, Orders, Menu, etc.)
   - Section headers (Operations, Content, Insights)
   - Tooltips for all menu items
   - Navigation labels

2. **Settings Dialog**
   - All labels, buttons, and descriptions
   - Theme options
   - Language selection
   - Notification preferences

3. **User Menu**
   - Notifications, Settings, Get Help, Log out

4. **Command Palette**
   - Search placeholder
   - All command items
   - Section headings
   - Empty state messages

5. **Site Header**
   - Dashboard title

## How to Use Translations

### Method 1: Using the `useTranslation` Hook (Recommended)

```tsx
import { useTranslation } from '@/components/i18n-text'

function MyComponent() {
  const { t } = useTranslation()
  
  return (
    <div>
      <h1>{t('navigation.dashboard')}</h1>
      <button>{t('common.save')}</button>
    </div>
  )
}
```

### Method 2: Using the `t` Function Directly

```tsx
import { useLocale } from '@/lib/locale-context'
import { t } from '@/lib/i18n'

function MyComponent() {
  const { locale } = useLocale()
  const translations = t(locale)
  
  return <div>{translations('navigation.dashboard')}</div>
}
```

### Method 3: For Navigation Data

Use the `getNavigationData()` function which automatically translates based on locale:

```tsx
import { getNavigationData } from '@/data/navigation-i18n'
import { useLocale } from '@/lib/locale-context'

function MyComponent() {
  const { locale } = useLocale()
  const navData = getNavigationData(locale)
  // navData is already translated
}
```

## Adding New Translations

### Step 1: Add to Translation Files

Add the new key to both `messages/en.json` and `messages/zh.json`:

**messages/en.json:**
```json
{
  "mySection": {
    "myKey": "My English Text"
  }
}
```

**messages/zh.json:**
```json
{
  "mySection": {
    "myKey": "我的中文文本"
  }
}
```

### Step 2: Use in Components

```tsx
const { t } = useTranslation()
return <div>{t('mySection.myKey')}</div>
```

## Translation File Structure

```
messages/
├── en.json          # English translations
├── zh.json          # Chinese translations
└── README.md        # Translation documentation
```

Translation keys are organized by feature/section:
- `common.*` - Common UI elements (buttons, labels)
- `navigation.*` - Navigation menu items
- `settings.*` - Settings dialog
- `userMenu.*` - User dropdown menu
- `commandPalette.*` - Command palette
- `theme.*` - Theme options

## Checking for Untranslated Strings

Run the checker script to find potential untranslated strings:

```bash
npm run check-i18n
```

This will scan all components and report any hardcoded English strings that should be translated.

## Best Practices

1. **Always use translation keys** - Never hardcode UI text
2. **Use descriptive keys** - `navigation.orders` is better than `orders`
3. **Group related translations** - Keep related strings in the same section
4. **Keep translations in sync** - When adding to `en.json`, always add to `zh.json`
5. **Test both languages** - Switch locale in settings to verify translations

## Dynamic Content (Not Translated)

These are intentionally NOT translated:
- User names (`user.name`)
- Email addresses (`user.email`)
- Data values from database
- URLs and paths
- Technical IDs and codes

## Locale Switching

Users can change their preferred locale in Settings → General → Preferred Locale. The change:
- Updates the UI immediately
- Saves to database when "Save Changes" is clicked
- Persists across sessions

## Troubleshooting

### Translation not showing
- Check that the key exists in both `en.json` and `zh.json`
- Verify the locale is set correctly
- Check browser console for errors

### Missing translation key
- Add the key to both translation files
- Use the translation key in your component
- Restart the dev server if needed

## Future Enhancements

- [ ] Add more languages (e.g., French, Spanish)
- [ ] Extract strings automatically with `i18n` prop
- [ ] Add translation management UI
- [ ] Support for pluralization
- [ ] Date/number formatting per locale

