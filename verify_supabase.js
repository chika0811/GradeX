import { createClient } from '@supabase/supabase-js'

const url = 'https://pqaybbikekzwldiqapnv.supabase.co'
const key = 'sb_publishable_tyQIMPARXUA0Hkr8ViS4kA_7AAI4wBL'

console.log('Testing connection to:', url)
console.log('Using key:', key)

const supabase = createClient(url, key)

async function test() {
  const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
  if (error) {
    console.error('Connection failed:', error.message)
  } else {
    console.log('Connection successful!')
  }
}

test()
