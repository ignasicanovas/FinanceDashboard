// ── Auth ──────────────────────────────────────────────────────
export interface User {
  id: number
  email: string
  full_name: string
  created_at?: string
  last_login?: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

// ── Accounts ─────────────────────────────────────────────────
export interface Account {
  id: number
  nombre: string
  banco: string
  emoji: string
  color: string
  descripcion: string
  db_blob: string
  created_at?: string
  access_level?: string
  is_owner?: number
}

export interface AccountStats {
  mes_gastos: number
  mes_ingresos: number
  mes_label: string
  total_sin_cat: number
  balance: number
  ok: boolean
}

export interface Member {
  id: number
  email: string
  full_name: string
  access_level: string
  invited_at?: string
}

// ── Transactions ─────────────────────────────────────────────
export interface Transaction {
  id: string
  fecha?: string
  fecha_valor?: string
  comercio?: string
  iban_origen?: string
  tipo?: string
  concepto?: string
  cuenta?: string
  importe?: number
  importe_original?: number
  moneda_original?: string
  tipo_cambio?: number
  es_gasto?: number
  categoria?: string
  compensacion_de?: string
  compensacion_tipo?: string
  desde_ahorro?: number
  diferir_mes?: number
  created_at?: string
  categoria_color?: string
  categoria_emoji?: string
  area?: string
  tags?: string[]
}

export interface TransactionListResponse {
  items: Transaction[]
  total: number
  page: number
  per_page: number
  pages: number
}

export interface UploadResult {
  total_csv: number
  insertadas: number
  duplicadas: number
  auto_categorized: number
  banco_detectado: string
}

// ── Categories ────────────────────────────────────────────────
export interface Category {
  nombre: string
  color: string
  emoji: string
  supercategoria: string
  created_at?: string
}

// ── Rules ─────────────────────────────────────────────────────
export interface Rule {
  id: number
  keyword: string
  categoria: string
  created_at?: string
}

// ── KPIs ──────────────────────────────────────────────────────
export interface Kpi {
  id: number
  label: string
  emoji: string
  orden: number
  areas: string
  areas_list: string[]
  categorias: string
  categorias_list: string[]
}

// ── Stats ─────────────────────────────────────────────────────
export interface MonthlySummaryItem {
  mes: string
  ingresos: number
  gastos: number
  num_transacciones: number
}

export interface CategoryBreakdown {
  categoria: string
  neto: number
  num: number
  color: string
}

export interface AreaBreakdown {
  area: string
  neto: number
}

export interface MonthlyCategoryItem {
  mes: string
  categoria: string
  color: string
  gasto: number
}

export interface MonthlyAreaItem {
  mes: string
  area: string
  gasto: number
}

// ── Tags ──────────────────────────────────────────────────────
export interface Tag {
  nombre: string
  color: string
  created_at?: string
}

// ── Filters ───────────────────────────────────────────────────
export interface TransactionFilters {
  fecha_desde?: string
  fecha_hasta?: string
  categoria?: string
  area?: string
  tag?: string
  desde_ahorro?: number
  paycheck_keyword?: string
  search?: string
  page?: number
  per_page?: number
}
