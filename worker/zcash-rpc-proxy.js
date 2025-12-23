/**
 * Cloudflare Worker: Zcash RPC Proxy
 * 
 * Proxies requests to a Zcash node RPC with CORS headers.
 * Caches responses for 60 seconds to reduce load.
 * 
 * Deploy: https://workers.cloudflare.com
 */

// Your Zcash RPC endpoint (set as environment variable in Cloudflare dashboard)
// Go to Worker Settings > Variables > Add: ZCASH_RPC_URL = http://38.190.136.76:8232
const DEFAULT_RPC_URL = 'http://127.0.0.1:8232';

// Allowed RPC methods (whitelist for security)
const ALLOWED_METHODS = [
  'getblockcount',
  'getblock',
  'getblockhash',
  'getblockchaininfo',
];

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    try {
      const body = await request.json();
      
      // Validate RPC method is allowed
      if (!ALLOWED_METHODS.includes(body.method)) {
        return new Response(JSON.stringify({ 
          error: `Method '${body.method}' not allowed` 
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get RPC URL from environment or use default
      const rpcUrl = env.ZCASH_RPC_URL || DEFAULT_RPC_URL;

      // Check cache for this request
      const cacheKey = new Request(
        `https://cache.local/${body.method}-${JSON.stringify(body.params || [])}`,
        request
      );
      const cache = caches.default;
      let response = await cache.match(cacheKey);

      if (!response) {
        // Forward request to Zcash RPC
        const rpcResponse = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const data = await rpcResponse.json();

        // Create response with CORS headers
        response = new Response(JSON.stringify(data), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60', // Cache for 60 seconds
          }
        });

        // Store in cache
        ctx.waitUntil(cache.put(cacheKey, response.clone()));
      }

      return response;

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

