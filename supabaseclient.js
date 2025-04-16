// Initialize Supabase when the page loads
document.addEventListener('DOMContentLoaded', function() {
  const supabaseUrl = 'https://oeixrzdvrwxrseohcgka.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laXhyemR2cnd4cnNlb2hjZ2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ3OTkzOTcsImV4cCI6MjA2MDM3NTM5N30.NuwAyPATQTcHAfbcOt9_GZTRn9MK0waygSQC9_VajVY';
  
  // Create and expose the client
  window.supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);
  console.log('Supabase initialized successfully!');
});
