# Zcash RPC Proxy (Cloudflare Worker)

A simple proxy that adds CORS headers to Zcash RPC requests, allowing browser access.

## Features
- ✅ CORS enabled for browser requests
- ✅ 60-second caching (reduces RPC load)
- ✅ Method whitelist (security)
- ✅ Free tier: 100k requests/day

## Quick Deploy (5 minutes)

### 1. Create Cloudflare Account
Go to [workers.cloudflare.com](https://workers.cloudflare.com) and sign up (free).

### 2. Create a Worker
- Click "Create a Worker"
- Delete the default code
- Paste the contents of `zcash-rpc-proxy.js`

### 3. Add Environment Variable
- Go to **Settings** → **Variables**
- Add a new variable:
  - Name: `ZCASH_RPC_URL`
  - Value: `http://YOUR_ZCASH_NODE_IP:8232` (your RPC URL)

### 4. Deploy
- Click **Save and Deploy**
- Your worker URL will be something like: `https://zcash-rpc-proxy.YOUR_SUBDOMAIN.workers.dev`

### 5. Test It
```bash
curl -X POST https://YOUR_WORKER_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"1.0","id":"test","method":"getblockcount","params":[]}'
```

## Usage in Frontend

```javascript
const WORKER_URL = 'https://zcash-rpc-proxy.YOUR_SUBDOMAIN.workers.dev';

async function getShieldedSupply() {
  const height = await rpcCall('getblockcount');
  const block = await rpcCall('getblock', [String(height), 1]);
  
  const pools = block.valuePools || [];
  const sprout = pools.find(p => p.id === 'sprout')?.chainValueZat || 0;
  const sapling = pools.find(p => p.id === 'sapling')?.chainValueZat || 0;
  const orchard = pools.find(p => p.id === 'orchard')?.chainValueZat || 0;
  
  return (sprout + sapling + orchard) / 1e8;
}

async function rpcCall(method, params = []) {
  const res = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '1.0', id: 'zec', method, params })
  });
  const data = await res.json();
  return data.result;
}
```

## Security Notes

- Only whitelisted RPC methods are allowed (see `ALLOWED_METHODS` in the code)
- Add more methods to the whitelist if needed
- The RPC URL is stored as an environment variable (not in code)

