import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jfjgkzzezzhlqrfbffyg.supabase.co'
const supabaseAnonKey = 'sb_publishable_y9ehzjnQbfWvghEUA-M47A_IJUHIqYK'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})