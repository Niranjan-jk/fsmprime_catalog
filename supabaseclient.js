// supabaseclient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://oeixrzdvrwxrseohcgka.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laXhyemR2cnd4cnNlb2hjZ2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3OTkzOTcsImV4cCI6MjA2MDM3NTM5N30.NuwAyPATQTcHAfbcOt9_GZTRn9MK0waygSQC9_VajVY';

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Verify initialization
console.log('Supabase initialized:', supabase !== undefined);

// Export for modules and expose to window
export { supabase };
window.supabase = supabase;