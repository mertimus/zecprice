// Fetch shielded pool data for last 24 hours with hourly granularity
// Returns ~24 data points (one per hour)

exports.handler = async (event, context) => {
  const rpcUrl = process.env.ZCASH_RPC_URL;
  
  if (!rpcUrl) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'ZCASH_RPC_URL not configured' })
    };
  }

  try {
    // Get current block height
    const blockCountRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '1.0', id: 'count', method: 'getblockcount', params: [] })
    });
    const blockCountData = await blockCountRes.json();
    const currentHeight = blockCountData.result;

    // 576 blocks per day, sample every 12 blocks (~30 min) for 2x granularity
    const blocksPerDay = 576;
    const sampleInterval = 12;
    const startBlock = currentHeight - blocksPerDay;
    
    const dataPoints = [];
    
    // Fetch blocks at hourly intervals
    for (let height = startBlock; height <= currentHeight; height += sampleInterval) {
      const blockRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '1.0', id: 'block', method: 'getblock', params: [String(height), 1] })
      });
      const blockData = await blockRes.json();
      
      if (blockData.result && blockData.result.valuePools) {
        const pools = blockData.result.valuePools;
        const sprout = pools.find(p => p.id === 'sprout')?.chainValue || 0;
        const sapling = pools.find(p => p.id === 'sapling')?.chainValue || 0;
        const orchard = pools.find(p => p.id === 'orchard')?.chainValue || 0;
        
        dataPoints.push({
          t: blockData.result.time,
          h: height,
          sp: Math.round(sprout * 100) / 100,
          sa: Math.round(sapling * 100) / 100,
          or: Math.round(orchard * 100) / 100,
          v: Math.round((sprout + sapling + orchard) * 100) / 100
        });
      }
    }
    
    // Always include the latest block
    if (dataPoints.length === 0 || dataPoints[dataPoints.length - 1].h !== currentHeight) {
      const latestRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '1.0', id: 'latest', method: 'getblock', params: [String(currentHeight), 1] })
      });
      const latestData = await latestRes.json();
      
      if (latestData.result && latestData.result.valuePools) {
        const pools = latestData.result.valuePools;
        const sprout = pools.find(p => p.id === 'sprout')?.chainValue || 0;
        const sapling = pools.find(p => p.id === 'sapling')?.chainValue || 0;
        const orchard = pools.find(p => p.id === 'orchard')?.chainValue || 0;
        
        dataPoints.push({
          t: latestData.result.time,
          h: currentHeight,
          sp: Math.round(sprout * 100) / 100,
          sa: Math.round(sapling * 100) / 100,
          or: Math.round(orchard * 100) / 100,
          v: Math.round((sprout + sapling + orchard) * 100) / 100
        });
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60' // Cache for 1 minute
      },
      body: JSON.stringify({
        data: dataPoints,
        latestBlock: currentHeight,
        fetchedAt: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('Error fetching shielded hourly data:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Failed to fetch data', details: error.message })
    };
  }
};

