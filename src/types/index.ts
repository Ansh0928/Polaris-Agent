export type Category = 'fish' | 'meat' | 'dairy' | 'produce' | 'other'

export interface Product {
  id: string
  name: string
  category: Category
  unit: string
  reorder_threshold: number
  cost_price_aud: number | null
  created_at: string
}

export interface Inventory {
  id: string
  product_id: string
  quantity: number
  expiry_date: string
  location: string
  zone: string | null
  unit: number | null
  shelf: string | null
  updated_at: string
}

export interface InventoryWithProduct extends Inventory {
  product: Product
  days_to_expiry: number
}

export interface AgentRun {
  id: string
  ran_at: string
  status: 'success' | 'error' | 'running'
  report_json: AgentReport | null
  email_html: string | null
  error_message: string | null
}

export interface ReorderLog {
  id: string
  run_id: string
  product_id: string
  supplier: string
  live_price_aud: number | null
  recommended_qty: number
  created_at: string
}

export type FlagReason = 'expiry' | 'low_stock' | 'both'

export interface FlaggedItem {
  inventory: InventoryWithProduct
  reason: FlagReason
}

export interface SupplierResult {
  product_name: string
  supplier: string
  price_aud: number | null
  url: string
  raw_text: string
}

export interface ReorderRecommendation {
  product_name: string
  product_id: string
  supplier: string
  recommended_qty: number
  estimated_cost_aud: number | null
  reason: string
}

export interface PurchaseOrderSummary {
  id: string
  product_name: string
  qty: number
  unit: string
  supplier: string
  price_per_unit_aud: number | null
  agent_reason: string
  approve_token: string
}

export interface WebsitePrice {
  product_name: string
  retail_price_aud: number
  unit: string
  category: string
  stock_quantity: number
  is_todays_special: boolean
  is_featured: boolean
}

export interface MarginAlert {
  product_name: string
  retail_price_aud: number
  cost_price_aud: number
  margin_pct: number
  unit: string
  status: 'healthy' | 'warning' | 'critical'
  note: string
}

export interface ToolTrace {
  tool: string
  input: Record<string, unknown>
  output: string
  duration_ms: number
  error?: string
}

export interface ReasoningBlock {
  after_tool_index: number
  text: string
}

export interface CompetitorSource {
  id: string
  label: string
  url: string
  last_scraped_at: string | null
  last_result: { prices?: CompetitorPrice[]; error?: string } | null
  created_at: string
}

export interface CompetitorPrice {
  name: string
  price_aud: number | null
  unit: string
  raw: string
}

export interface AgentReport {
  generated_at: string
  expiry_alerts: Array<{
    product_name: string
    quantity: number
    unit: string
    expiry_date: string
    days_to_expiry: number
    location: string
  }>
  low_stock_alerts: Array<{
    product_name: string
    quantity: number
    unit: string
    threshold: number
    location: string
  }>
  reorder_recommendations: ReorderRecommendation[]
  supplier_prices: SupplierResult[]
  website_prices: WebsitePrice[]
  margin_alerts: MarginAlert[]
  summary: string
  tool_trace?: ToolTrace[]
  reasoning_blocks?: ReasoningBlock[]
  competitor_prices?: Array<{ source_label: string; source_url: string; prices: CompetitorPrice[] }>
  purchase_orders?: PurchaseOrderSummary[]
}
