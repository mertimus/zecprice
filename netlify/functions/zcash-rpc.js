/**
 * Netlify Function: Zcash RPC Proxy
 * 
 * Proxies requests to a Zcash node RPC with CORS headers.
 * 
 * Deploy: Push to your Netlify-connected repo, or use `netlify deploy`
 * 
 * Set environment variable in Netlify dashboard:
 *   ZCASH_RPC_URL = http://YOUR_NODE_IP:8232
 */

// Allowed RPC methods (whitelist for security)
const ALLOWED_METHODS = [
  'getblockcount',
  'getblock',
  'getblockhash',
  'getblockchaininfo',
];

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body);

    // Validate RPC method is allowed
    if (!ALLOWED_METHODS.includes(body.method)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: `Method '${body.method}' not allowed` }),
      };
    }

    // Get RPC URL from environment
    const rpcUrl = process.env.ZCASH_RPC_URL || 'http://127.0.0.1:8232';

    // Forward request to Zcash RPC
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

