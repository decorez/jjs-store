'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/Badge'

interface StockWarningProps {
  businessId?: number
}

// Mendefinisikan bentuk data produk dari database
interface Product {
  id: number
  name: string
  box_stock: number
  min_box_stock: number
}

export const StockWarning = ({ businessId = 1 }: StockWarningProps) => {
  const [criticalProducts, setCriticalProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLowStock() {
      const { data } = await supabase
        .from('products')
        .select('id, name, box_stock, min_box_stock')
        .eq('business_id', businessId)

      if (data) {
        // Filter produk yang stok dusnya di bawah atau sama dengan batas minimal
        const filtered = data.filter((p: Product) => p.box_stock <= p.min_box_stock)
        setCriticalProducts(filtered)
      }
      setLoading(false)
    }

    fetchLowStock()
  }, [businessId])

  if (loading) return <div className="text-sm text-gray-500 p-4 bg-white rounded-xl border">Memuat status stok...</div>

  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800 text-base">⚠️ Peringatan Stok Menipis</h3>
        <Badge variant={criticalProducts.length > 0 ? 'warning' : 'success'}>
          {criticalProducts.length} Kritis
        </Badge>
      </div>

      {criticalProducts.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">Semua stok minuman aman 👍</p>
      ) : (
        <div className="space-y-3">
          {criticalProducts.map((item) => (
            <div key={item.id} className="flex justify-between items-center border-b border-gray-50 pb-2 text-sm">
              <span className="font-medium text-gray-700">{item.name}</span>
              <span className="font-bold text-amber-600">
                Sisa {item.box_stock} Dus <span className="text-xs text-gray-400 font-normal">(Min: {item.min_box_stock})</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}