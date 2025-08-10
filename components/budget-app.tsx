"use client"

import type React from "react"
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  Plus,
  PieChart,
  List,
  CalendarIcon,
  ChevronDown,
  Wallet,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import type { TooltipProps } from "recharts"
import {
  Pie,
  PieChart as RPieChart,
  Cell,
  ResponsiveContainer,
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
  LabelList,
} from "recharts"
import { cn } from "@/lib/utils"
import { AuthButton } from "./auth-button"
import { createBrowserSupabaseClient, isSupabaseEnabled } from "@/lib/supabase/client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { Share2, Download, Upload, RefreshCw } from "lucide-react"
import { DialogClose } from "@/components/ui/dialog"

type UUID = string

type Category = {
  id: UUID
  name: string
  color: string
  emoji: string
  budget?: number
}

type Transaction = {
  id: UUID
  categoryId: UUID
  amount: number
  note?: string
  date: string // ISO
}

type RangeKey = "7d" | "15d" | "30d" | "mes"
type CurrencyCode = "EUR" | "USD" | "COP"

const CATEGORIES_KEY = "budget:categories:v1"
const TRANSACTIONS_KEY = "budget:transactions:v1"
const SEEDED_KEY = "budget:seeded:v1"
const CURRENCY_KEY = "budget:currency:v1"

const currencyConfig: Record<CurrencyCode, { locale: string; label: string; symbol: string }> = {
  EUR: { locale: "es-ES", label: "Euro (EUR)", symbol: "€" },
  USD: { locale: "en-US", label: "Dólar (USD)", symbol: "$" },
  COP: { locale: "es-CO", label: "Peso colombiano (COP)", symbol: "$" },
}

function uid(): UUID {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}
function getMonthEnd(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function getRangeDates(range: RangeKey, monthRef: Date): { start: Date; end: Date } {
  const today = new Date()
  if (range === "mes") {
    const start = getMonthStart(monthRef)
    const end = getMonthEnd(monthRef)
    return { start, end }
  }
  const map: Record<Exclude<RangeKey, "mes">, number> = { "7d": 7, "15d": 15, "30d": 30 }
  const days = map[range]
  const end = endOfDay(today)
  const start = startOfDay(new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000))
  return { start, end }
}

function formatDay(dateISO: string) {
  const d = new Date(dateISO)
  return d.toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" })
}

function formatMonthLabel(d: Date) {
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" })
}

const defaultCategoryPalette = [
  { color: "#7c3aed", emoji: "🛒" },
  { color: "#ef4444", emoji: "🍔" },
  { color: "#10b981", emoji: "🚗" },
  { color: "#f59e0b", emoji: "🏠" },
  { color: "#06b6d4", emoji: "🎉" },
  { color: "#8b5cf6", emoji: "💡" },
  { color: "#f97316", emoji: "🧾" },
  { color: "#14b8a6", emoji: "💊" },
]

// Currency context
type CurrencyContextValue = {
  code: CurrencyCode
  locale: string
  setCode: (c: CurrencyCode) => void
  format: (n: number) => string
}
const CurrencyContext = createContext<CurrencyContextValue>({
  code: "EUR",
  locale: currencyConfig.EUR.locale,
  setCode: () => {},
  format: (n: number) =>
    new Intl.NumberFormat(currencyConfig.EUR.locale, { style: "currency", currency: "EUR" }).format(n),
})
function useCurrency() {
  return useContext(CurrencyContext)
}

function generateSampleData() {
  try {
    if (typeof window === "undefined") return
    const categories: Category[] = [
      { id: uid(), name: "Supermercado", color: "#7c3aed", emoji: "🛒", budget: 300 },
      { id: uid(), name: "Comida", color: "#ef4444", emoji: "🍔", budget: 180 },
      { id: uid(), name: "Transporte", color: "#10b981", emoji: "🚗", budget: 120 },
      { id: uid(), name: "Hogar", color: "#f59e0b", emoji: "🏠", budget: 250 },
      { id: uid(), name: "Ocio", color: "#06b6d4", emoji: "🎉", budget: 150 },
    ]
    const today = new Date()
    const daysBack = (n: number) => new Date(today.getTime() - n * 24 * 60 * 60 * 1000)
    const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min))
    const txns: Transaction[] = []
    for (let i = 0; i < 40; i++) {
      const d = daysBack(rand(0, 60))
      const c = categories[rand(0, categories.length - 1)]
      txns.push({
        id: uid(),
        categoryId: c.id,
        amount: Number((Math.random() * 60 + 5).toFixed(2)),
        note: ["Compra", "Snack", "Uber", "Factura", "Cine", "Cafetería"][rand(0, 5)],
        date: d.toISOString(),
      })
    }
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(txns))
    localStorage.setItem(SEEDED_KEY, "1")
    return { categories, transactions: txns }
  } catch {
    return null
  }
}

// Custom tooltips
function CustomPieTooltip(props: Partial<TooltipProps<number, string>> & { total: number }) {
  const { format } = useCurrency()
  const { active, payload, total } = props as any
  if (!active || !payload || !payload.length) return null
  const p = payload[0]
  const name = p.name ?? p.payload?.name
  const value = Number(p.value ?? 0)
  const pct = total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div className="rounded-md border bg-popover p-2 text-xs text-popover-foreground shadow-md">
      <div className="font-medium">{name}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-semibold">{format(value)}</span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
    </div>
  )
}

