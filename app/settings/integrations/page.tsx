import { redirect } from 'next/navigation'

// Health/wearable integrations are not built yet. Rather than show placeholder
// "Soon" rows (a store-rejection risk under Apple 4.2 / Play min-functionality),
// this route is retired until a real integration ships — any old deep link lands
// back on Settings.
export default function IntegrationsPage() {
  redirect('/settings')
}
