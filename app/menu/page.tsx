'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  IconCategory,
  IconList,
  IconSettings,
  IconArrowRight,
} from '@tabler/icons-react'
import { useTranslation } from '@/components/i18n-text'
import { getMenuCategories } from '@/lib/api/menu-categories'

export default function MenuOverviewPage() {
  const { t } = useTranslation()
  const [categoryCount, setCategoryCount] = useState<number | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const categories = await getMenuCategories()
        setCategoryCount(categories.length)
      } catch (error) {
        console.error('Error loading menu stats:', error)
      }
    }
    loadStats()
  }, [])

  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold">{t('menu.overview')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('menu.overviewDescription')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('navigation.categories')}
            </CardTitle>
            <IconCategory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categoryCount !== null ? categoryCount : '...'}
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              {t('navigation.categoriesTooltip')}
            </p>
            <Link href="/menu/categories">
              <Button variant="link" className="p-0 h-auto mt-2">
                Manage Categories
                <IconArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('navigation.items')}
            </CardTitle>
            <IconList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-muted-foreground text-xs mt-1">
              {t('navigation.itemsTooltip')}
            </p>
            <Link href="/menu/items">
              <Button variant="link" className="p-0 h-auto mt-2">
                Manage Items
                <IconArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('navigation.modifiers')}
            </CardTitle>
            <IconSettings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-muted-foreground text-xs mt-1">
              {t('navigation.modifiersTooltip')}
            </p>
            <Link href="/menu/modifiers">
              <Button variant="link" className="p-0 h-auto mt-2">
                Manage Modifiers
                <IconArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

