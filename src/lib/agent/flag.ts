import type { FlaggedItem, InventoryWithProduct } from '@/types'

export function flagItems(snapshot: InventoryWithProduct[]): FlaggedItem[] {
  return snapshot.reduce<FlaggedItem[]>((acc, item) => {
    const isExpiring = item.days_to_expiry <= 7
    const isLowStock = item.quantity <= item.product.reorder_threshold
    if (!isExpiring && !isLowStock) return acc
    const reason = isExpiring && isLowStock ? 'both' : isExpiring ? 'expiry' : 'low_stock'
    return [...acc, { inventory: item, reason }]
  }, [])
}
