import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

let client;

if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn("⚠️ Supabase credentials missing (REACT_APP_SUPABASE_URL, REACT_APP_SUPABASE_ANON_KEY). App running in offline mode. Database features disabled.");
  
  // Robust Mock Client using Proxy to handle any chain of methods gracefully
  // This prevents crashes like "cannot read property from of undefined"
  const createMockChain = () => {
    return new Proxy(() => {}, {
      get: (target, prop) => {
        // When the code awaits the result (calling .then), return a safe empty object
        if (prop === 'then') {
           return (resolve: any) => resolve({ data: [], error: null });
        }
        // Handle explicit single() calls which expect an object, not an array
        if (prop === 'single') {
           return () => Promise.resolve({ data: { id: 'offline-mode-id' }, error: null });
        }
        // Return the proxy itself for any other method call (chaining)
        return createMockChain();
      },
      apply: () => createMockChain()
    });
  };

  client = createMockChain();
}

export const supabase = client as any;