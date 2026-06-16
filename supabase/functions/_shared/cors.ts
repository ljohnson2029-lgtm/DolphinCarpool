// Shared CORS configuration for all edge functions
// Only allows requests from approved origins

const ALLOWED_ORIGINS = [
  'https://dolphincarpool.lovable.app',
  'https://id-preview--0448966d-bdd1-486b-a1ee-cd456b9f1300.lovable.app',
  'https://dolphincarpool.org',
  'https://www.dolphincarpool.org',
  // Local development (Vite default port)
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:8080',
  'http://localhost:8081',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:8081',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  
  // Check if it's a local development origin (any localhost or 127.0.0.1 port)
  const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
  
  // Check if it's an allowed origin
  const isAllowedOrigin = ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || 
    origin.endsWith('.lovable.app') || 
    origin.endsWith('.lovableproject.com') || 
    origin.endsWith('dolphincarpool.org')
  );
  
  // Allow if it's localhost OR in the allowed list
  const isAllowed = isLocalhost || isAllowedOrigin;

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}

export function handleCorsPreflightIfNeeded(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }
  return null;
}
