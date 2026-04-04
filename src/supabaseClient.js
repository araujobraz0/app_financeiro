import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'As variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas no arquivo .env'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)