import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase Project URL and Anon Key
const supabaseUrl = 'https://poarxhtqoqvwkmubstgq.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvYXJ4aHRxb3F2d2ttdWJzdGdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0Mzg2NzQsImV4cCI6MjA5MTAxNDY3NH0.J615IsF6TJyf7-GX8KFayfCxhwfSJRC0onZLXket9F8'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)