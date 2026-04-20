const SUPABASE_URL = 'https://mqxowotdeibllkitkije.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xeG93b3RkZWlibGxraXRraWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzgxNDYsImV4cCI6MjA5MTcxNDE0Nn0.V_Pr0elBurAK7OPKFL3OoZwBmb-bI-Mcz8N1U8yblG8';

const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    }
  }
});