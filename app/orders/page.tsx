'use client'

import { redirect } from 'next/navigation'

export default function OrdersPage() {
  // Redirect to order history by default
  redirect('/orders/history')
}