function TransactionActions(props: {
  tx: Transaction
  categories: Category[]
  onEdit: (id: UUID, patch: Partial<Omit<Transaction, "id">>) => void
  onDelete: (id: UUID) => void
}) {
  const { tx, categories, onEdit, onDelete } = props
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-600" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditTransactionDialog
        open={open}
        onOpenChange={setOpen}
        tx={tx}
        categories={categories}
        onSave={(patch) => onEdit(tx.id, patch)}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar gasto</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                onDelete(tx.id)
                setConfirmOpen(false)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function EditTransactionDialog(props: {
  open: boolean
  onOpenChange: (o: boolean) => void
  tx: Transaction
  categories: Category[]
  onSave: (patch: Partial<Omit<Transaction, "id">>) => void
}) {
  const { open, onOpenChange, tx, categories, onSave } = props
  const [amount, setAmount] = useState<string>(String(tx.amount))
  const [categoryId, setCategoryId] = useState<string>(tx.categoryId)
  const [date, setDate] = useState<Date | undefined>(new Date(tx.date))
  const [note, setNote] = useState<string>(tx.note ?? "")

  useEffect(() => {
    setAmount(String(tx.amount))
    setCategoryId(tx.categoryId)
    setDate(new Date(tx.date))
    setNote(tx.note ?? "")
  }, [tx])

  const submit = () => {
    const amt = Number(amount)
    if (!amt || amt <= 0 || !categoryId || !date) return
    onSave({ amount: Number(amt.toFixed(2)), categoryId, note: note.trim() || undefined, date: date.toISOString() })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar gasto</DialogTitle>
          <DialogDescription>Modifica los datos del gasto.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="edit-amount">Monto</Label>
            <Input
              id="edit-amount"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(",", "."))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Categoría</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="mr-2" aria-hidden="true">
                      {c.emoji}
                    </span>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start gap-2 bg-transparent">
                  <CalendarIcon className="h-4 w-4" />
                  {date ? date.toLocaleDateString("es-ES") : "Selecciona fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-2">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-note">Nota (opcional)</Label>
            <Input id="edit-note" placeholder="Descripción" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!Number(amount) || !categoryId}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CustomPercentTooltip({ active, payload }: Partial<TooltipProps<number, string>>) {
  if (!active || !payload || !payload.length) return null
  const p = payload[0]
  const name = p.payload?.name as string
  const pct = Math.round(Number(p.value ?? 0))
  return (
    <div className="rounded-md border bg-popover p-2 text-xs text-popover-foreground shadow-md">
      <div className="font-medium">{name}</div>
      <div className="mt-1">
        <span className="font-semibold">{pct}%</span>
      </div>
    </div>
  )
}

function CustomSpentBudgetTooltip({ active, payload, label }: Partial<TooltipProps<number, string>>) {
  const { format } = useCurrency()
  if (!active || !payload || !payload.length) return null
  const gastado = Number(payload.find((p) => p.name === "Gastado")?.value ?? 0)
  const restante = Number(payload.find((p) => p.name === "Restante")?.value ?? 0)
  const total = gastado + restante
  const pct = total > 0 ? Math.round((gastado / total) * 100) : 0
  const name = (label as string) ?? (payload[0].payload?.name as string)
  return (
    <div className="rounded-md border bg-popover p-2 text-xs text-popover-foreground shadow-md">
      <div className="font-medium">{name}</div>
      <div className="mt-1 grid grid-cols-2 gap-1">
        <span className="text-muted-foreground">Gastado</span>
        <span className="text-right font-medium">{format(gastado)}</span>
        <span className="text-muted-foreground">Restante</span>
        <span className="text-right font-medium">{format(restante)}</span>
        <span className="text-muted-foreground">Total</span>
        <span className="text-right font-medium">{format(total)}</span>
        <span className="text-muted-foreground">% usado</span>
        <span className="text-right font-medium">{pct}%</span>
      </div>
    </div>
  )
}

export default function BudgetApp() {
  const supabaseEnabled = isSupabaseEnabled()
  const supabase = useMemo(() => (supabaseEnabled ? createBrowserSupabaseClient() : null), [supabaseEnabled])
  const { toast } = useToast()
  const [syncing, setSyncing] = useState(false)

  const [userId, setUserId] = useState<string | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [activeTab, setActiveTab] = useState<"resumen" | "historial">("resumen")
  const [range, setRange] = useState<RangeKey>("7d")
  const [monthRef, setMonthRef] = useState<Date>(getMonthStart(new Date()))

  // Currency state
  const [currency, setCurrency] = useState<CurrencyCode>("EUR")
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_KEY) as CurrencyCode | null
      if (saved && currencyConfig[saved]) setCurrency(saved)
    } catch {}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_KEY, currency)
    } catch {}
  }, [currency])
  const locale = currencyConfig[currency].locale
  const format = useMemo(() => {
    return (n: number) =>
      new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(n)
  }, [currency, locale])

  // Load auth state
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => {
      const newUserId = data.user?.id ?? null
      setUserId(newUserId)
      
      // If user just logged in and we have local data, clear it to prevent ghost data
      if (newUserId) {
        const seeded = localStorage.getItem(SEEDED_KEY)
        if (seeded !== "1") {
          // Clear any auto-generated or old data when user logs in
          localStorage.removeItem(CATEGORIES_KEY)
          localStorage.removeItem(TRANSACTIONS_KEY)
          localStorage.removeItem(SEEDED_KEY)
        }
      }
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUserId = session?.user?.id ?? null
      setUserId(newUserId)
      
      // If user just logged in and we have local data, clear it to prevent ghost data
      if (newUserId) {
        const seeded = localStorage.getItem(SEEDED_KEY)
        if (seeded !== "1") {
          // Clear any auto-generated or old data when user logs in
          localStorage.removeItem(CATEGORIES_KEY)
          localStorage.removeItem(TRANSACTIONS_KEY)
          localStorage.removeItem(SEEDED_KEY)
        }
      }
    })
    return () => data.subscription.unsubscribe()
  }, [supabase])

  // Data load
  useEffect(() => {
    if (userId && supabase) {
      ;(async () => {
        const { data: cats } = await supabase
          .from("categories")
          .select("id,name,color,emoji,budget")
          .eq("user_id", userId)
          .order("name", { ascending: true })
        const { data: txs } = await supabase
          .from("transactions")
          .select("id,category_id,amount,note,date")
          .eq("user_id", userId)
          .order("date", { ascending: false })

        const catsMapped: Category[] =
          cats?.map((c: any) => ({
            id: c.id,
            name: c.name,
            color: c.color,
            emoji: c.emoji,
            budget: c.budget ?? undefined,
          })) ?? []
        const txsMapped: Transaction[] =
          txs?.map((t: any) => ({
            id: t.id,
            categoryId: t.category_id,
            amount: t.amount,
            note: t.note ?? undefined,
            date: t.date,
          })) ?? []
        setCategories(catsMapped)
        setTransactions(txsMapped)
      })()
    } else {
      // Load from local storage only if we have a previous session
      // Check if we have any data that was created by a logged-in user
      try {
        const cs = localStorage.getItem(CATEGORIES_KEY)
        const ts = localStorage.getItem(TRANSACTIONS_KEY)
        const seeded = localStorage.getItem(SEEDED_KEY)
        
        // Only load data if it was explicitly created by the user
        // The SEEDED_KEY indicates that data was intentionally generated
        if (cs && seeded === "1") {
          setCategories(JSON.parse(cs))
        }
        if (ts && seeded === "1") {
          setTransactions(JSON.parse(ts))
        }
      } catch {
        // ignore
      }
    }
  }, [userId, supabase])

  // Persist local only
  useEffect(() => {
    if (userId) return
    try {
      localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))
    } catch {}
  }, [categories, userId])

  useEffect(() => {
    if (userId) return
    try {
      localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions))
    } catch {}
  }, [transactions, userId])

  const { start, end } = useMemo(() => getRangeDates(range, monthRef), [range, monthRef])

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const d = new Date(t.date)
      return d >= start && d <= end
    })
  }, [transactions, start, end])

  const totalsByCategory = useMemo(() => {
    const map = new Map<UUID, number>()
    for (const t of filteredTransactions) {
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount)
    }
    const items = categories
      .map((c) => ({
        category: c,
        total: map.get(c.id) ?? 0,
        count: filteredTransactions.filter((t) => t.categoryId === c.id).length,
      }))
      .filter((i) => i.total > 0)
      .sort((a, b) => b.total - a.total)
    const sum = items.reduce((acc, i) => acc + i.total, 0)
    return { items, sum }
  }, [categories, filteredTransactions])

  const budgetedList = useMemo(() => categories.filter((c) => (c.budget ?? 0) > 0), [categories])

  const monthOptions = useMemo(() => {
    const now = new Date()
    const list: Date[] = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      list.push(d)
    }
    return list
  }, [])

  // Actions: categories
  const addCategory = async (cat: Category) => {
    if (userId && supabase) {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          user_id: userId,
          name: cat.name,
          color: cat.color,
          emoji: cat.emoji,
          budget: cat.budget ?? null,
        })
        .select()
        .single()
      if (error) {
        toast({ title: "No se pudo crear", description: error.message, variant: "destructive" })
        return
      }
      setCategories((prev) => [
        ...prev,
        { id: data.id, name: data.name, color: data.color, emoji: data.emoji, budget: data.budget ?? undefined },
      ])
    } else {
      setCategories((prev) => [...prev, cat])
    }
  }

  const updateCategory = async (id: UUID, patch: Partial<Omit<Category, "id">>) => {
    if (userId && supabase) {
      const { error, data } = await supabase
        .from("categories")
        .update({
          name: patch.name,
          color: patch.color,
          emoji: patch.emoji,
          budget: patch.budget ?? null,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single()
      if (error) {
        toast({ title: "No se pudo actualizar", description: error.message, variant: "destructive" })
        return
      }
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch, budget: data.budget ?? undefined } : c)))
    } else {
      setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)))
    }
  }

  const deleteCategory = async (id: UUID) => {
    if (userId && supabase) {
      const { error: txErr } = await supabase.from("transactions").delete().eq("user_id", userId).eq("category_id", id)
      if (txErr) {
        toast({ title: "No se pudo eliminar transacciones", description: txErr.message, variant: "destructive" })
        return
      }
      const { error } = await supabase.from("categories").delete().eq("user_id", userId).eq("id", id)
      if (error) {
        toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" })
        return
      }
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setTransactions((prev) => prev.filter((t) => t.categoryId !== id))
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== id))
      setTransactions((prev) => prev.filter((t) => t.categoryId !== id))
    }
  }

  // Actions: transactions
  const addTransaction = async (txn: Transaction) => {
    if (userId && supabase) {
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          category_id: txn.categoryId,
          amount: txn.amount,
          note: txn.note ?? null,
          date: txn.date,
        })
        .select()
        .single()
      if (error) {
        toast({ title: "No se pudo guardar", description: error.message, variant: "destructive" })
        return
      }
      setTransactions((prev) => {
        const newTx: Transaction = {
          id: data.id,
          categoryId: data.category_id,
          amount: Number(data.amount),
          note: data.note ?? undefined,
          date: data.date,
        }
        // avoid inserting visually duplicated if exists in state
        if (prev.some((x) => txnKey(x.categoryId, x.amount, x.date, x.note) === txnKey(newTx.categoryId, newTx.amount, newTx.date, newTx.note))) {
          return prev
        }
        return [newTx, ...prev]
      })
    } else {
      setTransactions((prev) => [txn, ...prev])
    }
  }

  const updateTransaction = async (id: UUID, patch: Partial<Omit<Transaction, "id">>) => {
    if (userId && supabase) {
      const { data, error } = await supabase
        .from("transactions")
        .update({
          category_id: patch.categoryId,
          amount: patch.amount,
          note: patch.note ?? null,
          date: patch.date,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single()
      if (error) {
        toast({ title: "No se pudo actualizar", description: error.message, variant: "destructive" })
        return
      }
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                categoryId: data.category_id,
                amount: Number(data.amount),
                note: data.note ?? undefined,
                date: data.date,
              }
            : t,
        ),
      )
    } else {
      setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    }
  }

  const deleteTransaction = async (id: UUID) => {
    if (userId && supabase) {
      const { error } = await supabase.from("transactions").delete().eq("user_id", userId).eq("id", id)
      if (error) {
        toast({ title: "No se pudo eliminar", description: error.message, variant: "destructive" })
        return
      }
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    } else {
      setTransactions((prev) => prev.filter((t) => t.id !== id))
    }
  }

  // Helpers: merging/sync
  function categoryKeyLike(c: Pick<Category, "name" | "color" | "emoji">) {
    return `${c.name.trim().toLowerCase()}|${c.color.toLowerCase()}|${c.emoji}`
  }

  function toFixed2(n: number): string {
    return (Math.round(Number(n) * 100) / 100).toFixed(2)
  }

  function txnKey(categoryId: string, amount: number, dateISO: string, note?: string | null): string {
    // Normalize date to YYYY-MM-DD format to avoid timezone issues
    const datePart = new Date(dateISO).toISOString().split('T')[0]
    const nn = (note ?? "").trim().toLowerCase()
    return `${categoryId}|${toFixed2(Number(amount))}|${datePart}|${nn}`
  }

  async function syncLocalToSupabase() {
    if (!userId || !supabase) return
    try {
      setSyncing(true)
      const t = toast({ title: "Sincronizando...", description: "Subiendo cambios", duration: 200000 })
      // Read raw local saved data
      const localCats: Category[] = JSON.parse(localStorage.getItem(CATEGORIES_KEY) || "[]")
      const localTxs: Transaction[] = JSON.parse(localStorage.getItem(TRANSACTIONS_KEY) || "[]")

      // Fetch server data fresh
      const { data: serverCatsRaw } = await supabase
        .from("categories")
        .select("id,name,color,emoji,budget")
        .eq("user_id", userId)
      const { data: serverTxsRaw } = await supabase
        .from("transactions")
        .select("id,category_id,amount,note,date")
        .eq("user_id", userId)

      const serverCats: Category[] = (serverCatsRaw || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        emoji: c.emoji,
        budget: c.budget ?? undefined,
      }))
      const serverTxs: Transaction[] = (serverTxsRaw || []).map((t: any) => ({
        id: t.id,
        categoryId: t.category_id,
        amount: Number(t.amount),
        note: t.note ?? undefined,
        date: t.date,
      }))

      const serverKeyToId = new Map<string, string>()
      serverCats.forEach((c) => serverKeyToId.set(categoryKeyLike(c), c.id))

      // Insert missing categories
      const catIdMap = new Map<string, string>() // localId -> serverId
      let newCats = 0
      for (const lc of localCats) {
        const key = categoryKeyLike(lc)
        let serverId = serverKeyToId.get(key)
        if (!serverId) {
          const { data, error } = await supabase
            .from("categories")
            .insert({ user_id: userId, name: lc.name, color: lc.color, emoji: lc.emoji, budget: lc.budget ?? null })
            .select()
            .single()
          if (!error && data) {
            serverId = data.id
            serverKeyToId.set(key, serverId)
            newCats += 1
          }
        }
        if (serverId) catIdMap.set(lc.id, serverId)
      }

      // Existing server tx index for duplicate detection
      const serverTxnSet = new Set<string>()
      serverTxs.forEach((tt) => serverTxnSet.add(txnKey(tt.categoryId, Number(tt.amount), tt.date, tt.note)))

      let newTxs = 0
      for (const lt of localTxs) {
        const mappedCat = catIdMap.get(lt.categoryId) || lt.categoryId
        const key = txnKey(mappedCat, lt.amount, lt.date, lt.note)
        
        // Skip if already exists in server
        if (serverTxnSet.has(key)) continue
        
        // Additional check: verify the transaction doesn't already exist with a different ID
        const existingTxn = serverTxs.find(tt => 
          txnKey(tt.categoryId, Number(tt.amount), tt.date, tt.note) === key
        )
        if (existingTxn) continue
        
        const { error } = await supabase.from("transactions").insert({
          user_id: userId,
          category_id: mappedCat,
          amount: lt.amount,
          note: lt.note ?? null,
          date: lt.date,
        })
        if (!error) {
          newTxs += 1
          serverTxnSet.add(key)
        }
      }

      // Refresh local state from server after sync
      const { data: catsAfter } = await supabase
        .from("categories")
        .select("id,name,color,emoji,budget")
        .eq("user_id", userId)
        .order("name", { ascending: true })
      const { data: txsAfter } = await supabase
        .from("transactions")
        .select("id,category_id,amount,note,date")
        .eq("user_id", userId)
        .order("date", { ascending: false })

      setCategories(
        (catsAfter || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          color: c.color,
          emoji: c.emoji,
          budget: c.budget ?? undefined,
        })),
      )
      setTransactions(
        (txsAfter || []).map((t: any) => ({
          id: t.id,
          categoryId: t.category_id,
          amount: Number(t.amount),
          note: t.note ?? undefined,
          date: t.date,
        })),
      )

      t.update({ title: "Sincronización completada", description: newCats || newTxs ? `Nuevas categorías: ${newCats} · Nuevos gastos: ${newTxs}` : "No había cambios para sincronizar" })
    } catch (e: any) {
      toast({ title: "Sincronización fallida", description: String(e?.message ?? e), variant: "destructive" })
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    // When user logs in, try to sync any local data to server once
    if (userId && supabase) {
      syncLocalToSupabase()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, supabase])

  // Auto-sync cada 5 minutos cuando hay sesión
  useEffect(() => {
    if (!userId || !supabase) return
    const id = setInterval(() => {
      if (!syncing) {
        syncLocalToSupabase()
      }
    }, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [userId, supabase, syncing])

  return (
    <CurrencyContext.Provider value={{ code: currency, locale, setCode: setCurrency, format }}>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Presupuestos</h1>
              <p className="text-xs text-muted-foreground">
                {range === "mes" ? `Mes: ${formatMonthLabel(monthRef)}` : `Rango: ${range.toUpperCase()}`}
              </p>
            </div>
            {userId ? (
              <Button variant="outline" className="gap-2 bg-transparent" onClick={syncLocalToSupabase} disabled={syncing}>
                <RefreshCw className="h-4 w-4" />
                {syncing ? "Sincronizando..." : "Sincronizar"}
              </Button>
            ) : null}
            <AuthButton />
            <InstallPWAButton />
          </div>

          <div className="px-4 pb-2">
            <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center gap-2 min-w-max">
                <AddTransactionDialog categories={categories} onAdd={(txn) => addTransaction(txn)} triggerSize="sm" />
                <AddCategoryDialog onAdd={(cat) => addCategory(cat)} triggerSize="sm" />
                <ManageBudgetsDialog
                  categories={categories}
                  onSave={(updates) =>
                    setCategories((prev) =>
                      prev.map((c) =>
                        Object.prototype.hasOwnProperty.call(updates, c.id) ? { ...c, budget: updates[c.id] } : c,
                      ),
                    )
                  }
                  triggerSize="sm"
                />
                <CurrencySelector size="sm" />
                <DataIOButtons
                  getExport={() => ({ categories, transactions })}
                  onImportMerge={async (payload) => {
                    // Merge categories
                    const incomingCats: Category[] = Array.isArray(payload.categories) ? payload.categories : []
                    const incomingTxs: Transaction[] = Array.isArray(payload.transactions) ? payload.transactions : []

                    // Build current maps
                    const currentKeyToId = new Map<string, string>()
                    categories.forEach((c) => currentKeyToId.set(categoryKeyLike(c), c.id))

                    const localIdToTargetId = new Map<string, string>()

                    // Insert or map categories
                    for (const c of incomingCats) {
                      const key = categoryKeyLike(c)
                      const existingId = currentKeyToId.get(key)
                      if (existingId) {
                        localIdToTargetId.set(c.id, existingId)
                      } else if (userId && supabase) {
                        const { data, error } = await supabase
                          .from("categories")
                          .insert({ user_id: userId, name: c.name, color: c.color, emoji: c.emoji, budget: c.budget ?? null })
                          .select()
                          .single()
                        if (!error && data) {
                          currentKeyToId.set(key, data.id)
                          localIdToTargetId.set(c.id, data.id)
                          setCategories((prev) => [...prev, { id: data.id, name: c.name, color: c.color, emoji: c.emoji, budget: c.budget }])
                        }
                      } else {
                        // local only
                        const newCat: Category = { ...c, id: uid() }
                        setCategories((prev) => [...prev, newCat])
                        currentKeyToId.set(key, newCat.id)
                        localIdToTargetId.set(c.id, newCat.id)
                      }
                    }

                    // Insert transactions if not duplicates
                    const existsTxn = (t: Transaction, list: Transaction[]) =>
                      list.some((x) => txnKey(x.categoryId, x.amount, x.date, x.note) === txnKey(t.categoryId, t.amount, t.date, t.note))

                    let inserted = 0
                    for (const t of incomingTxs) {
                      const targetCat = localIdToTargetId.get(t.categoryId) ?? t.categoryId
                      const candidate: Transaction = { ...t, id: uid(), categoryId: targetCat }
                      
                      if (userId && supabase) {
                        // Check against current state and server state
                        const candidateKey = txnKey(candidate.categoryId, candidate.amount, candidate.date, candidate.note)
                        
                        // Check if it already exists in current transactions
                        const existsInCurrent = transactions.some(existing => 
                          txnKey(existing.categoryId, existing.amount, existing.date, existing.note) === candidateKey
                        )
                        
                        if (existsInCurrent) continue
                        
                        // Additional server-side duplicate check
                        const { data: existingServerTxn } = await supabase
                          .from("transactions")
                          .select("id")
                          .eq("user_id", userId)
                          .eq("category_id", candidate.categoryId)
                          .eq("amount", candidate.amount)
                          .eq("date", candidate.date)
                          .eq("note", candidate.note ?? null)
                          .limit(1)
                        
                        if (existingServerTxn && existingServerTxn.length > 0) continue
                        
                        const { error } = await supabase.from("transactions").insert({
                          user_id: userId,
                          category_id: candidate.categoryId,
                          amount: candidate.amount,
                          note: candidate.note ?? null,
                          date: candidate.date,
                        })
                        if (!error) inserted += 1
                      } else {
                        if (existsTxn(candidate, transactions)) continue
                        setTransactions((prev) => [candidate, ...prev])
                        inserted += 1
                      }
                    }

                    if (userId && supabase) {
                      // Refresh from server to reflect inserts
                      const { data: txsAfter } = await supabase
                        .from("transactions")
                        .select("id,category_id,amount,note,date")
                        .eq("user_id", userId)
                        .order("date", { ascending: false })
                      setTransactions(
                        (txsAfter || []).map((t: any) => ({
                          id: t.id,
                          categoryId: t.category_id,
                          amount: Number(t.amount),
                          note: t.note ?? undefined,
                          date: t.date,
                        })),
                      )
                    }

                    toast({ title: "Importación completada", description: `Nuevos gastos: ${inserted}` })
                  }}
                />
                <AdvancedMenu
                  hasData={categories.length > 0 || transactions.length > 0}
                  onGenerateSample={() => {
                    const sampleData = generateSampleData()
                    if (sampleData) {
                      setCategories(sampleData.categories)
                      setTransactions(sampleData.transactions)
                      toast({ title: "Datos de ejemplo generados", description: "Se han creado categorías y transacciones de ejemplo" })
                    }
                  }}
                  onWipe={async () => {
                    const doLocalClear = () => {
                      setCategories([])
                      setTransactions([])
                      try {
                        localStorage.removeItem(CATEGORIES_KEY)
                        localStorage.removeItem(TRANSACTIONS_KEY)
                        localStorage.removeItem(SEEDED_KEY)
                      } catch {}
                    }
                    try {
                      if (userId && supabase) {
                        const { error: txErr } = await supabase
                          .from("transactions")
                          .delete()
                          .eq("user_id", userId)
                        if (txErr) throw txErr
                        const { error: catErr } = await supabase
                          .from("categories")
                          .delete()
                          .eq("user_id", userId)
                        if (catErr) throw catErr
                      }
                      doLocalClear()
                      toast({ title: "Eliminado", description: "Todos los registros han sido eliminados" })
                    } catch (e: any) {
                      toast({
                        title: "Error al eliminar",
                        description: String(e?.message ?? e),
                        variant: "destructive",
                      })
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="px-4 pb-3">
            <RangeSelector
              range={range}
              onChangeRange={setRange}
              monthRef={monthRef}
              onChangeMonth={setMonthRef}
              monthOptions={monthOptions}
            />
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1">
          <div className="px-4 pt-3">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="resumen" className="gap-1">
                <PieChart className="h-4 w-4" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="historial" className="gap-1">
                <List className="h-4 w-4" />
                Historial
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="resumen" className="px-4 pb-28">
            <SummarySection
              categories={categories}
              totals={totalsByCategory.items}
              grandTotal={totalsByCategory.sum}
              budgeted={budgetedList}
            />

            <ChartsSlider>
              <PieSpentChart categories={categories} totals={totalsByCategory.items} />
              <BudgetDistributionPie categories={categories} />
              <PercentUsedBarChart categories={categories} totals={totalsByCategory.items} />
              <SpentVsBudgetBarChart categories={categories} totals={totalsByCategory.items} />
            </ChartsSlider>

            <CategoryBreakdownList
              items={totalsByCategory.items}
              onEdit={updateCategory}
              onDelete={deleteCategory}
              emptyHint={
                filteredTransactions.length === 0
                  ? "Sin gastos en el rango seleccionado."
                  : "No hay categorías con gastos."
              }
            />
          </TabsContent>

          <TabsContent value="historial" className="px-4 pb-28">
            <HistorySection
              transactions={filteredTransactions}
              categories={categories}
              onEditTransaction={updateTransaction}
              onDeleteTransaction={deleteTransaction}
            />
          </TabsContent>
        </Tabs>

        <FloatingAddButtons
          onAddCategory={() => document.getElementById("add-category-trigger")?.click()}
          onAddTransaction={() => document.getElementById("add-transaction-trigger")?.click()}
        />
      </div>
    </CurrencyContext.Provider>
  )
}

function CurrencySelector({ size = "default" }: { size?: "default" | "sm" | "lg" }) {
  const { code, setCode } = useCurrency()
  return (
    <Select value={code} onValueChange={(val) => setCode(val as CurrencyCode)}>
      <SelectTrigger className="w-[170px]" size={size as any}>
        <SelectValue placeholder="Moneda" />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(currencyConfig) as CurrencyCode[]).map((c) => (
          <SelectItem key={c} value={c}>
            {currencyConfig[c].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function RangeSelector(props: {
  range: RangeKey
  onChangeRange: (r: RangeKey) => void
  monthRef: Date
  onChangeMonth: (d: Date) => void
  monthOptions: Date[]
}) {
  const { range, onChangeRange, monthRef, onChangeMonth, monthOptions } = props
  return (
    <div className="flex items-center gap-2">
      <div className="grid grid-cols-4 gap-2 flex-1">
        {(["7d", "15d", "30d", "mes"] as RangeKey[]).map((key) => (
          <Button
            key={key}
            variant={range === key ? "default" : "outline"}
            className="py-5"
            onClick={() => onChangeRange(key)}
          >
            {key === "mes" ? "Mes" : key.toUpperCase()}
          </Button>
        ))}
      </div>
      {range === "mes" ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 bg-transparent">
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{formatMonthLabel(monthRef)}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-3">
            <Label className="mb-2 block">Selecciona un mes</Label>
            <Select
              value={`${monthRef.getFullYear()}-${monthRef.getMonth()}`}
              onValueChange={(val) => {
                const [y, m] = val.split("-").map((x) => Number.parseInt(x, 10))
                props.onChangeMonth(new Date(y, m, 1))
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((d) => (
                  <SelectItem key={`${d.getFullYear()}-${d.getMonth()}`} value={`${d.getFullYear()}-${d.getMonth()}`}>
                    {formatMonthLabel(d)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3 rounded-md border p-2">
              <Calendar
                mode="single"
                selected={monthRef}
                onSelect={(d) => d && props.onChangeMonth(getMonthStart(d))}
                initialFocus
              />
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  )
}

function SummarySection(props: {
  categories: Category[]
  totals: { category: Category; total: number; count: number }[]
  grandTotal: number
  budgeted: Category[]
}) {
  const { totals, grandTotal, budgeted } = props
  const { format } = useCurrency()

  // Totales de presupuesto
  const totalBudget = useMemo(() => budgeted.reduce((acc, c) => acc + (c.budget ?? 0), 0), [budgeted])
  const spentInBudgeted = useMemo(
    () =>
      totals.reduce((acc, t) => {
        if ((t.category.budget ?? 0) > 0) return acc + t.total
        return acc
      }, 0),
    [totals],
  )
  const remaining = totalBudget - spentInBudgeted

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Gasto total</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold">{format(grandTotal)}</div>
            <p className="text-xs text-muted-foreground">Suma de todas las categorías</p>
            <p className="mt-1 text-xs">
              <span className="text-muted-foreground">Presupuesto:</span>{" "}
              <span className="font-medium">{format(totalBudget)}</span>{" "}
              <span className="text-muted-foreground">· Restante:</span>{" "}
              <span className={remaining < 0 ? "font-medium text-red-600" : "font-medium text-emerald-600"}>
                {format(Math.abs(remaining))}
                {remaining < 0 ? " excedido" : ""}
              </span>
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {totals.length} categorías con gasto
          </Badge>
        </CardContent>
      </Card>
    </div>
  )
}

function PercentUsedBarChart(props: {
  categories: Category[]
  totals: { category: Category; total: number; count: number }[]
}) {
  const { categories, totals } = props
  const data = useMemo(() => {
    const spentMap = new Map<UUID, number>()
    totals.forEach((t) => spentMap.set(t.category.id, t.total))
    return categories
      .filter((c) => (c.budget ?? 0) > 0)
      .map((c) => {
        const spent = spentMap.get(c.id) ?? 0
        const pct = c.budget && c.budget > 0 ? Math.round((spent / c.budget) * 100) : 0
        return {
          name: c.name,
          pct: Math.min(200, pct),
          color: c.color,
        }
      })
  }, [categories, totals])

  if (data.length === 0) return null

  return (
    <div className="w-full h-64">
      <ChartContainer
        config={Object.fromEntries(data.map((d) => [d.name, { label: d.name, color: d.color }]))}
        className="h-full w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RBarChart data={data} margin={{ left: -20 }}>
            <XAxis dataKey="name" hide />
            <YAxis tickFormatter={(v) => `${v}%`} domain={[0, "dataMax"]} />
            <Legend formatter={() => "Porcentaje de presupuesto usado"} />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
              <LabelList dataKey="pct" position="top" formatter={(v: number) => `${v}%`} />
            </Bar>
            <ChartTooltip content={<CustomPercentTooltip />} />
          </RBarChart>
        </ResponsiveContainer>
      </ChartContainer>
      <p className="mt-2 text-xs text-muted-foreground">
        Basado en límite mensual por categoría. No se prorratea en rangos distintos a Mes.
      </p>
    </div>
  )
}

function SpentVsBudgetBarChart(props: {
  categories: Category[]
  totals: { category: Category; total: number; count: number }[]
}) {
  const { categories, totals } = props
  const { format } = useCurrency()
  const spentMap = useMemo(() => {
    const m = new Map<UUID, number>()
    totals.forEach((t) => m.set(t.category.id, t.total))
    return m
  }, [totals])
  const data = useMemo(() => {
    return categories
      .filter((c) => (c.budget ?? 0) > 0)
      .map((c) => {
        const spent = spentMap.get(c.id) ?? 0
        const remaining = Math.max(0, (c.budget ?? 0) - spent)
        return {
          name: c.name,
          Gastado: Number(spent.toFixed(2)),
          Restante: Number(remaining.toFixed(2)),
          color: c.color,
        }
      })
  }, [categories, spentMap])

  if (data.length === 0) return null

  return (
    <div className="w-full h-64">
      <ChartContainer
        config={{
          Gastado: { label: "Gastado", color: "#ef4444" },
          Restante: { label: "Restante", color: "#10b981" },
        }}
        className="h-full w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RBarChart data={data} margin={{ left: 0 }}>
            <XAxis dataKey="name" hide />
            <YAxis tickFormatter={(v) => format(typeof v === "number" ? v : Number(v))} width={56} />
            <Legend />
            <Bar dataKey="Gastado" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Restante" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
            <ChartTooltip content={<CustomSpentBudgetTooltip />} />
          </RBarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}

function BudgetDistributionPie(props: { categories: Category[] }) {
  const { categories } = props
  const { format } = useCurrency()
  const budgeted = useMemo(() => categories.filter((c) => (c.budget ?? 0) > 0), [categories])
  const totalBudget = useMemo(() => budgeted.reduce((acc, c) => acc + (c.budget ?? 0), 0), [budgeted])
  const data = useMemo(
    () =>
      budgeted.map((c) => ({
        name: c.name,
        value: Number((c.budget ?? 0).toFixed(2)),
        color: c.color,
      })),
    [budgeted],
  )

  if (data.length === 0) return null

  return (
    <div className="w-full h-64">
      <ChartContainer
        config={Object.fromEntries(data.map((d) => [d.name, { label: d.name, color: d.color }]))}
        className="h-full w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RPieChart>
            <ChartTooltip content={<CustomPieTooltip total={totalBudget} />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={80}
              paddingAngle={2}
              labelLine={false}
              label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-budget-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </RPieChart>
        </ResponsiveContainer>
      </ChartContainer>
      <div className="mt-3 text-center text-xs text-muted-foreground">
        Presupuesto total: <span className="font-medium">{format(totalBudget)}</span>
      </div>
    </div>
  )
}

function CategoryBreakdownList(props: {
  items: { category: Category; total: number; count: number }[]
  emptyHint?: string
  onEdit: (id: UUID, patch: Partial<Omit<Category, "id">>) => void
  onDelete: (id: UUID) => void
}) {
  const { format } = useCurrency()
  const { items, emptyHint, onEdit, onDelete } = props
  if (items.length === 0) {
    return <div className="mt-4 text-center text-sm text-muted-foreground">{emptyHint ?? "Sin datos."}</div>
  }
  return (
    <div className="mt-4 rounded-lg border">
      <div className="flex items-center justify-between p-3">
        <h3 className="text-sm font-medium">Gastos por categoría</h3>
        <span className="text-xs text-muted-foreground">{items.length} ítems</span>
      </div>
      <Separator />
      <ScrollArea className="max-h-[520px]">
        <ul className="divide-y">
          {items.map((it) => {
            const budget = it.category.budget ?? 0
            const spent = it.total
            const remaining = budget - spent
            const hasBudget = budget > 0
            const pct = hasBudget ? Math.round((spent / budget) * 100) : 0

            return (
              <li key={it.category.id} className="flex items-center gap-3 p-3">
                <span
                  className="grid h-9 w-9 place-items-center rounded-full text-base"
                  style={{ backgroundColor: `${it.category.color}22`, color: it.category.color }}
                  aria-hidden="true"
                >
                  {it.category.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{it.category.name}</span>
                    <div className="flex items-center gap-2">
                      {hasBudget ? (
                        <span
                          className={cn(
                            "text-xs font-medium",
                            pct >= 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : "text-emerald-600",
                          )}
                          aria-label="porcentaje usado"
                        >
                          {pct}%
                        </span>
                      ) : null}
                      <span className="text-sm font-semibold">{format(it.total)}</span>
                      <CategoryActionsMenu category={it.category} onEdit={onEdit} onDelete={onDelete} />
                    </div>
                  </div>

                  <div className="mt-1">
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${hasBudget ? Math.min(100, Math.max(0, pct)) : 100}%`,
                          backgroundColor: it.category.color,
                          opacity: 0.6,
                        }}
                        role={hasBudget ? "progressbar" : undefined}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={hasBudget ? Math.min(100, Math.max(0, pct)) : undefined}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span
                        className={remaining < 0 ? "text-xs font-medium text-red-600" : "text-xs text-muted-foreground"}
                      >
                        {hasBudget
                          ? `${remaining < 0 ? "Excedido" : "Restante"} ${format(Math.abs(remaining))}`
                          : "Sin límite"}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {hasBudget ? `Límite: ${format(budget)}` : `${it.count} mov.`}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </ScrollArea>
    </div>
  )
}

function CategoryActionsMenu(props: {
  category: Category
  onEdit: (id: UUID, patch: Partial<Omit<Category, "id">>) => void
  onDelete: (id: UUID) => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem className="text-red-600" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCategoryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        category={props.category}
        onSave={(patch) => props.onEdit(props.category.id, patch)}
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar categoría</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la categoría y todas sus transacciones asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                props.onDelete(props.category.id)
                setConfirmOpen(false)
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function HistorySection(props: {
  transactions: Transaction[]
  categories: Category[]
  onEditTransaction: (id: UUID, patch: Partial<Omit<Transaction, "id">>) => void
  onDeleteTransaction: (id: UUID) => void
}) {
  const { format } = useCurrency()
  const { transactions, categories, onEditTransaction, onDeleteTransaction } = props
  const byDay = useMemo(() => {
    const buckets = new Map<string, Transaction[]>()
    const sorted = [...transactions].sort((a, b) => +new Date(b.date) - +new Date(a.date))
    for (const t of sorted) {
      const key = new Date(t.date).toDateString()
      buckets.set(key, [...(buckets.get(key) ?? []), t])
    }
    return Array.from(buckets.entries()).map(([key, list]) => ({ dateLabel: key, list }))
  }, [transactions])

  const categoryMap = useMemo(() => {
    const m = new Map<UUID, Category>()
    for (const c of categories) m.set(c.id, c)
    return m
  }, [categories])

  if (transactions.length === 0) {
    return <p className="mt-4 text-center text-sm text-muted-foreground">No hay transacciones en este rango.</p>
  }

  return (
    <div className="space-y-4">
      {byDay.map((grp) => (
        <Card key={grp.dateLabel}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm">
              {new Date(grp.dateLabel).toLocaleDateString("es-ES", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-0">
            <ul className="divide-y">
              {grp.list.map((t) => {
                const cat = categoryMap.get(t.categoryId)
                return (
                  <li key={t.id} className="flex items-center gap-3 py-3">
                    <span
                      className="grid h-9 w-9 place-items-center rounded-full text-base shrink-0"
                      style={{ backgroundColor: `${cat?.color ?? "#000"}22`, color: cat?.color ?? "#000" }}
                      aria-hidden="true"
                    >
                      {cat?.emoji ?? "🏷️"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="truncate">
                          <div className="text-sm font-medium truncate">{t.note ?? "Gasto"}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {cat?.name ?? "Sin categoría"} · {formatDay(t.date)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold whitespace-nowrap">{format(t.amount)}</span>
                          <TransactionActions
                            tx={t}
                            categories={categories}
                            onEdit={onEditTransaction}
                            onDelete={onDeleteTransaction}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function FloatingAddButtons(props: { onAddCategory: () => void; onAddTransaction: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 flex justify-center">
      <div className="pointer-events-auto flex gap-2 rounded-full border bg-white p-2 shadow-lg">
        <Button onClick={props.onAddTransaction} className="gap-2">
          <Plus className="h-4 w-4" />
          Agregar gasto
        </Button>
        <Button onClick={props.onAddCategory} variant="outline" className="gap-2 bg-transparent">
          <Plus className="h-4 w-4" />
          Categoría
        </Button>
      </div>
    </div>
  )
}

function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [installable, setInstallable] = useState(false)
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setInstallable(true)
    }
    window.addEventListener("beforeinstallprompt", handler as any)
    return () => window.removeEventListener("beforeinstallprompt", handler as any)
  }, [])

  if (!installable) return null

  return (
    <Button
      variant="outline"
      className="bg-transparent"
      onClick={async () => {
        try {
          await deferredPrompt.prompt()
          await deferredPrompt.userChoice
        } finally {
          setDeferredPrompt(null)
          setInstallable(false)
        }
      }}
    >
      Instalar app
    </Button>
  )
}

function DataIOButtons(props: {
  getExport: () => { categories: Category[]; transactions: Transaction[] }
  onImportMerge: (payload: { categories: Category[]; transactions: Transaction[] }) => void
}) {
  const doExport = () => {
    const data = props.getExport()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `presupuestos-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const doImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const json = JSON.parse(String(reader.result))
          props.onImportMerge(json)
        } catch {}
      }
      reader.readAsText(file)
    }
    input.click()
  }
  const doShare = async () => {
    try {
      const data = props.getExport()
      const blob = new Blob([JSON.stringify(data)], { type: "application/json" })
      const files = [new File([blob], "presupuestos.json", { type: "application/json" })]
      if ((navigator as any).share && (navigator as any).canShare?.({ files })) {
        await (navigator as any).share({ files, title: "Presupuestos", text: "Backup de datos" })
      } else {
        doExport()
      }
    } catch {
      doExport()
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="gap-2 bg-transparent" onClick={doShare}>
        <Share2 className="h-4 w-4" />
        Compartir
      </Button>
      <Button variant="outline" className="gap-2 bg-transparent" onClick={doExport}>
        <Download className="h-4 w-4" />
        Exportar
      </Button>
      <Button variant="outline" className="gap-2 bg-transparent" onClick={doImport}>
        <Upload className="h-4 w-4" />
        Importar
      </Button>
    </div>
  )
}

function AdvancedMenu(props: { 
  onWipe: () => void
  onGenerateSample?: () => void
  hasData: boolean
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sampleConfirmOpen, setSampleConfirmOpen] = useState(false)
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2 bg-transparent">
            Más
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!props.hasData && props.onGenerateSample && (
            <DropdownMenuItem onClick={() => setSampleConfirmOpen(true)}>
              Generar datos de ejemplo
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setConfirmOpen(true)} className="text-red-600">
            Vaciar todos los datos
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar TODOS los registros</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción elimina todas las categorías y transacciones de este dispositivo
              {" "}
              {"y también de tu cuenta si estás autenticado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                props.onWipe()
                setConfirmOpen(false)
              }}
            >
              Confirmar eliminar todo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sampleConfirmOpen} onOpenChange={setSampleConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generar datos de ejemplo</AlertDialogTitle>
            <AlertDialogDescription>
              Se crearán categorías y transacciones de ejemplo para que puedas probar la aplicación.
              Esta acción reemplazará cualquier dato existente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                props.onGenerateSample?.()
                setSampleConfirmOpen(false)
              }}
            >
              Generar datos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function AddCategoryDialog(props: { onAdd: (category: Category) => void; triggerSize?: "default" | "sm" | "lg" }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("🧾")
  const [color, setColor] = useState("#7c3aed")
  const [budgetStr, setBudgetStr] = useState("")

  const reset = () => {
    setName("")
    setEmoji("🧾")
    setColor("#7c3aed")
    setBudgetStr("")
  }

  const submit = () => {
    if (!name.trim()) return
    const cleaned = budgetStr.replace(",", ".").trim()
    const budgetNum = cleaned === "" ? undefined : Number(cleaned)
    props.onAdd({
      id: uid(),
      name: name.trim(),
      emoji,
      color,
      budget: !Number.isNaN(budgetNum) && budgetNum! >= 0 ? Number(budgetNum.toFixed(2)) : undefined,
    })
    setOpen(false)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          id="add-category-trigger"
          variant="outline"
          size={props.triggerSize ?? "default"}
          className="gap-2 bg-transparent"
        >
          <Plus className="h-4 w-4" />
          <span> Categoría</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva categoría</DialogTitle>
          <DialogDescription>Crea una categoría para tus gastos.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="cat-name">Nombre</Label>
            <Input
              id="cat-name"
              placeholder="Ej. Supermercado"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cat-emoji">Emoji</Label>
              <Input
                id="cat-emoji"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
                placeholder="🛒"
                maxLength={2}
              />
              <div className="flex flex-wrap gap-1">
                {["🛒", "🍔", "🚗", "🏠", "🎉", "💡", "🧾", "💊", "👕", "🎮", "📦", "☕"].map((em) => (
                  <button
                    key={em}
                    type="button"
                    className={cn("rounded-md border px-2 py-1 text-base", emoji === em && "ring-2 ring-primary")}
                    onClick={() => setEmoji(em)}
                    aria-label={`Elegir ${em}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-color">Color</Label>
              <Input id="cat-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              <div className="flex flex-wrap gap-1">
                {defaultCategoryPalette.map((p) => (
                  <button
                    key={p.color}
                    type="button"
                    className="h-6 w-6 rounded-full border"
                    style={{ backgroundColor: p.color }}
                    onClick={() => {
                      setColor(p.color)
                      setEmoji(p.emoji)
                    }}
                    aria-label={`Elegir color ${p.color}`}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cat-budget">Límite mensual (opcional)</Label>
            <Input
              id="cat-budget"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="0,00"
              value={budgetStr}
              onChange={(e) => setBudgetStr(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Deja vacío para no establecer límite.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditCategoryDialog(props: {
  open: boolean
  onOpenChange: (o: boolean) => void
  category: Category
  onSave: (patch: Partial<Omit<Category, "id">>) => void
}) {
  const { open, onOpenChange, category, onSave } = props
  const [name, setName] = useState(category.name)
  const [emoji, setEmoji] = useState(category.emoji)
  const [color, setColor] = useState(category.color)
  const [budgetStr, setBudgetStr] = useState(category.budget != null ? String(category.budget).replace(".", ",") : "")

  useEffect(() => {
    setName(category.name)
    setEmoji(category.emoji)
    setColor(category.color)
    setBudgetStr(category.budget != null ? String(category.budget).replace(".", ",") : "")
  }, [category])

  const submit = () => {
    if (!name.trim()) return
    const cleaned = budgetStr.replace(",", ".").trim()
    const budgetNum = cleaned === "" ? undefined : Number(cleaned)
    onSave({
      name: name.trim(),
      emoji,
      color,
      budget:
        !Number.isNaN(budgetNum) && (budgetNum as number) >= 0 ? Number((budgetNum as number).toFixed(2)) : undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar categoría</DialogTitle>
          <DialogDescription>Actualiza los datos de la categoría.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="edit-name">Nombre</Label>
            <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-emoji">Emoji</Label>
              <Input
                id="edit-emoji"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
                placeholder="🛒"
                maxLength={2}
              />
              <div className="flex flex-wrap gap-1">
                {["🛒", "🍔", "🚗", "🏠", "🎉", "💡", "🧾", "💊", "👕", "🎮", "📦", "☕"].map((em) => (
                  <button
                    key={em}
                    type="button"
                    className={cn("rounded-md border px-2 py-1 text-base", emoji === em && "ring-2 ring-primary")}
                    onClick={() => setEmoji(em)}
                    aria-label={`Elegir ${em}`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-color">Color</Label>
              <Input id="edit-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-budget">Límite mensual (opcional)</Label>
            <Input
              id="edit-budget"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="0,00"
              value={budgetStr}
              onChange={(e) => setBudgetStr(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddTransactionDialog(props: {
  categories: Category[]
  onAdd: (txn: Transaction) => void
  triggerSize?: "default" | "sm" | "lg"
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState<string>("")
  const [categoryId, setCategoryId] = useState<string>("")
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [note, setNote] = useState("")

  useEffect(() => {
    if (props.categories.length && !categoryId) {
      setCategoryId(props.categories[0].id)
    }
  }, [props.categories, categoryId])

  const reset = () => {
    setAmount("")
    setNote("")
    setDate(new Date())
    if (props.categories.length) setCategoryId(props.categories[0].id)
  }

  const submit = () => {
    const amt = Number(amount)
    if (!amt || amt <= 0 || !categoryId || !date) return
    props.onAdd({
      id: uid(),
      amount: Number(amt.toFixed(2)),
      categoryId,
      note: note.trim() || undefined,
      date: date.toISOString(),
    })
    setOpen(false)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id="add-transaction-trigger" size={props.triggerSize ?? "default"} className="gap-2">
          <Plus className="h-4 w-4" />
          <span> Gasto</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar gasto</DialogTitle>
          <DialogDescription>Registra un nuevo gasto en una categoría.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="txn-amount">Monto</Label>
            <Input
              id="txn-amount"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              placeholder="0,00"
              value={amount}
              onChange={(e) => {
                const v = e.target.value.replace(",", ".")
                setAmount(v)
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Categoría</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {props.categories.length ? (
                  props.categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="mr-2" aria-hidden="true">
                        {c.emoji}
                      </span>
                      {c.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground">Primero crea una categoría.</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Fecha</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start gap-2 bg-transparent">
                  <CalendarIcon className="h-4 w-4" />
                  {date ? date.toLocaleDateString("es-ES") : "Selecciona fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-2">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="txn-note">Nota (opcional)</Label>
            <Input id="txn-note" placeholder="Descripción" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!Number(amount) || !categoryId}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ManageBudgetsDialog(props: {
  categories: Category[]
  onSave: (updates: Record<UUID, number | undefined>) => void
  triggerSize?: "default" | "sm" | "lg"
}) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<UUID, string>>({})

  useEffect(() => {
    const initial: Record<UUID, string> = {}
    props.categories
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, "es"))
      .forEach((c) => {
        initial[c.id] = c.budget != null ? String(c.budget) : ""
      })
    setValues(initial)
  }, [props.categories])

  const setValue = (id: UUID, val: string) => {
    setValues((prev) => ({ ...prev, [id]: val }))
  }

  const submit = () => {
    const updates: Record<UUID, number | undefined> = {}
    Object.entries(values).forEach(([id, str]) => {
      const cleaned = str.replace(",", ".").trim()
      if (cleaned === "") {
        updates[id as UUID] = undefined
      } else {
        const num = Number(cleaned)
        if (!Number.isNaN(num) && num >= 0) {
          updates[id as UUID] = Number(num.toFixed(2))
        }
      }
    })
    props.onSave(updates)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={props.triggerSize ?? "default"} className="gap-2 bg-transparent">
          <Wallet className="h-4 w-4" />
          <span> Presupuestos</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Presupuestos por categoría</DialogTitle>
          <DialogDescription>
            Define un límite mensual por categoría. Deja en blanco para quitar el límite.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {props.categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Crea una categoría primero.</p>
          ) : (
            <div className="max-h-[340px] overflow-auto rounded-md border">
              <ul className="divide-y">
                {props.categories
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, "es"))
                  .map((c) => (
                    <li key={c.id} className="flex items-center gap-3 p-3">
                      <span
                        className="grid h-9 w-9 place-items-center rounded-full text-base shrink-0"
                        style={{ backgroundColor: `${c.color}22`, color: c.color }}
                        aria-hidden="true"
                      >
                        {c.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{c.name}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <Input
                            inputMode="decimal"
                            pattern="[0-9]*[.,]?[0-9]*"
                            placeholder="0,00"
                            className="w-36"
                            value={values[c.id] ?? ""}
                            onChange={(e) => setValue(c.id, e.target.value)}
                            aria-label={`Presupuesto para ${c.name}`}
                          />
                          <span className="text-xs text-muted-foreground">€/mes</span>
                          {values[c.id] && (
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-8 px-2 text-xs"
                              onClick={() => setValue(c.id, "")}
                            >
                              Quitar
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={props.categories.length === 0}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PieSpentChart(props: { categories: Category[]; totals: { category: Category; total: number }[] }) {
  const chartData = useMemo(
    () =>
      props.totals.map((t) => ({
        name: t.category.name,
        value: Number(t.total.toFixed(2)),
        color: t.category.color,
      })),
    [props.totals],
  )
  const total = useMemo(() => chartData.reduce((acc, d) => acc + d.value, 0), [chartData])
  if (chartData.length === 0) return null
  return (
    <div className="w-full h-64">
      <ChartContainer
        config={Object.fromEntries(chartData.map((d) => [d.name, { label: d.name, color: d.color }]))}
        className="h-full w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RPieChart>
            <ChartTooltip content={<CustomPieTooltip total={total} />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={48}
              outerRadius={80}
              paddingAngle={2}
              labelLine={false}
              label={({ percent }) => `${Math.round((percent ?? 0) * 100)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-spent-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </RPieChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}

function ChartsSlider(props: { children: React.ReactNode }) {
  const [active, setActive] = useState(0)
  const [sliderEl, setSliderEl] = useState<HTMLDivElement | null>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!sliderEl) return
    const onScroll = () => {
      const w = sliderEl.clientWidth
      const i = Math.round(sliderEl.scrollLeft / Math.max(1, w))
      setActive(i)
    }
    sliderEl.addEventListener("scroll", onScroll, { passive: true })
    const ro = new ResizeObserver(() => onScroll())
    ro.observe(sliderEl)
    onScroll()
    return () => {
      sliderEl.removeEventListener("scroll", onScroll)
      ro.disconnect()
    }
  }, [sliderEl])

  useEffect(() => {
    if (!sliderEl) return
    const c = sliderEl.querySelectorAll('[data-slide="true"]').length
    setCount(c)
  }, [sliderEl, props.children])

  const goTo = (idx: number) => {
    if (!sliderEl) return
    const w = sliderEl.clientWidth
    sliderEl.scrollTo({ left: Math.max(0, idx) * w, behavior: "smooth" })
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Distribución y análisis</CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <div
          ref={setSliderEl}
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth gap-3 no-scrollbar"
          style={{ scrollBehavior: "smooth" }}
          aria-roledescription="carousel"
          aria-label="Gráficas de distribución y análisis"
        >
          {Array.isArray(props.children) ? (
            props.children.map((child, i) => (
              <div
                key={i}
                className="min-w-full snap-start"
                data-slide="true"
                role="group"
                aria-roledescription="slide"
                aria-label={`Slide ${i + 1}`}
              >
                {child}
              </div>
            ))
          ) : (
            <div
              className="min-w-full snap-start"
              data-slide="true"
              role="group"
              aria-roledescription="slide"
              aria-label="Slide 1"
            >
              {props.children}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-1">
          <Button
            variant="outline"
            size="icon"
            className="pointer-events-auto h-8 w-8 bg-white/80 backdrop-blur"
            onClick={() => goTo(Math.max(0, active - 1))}
            disabled={active <= 0}
            aria-label="Anterior"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="pointer-events-auto h-8 w-8 bg-white/80 backdrop-blur"
            onClick={() => goTo(active + 1)}
            disabled={active >= count - 1}
            aria-label="Siguiente"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex justify-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              className={cn(
                "h-1.5 w-6 rounded-full border transition-colors",
                i === active ? "bg-foreground border-foreground" : "bg-muted border-muted",
              )}
              aria-label={`Ir a slide ${i + 1}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
