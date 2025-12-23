// ZEC App - Price + Shielded Supply Charts

// ============================================================================
// Configuration
// ============================================================================

// Binance WebSocket for real-time price
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/zecusdt@trade';

// CoinGecko via Netlify function (hides API key)
const COINGECKO_PROXY = '/api/coingecko';
const COINGECKO_PRICE_URL = `${COINGECKO_PROXY}?endpoint=simple/price?ids=zcash%26vs_currencies=usd%26include_24hr_change=true`;
const COINGECKO_COIN_URL = `${COINGECKO_PROXY}?endpoint=coins/zcash`;
const COINGECKO_CHART_URL = `${COINGECKO_PROXY}?endpoint=coins/zcash/market_chart?vs_currency=usd%26days=365`;

// Shielded pool data
const SHIELDED_DATA_URL = 'shielded-pool-data.json';
const ZCASH_RPC_PROXY = '/api/zcash-rpc';  // Netlify function

// ============================================================================
// DOM Elements
// ============================================================================

const splash = document.getElementById('splash');
const container = document.getElementById('container');
const viewToggle = document.getElementById('view-toggle');
const toggleText = viewToggle.querySelector('.toggle-text');

// Headlines
const headlinePrice = document.getElementById('headline-price');
const headlineShielded = document.getElementById('headline-shielded');
const shieldedValueEl = document.getElementById('shielded-value');
const shieldedPercentEl = document.getElementById('shielded-percent');

// Charts
const chartPrice = document.getElementById('chart-price');
const chartShielded = document.getElementById('chart-shielded');
const priceChartCanvas = document.getElementById('price-chart');
const shieldedChartCanvas = document.getElementById('shielded-chart');

const priceEl = document.getElementById('price');
const priceChangeEl = document.getElementById('price-change');
const liveIndicator = document.getElementById('live-indicator');
const pollProgressBar = document.getElementById('poll-progress-bar');

// ============================================================================
// State
// ============================================================================

let currentView = 'price'; // 'price' or 'shielded'
let isReady = false;

// Shielded data
let shieldedData = null;
let shieldedChart = null;
let circulatingSupply = null;

// Price data
let priceChart = null;
let priceHistoricalData = null;
let livePrice = null;
let previousPrice = null;
let currentPriceChars = [];

// ============================================================================
// View Toggle
// ============================================================================

function switchView() {
  if (currentView === 'price') {
    currentView = 'shielded';
    // Swap headlines
    headlinePrice.classList.remove('active');
    headlineShielded.classList.add('active');
    // Swap charts
    chartPrice.classList.remove('active');
    chartShielded.classList.add('active');
    // Update button
    toggleText.textContent = 'show price chart';
    viewToggle.classList.add('flipped');
  } else {
    currentView = 'price';
    // Swap headlines
    headlineShielded.classList.remove('active');
    headlinePrice.classList.add('active');
    // Swap charts
    chartShielded.classList.remove('active');
    chartPrice.classList.add('active');
    // Update button
    toggleText.textContent = 'show shielded supply';
    viewToggle.classList.remove('flipped');
  }
}

viewToggle.addEventListener('click', switchView);

// ============================================================================
// Formatting Helpers
// ============================================================================

function formatPrice(price) {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatShieldedValue(value) {
  return Math.round(value).toLocaleString('en-US');
}

// ============================================================================
// Rolling Digit Animation (for price)
// ============================================================================

function createDigitSlot(char, index) {
  const slot = document.createElement('span');
  slot.className = 'digit-slot';
  slot.dataset.index = index;
  
  const roll = document.createElement('span');
  roll.className = 'digit-roll';
  
  if (/\d/.test(char)) {
    for (let i = 0; i <= 9; i++) {
      const span = document.createElement('span');
      span.textContent = i;
      roll.appendChild(span);
    }
    roll.style.transform = `translateY(-${parseInt(char) * (100 / 10)}%)`;
  } else {
    const span = document.createElement('span');
    span.textContent = char;
    roll.appendChild(span);
  }
  
  slot.appendChild(roll);
  return slot;
}

function updatePriceDisplay(newPrice) {
  const newChars = newPrice.split('');
  
  if (newChars.length !== currentPriceChars.length) {
    priceEl.innerHTML = '';
    newChars.forEach((char, i) => {
      priceEl.appendChild(createDigitSlot(char, i));
    });
    currentPriceChars = newChars;
    return;
  }
  
  const slots = priceEl.querySelectorAll('.digit-slot');
  newChars.forEach((char, i) => {
    if (char !== currentPriceChars[i]) {
      const roll = slots[i].querySelector('.digit-roll');
      if (/\d/.test(char)) {
        roll.style.transform = `translateY(-${parseInt(char) * (100 / 10)}%)`;
      }
    }
  });
  
  currentPriceChars = newChars;
}

// ============================================================================
// Live Indicator
// ============================================================================

function updateLiveIndicator() {
  if (!priceChart || !priceChart.data.datasets[0].data.length) return;
  
  const meta = priceChart.getDatasetMeta(0);
  const lastPoint = meta.data[meta.data.length - 1];
  
  if (lastPoint) {
    liveIndicator.style.left = `${lastPoint.x}px`;
    liveIndicator.style.top = `${lastPoint.y}px`;
  }
}

// ============================================================================
// Shielded Data & Chart
// ============================================================================

async function fetchShieldedData() {
  try {
    const res = await fetch(SHIELDED_DATA_URL);
    const json = await res.json();
    shieldedData = json.data;
    return shieldedData;
  } catch (err) {
    console.error('Failed to fetch shielded data:', err);
    return null;
  }
}

// Fetch live shielded supply from Zcash node via RPC proxy
async function fetchLiveShieldedSupply() {
  try {
    // Get current block height
    const heightRes = await fetch(ZCASH_RPC_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '1.0', id: 'zec', method: 'getblockcount', params: [] })
    });
    const heightData = await heightRes.json();
    const height = heightData.result;
    
    // Get block with valuePools
    const blockRes = await fetch(ZCASH_RPC_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '1.0', id: 'zec', method: 'getblock', params: [String(height), 1] })
    });
    const blockData = await blockRes.json();
    const block = blockData.result;
    
    // Calculate total shielded
    const pools = block.valuePools || [];
    const sprout = pools.find(p => p.id === 'sprout')?.chainValueZat || 0;
    const sapling = pools.find(p => p.id === 'sapling')?.chainValueZat || 0;
    const orchard = pools.find(p => p.id === 'orchard')?.chainValueZat || 0;
    const total = (sprout + sapling + orchard) / 1e8;
    
    return { height, time: block.time, total, sprout: sprout/1e8, sapling: sapling/1e8, orchard: orchard/1e8 };
  } catch (err) {
    console.error('Failed to fetch live shielded supply:', err);
    return null;
  }
}

// Count-up animation for shielded value
let currentShieldedValue = 0;
let shieldedAnimationFrame = null;

function animateShieldedValue(targetValue, duration = 800) {
  const startValue = currentShieldedValue;
  const difference = targetValue - startValue;
  
  // Skip animation if no change or first load
  if (difference === 0) return;
  if (startValue === 0) {
    currentShieldedValue = targetValue;
    shieldedValueEl.textContent = formatShieldedValue(targetValue);
    return;
  }
  
  // Flash green/red based on direction
  shieldedValueEl.classList.remove('flash-up', 'flash-down');
  void shieldedValueEl.offsetWidth; // Force reflow
  shieldedValueEl.classList.add(difference > 0 ? 'flash-up' : 'flash-down');
  
  setTimeout(() => {
    shieldedValueEl.classList.remove('flash-up', 'flash-down');
  }, duration);
  
  const startTime = performance.now();
  
  // Cancel any existing animation
  if (shieldedAnimationFrame) {
    cancelAnimationFrame(shieldedAnimationFrame);
  }
  
  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease-out cubic for smooth deceleration
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    const currentValue = startValue + (difference * easeOut);
    shieldedValueEl.textContent = formatShieldedValue(currentValue);
    
    if (progress < 1) {
      shieldedAnimationFrame = requestAnimationFrame(animate);
    } else {
      currentShieldedValue = targetValue;
      shieldedValueEl.textContent = formatShieldedValue(targetValue);
    }
  }
  
  shieldedAnimationFrame = requestAnimationFrame(animate);
}

// Update shielded display with live data
function updateLiveShieldedDisplay(data) {
  if (!data) return;
  
  // Animate headline value
  animateShieldedValue(data.total);
  
  // Update percentage if we have circulating supply
  if (circulatingSupply && circulatingSupply > 0) {
    const percent = (data.total / circulatingSupply) * 100;
    shieldedPercentEl.textContent = `${Math.round(percent)}%`;
  }
  
  // Update chart with live tip (append to historical data)
  if (shieldedChart && shieldedData) {
    const labels = shieldedData.map(d => new Date(d.t * 1000));
    const chartData = shieldedData.map(d => d.v);
    
    // Append live data point
    labels.push(new Date(data.time * 1000));
    chartData.push(data.total);
    
    shieldedChart.data.labels = labels;
    shieldedChart.data.datasets[0].data = chartData;
    shieldedChart.update('none');
  }
}

function initShieldedChart() {
  if (!shieldedData || shieldedData.length === 0) return;
  
  const labels = shieldedData.map(d => new Date(d.t * 1000));
  const data = shieldedData.map(d => d.v);
  
  // Set initial headline value (no animation on first load)
  const latestValue = shieldedData[shieldedData.length - 1].v;
  currentShieldedValue = latestValue;
  shieldedValueEl.textContent = formatShieldedValue(latestValue);
  
  // Update percentage if we have circulating supply
  if (circulatingSupply && circulatingSupply > 0) {
    const percent = (latestValue / circulatingSupply) * 100;
    shieldedPercentEl.textContent = `${Math.round(percent)}%`;
  }
  
  shieldedChart = new Chart(shieldedChartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#fff',
        borderWidth: 1.5,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: '#000',
          borderColor: '#333',
          borderWidth: 1,
          titleColor: '#666',
          bodyColor: '#fff',
          titleFont: { family: "'Inter', sans-serif", size: 11, weight: '400' },
          bodyFont: { family: "'Inter', sans-serif", size: 14, weight: '300' },
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const date = new Date(items[0].label);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            },
            label: (item) => {
              return Math.round(item.raw).toLocaleString('en-US') + ' ZEC';
            }
          }
        }
      },
      scales: {
        x: {
          display: false,
          grid: { display: false }
        },
        y: {
          display: false,
          grid: { display: false }
        }
      },
      animation: {
        duration: 0
      }
    }
  });
}

// ============================================================================
// Price Data & Chart
// ============================================================================

async function fetchInitialPrice() {
  try {
    const res = await fetch(COINGECKO_PRICE_URL);
    const data = await res.json();
    
    // Update 24h change display
    const change24h = data.zcash.usd_24h_change;
    if (change24h !== undefined) {
      updatePriceChange(change24h);
    }
    
    return data.zcash.usd;
  } catch (err) {
    console.error('Failed to fetch initial price:', err);
    return null;
  }
}

function updatePriceChange(change) {
  const isUp = change >= 0;
  const sign = isUp ? '+' : '';
  const formatted = `${sign}${change.toFixed(2)}%`;
  
  priceChangeEl.textContent = formatted;
  priceChangeEl.classList.remove('up', 'down');
  priceChangeEl.classList.add(isUp ? 'up' : 'down');
}

async function fetchCirculatingSupply() {
  try {
    const res = await fetch(COINGECKO_COIN_URL);
    const data = await res.json();
    circulatingSupply = data.market_data?.circulating_supply;
    return circulatingSupply;
  } catch (err) {
    console.error('Failed to fetch circulating supply:', err);
    return null;
  }
}

async function fetchPriceChartData() {
  try {
    const res = await fetch(COINGECKO_CHART_URL);
    const data = await res.json();
    priceHistoricalData = data.prices;
    return priceHistoricalData;
  } catch (err) {
    console.error('Failed to fetch price chart data:', err);
    return null;
  }
}

function getPriceChartDataWithLiveTip() {
  if (!priceHistoricalData) return { labels: [], data: [] };
  
  const labels = priceHistoricalData.map(p => new Date(p[0]));
  const data = priceHistoricalData.map(p => p[1]);
  
  if (livePrice !== null) {
    labels.push(new Date());
    data.push(livePrice);
  }
  
  return { labels, data };
}

function updatePriceChartLiveTip() {
  if (!priceChart || !priceHistoricalData) return;
  
  const { labels, data } = getPriceChartDataWithLiveTip();
  priceChart.data.labels = labels;
  priceChart.data.datasets[0].data = data;
  priceChart.update('none');
  updateLiveIndicator();
}

function initPriceChart() {
  if (!priceHistoricalData) return;
  
  const { labels, data } = getPriceChartDataWithLiveTip();
  
  priceChart = new Chart(priceChartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#fff',
        borderWidth: 1.5,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: '#000',
          borderColor: '#333',
          borderWidth: 1,
          titleColor: '#666',
          bodyColor: '#fff',
          titleFont: { family: "'Inter', sans-serif", size: 11, weight: '400' },
          bodyFont: { family: "'Inter', sans-serif", size: 14, weight: '300' },
          padding: 12,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const date = new Date(items[0].label);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            },
            label: (item) => {
              return '$' + item.raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
          }
        }
      },
      scales: {
        x: {
          display: false,
          grid: { display: false }
        },
        y: {
          display: false,
          grid: { display: false }
        }
      },
      animation: {
        duration: 0,
        onComplete: updateLiveIndicator
      }
    }
  });
}

// ============================================================================
// WebSocket Price Stream (with fallback to polling)
// ============================================================================

let wsConnected = false;
let wsRetries = 0;
let pollingInterval = null;

function updatePrice(price) {
  // Flash color on price change
  if (previousPrice !== null && price !== previousPrice) {
    priceEl.classList.remove('flash-up', 'flash-down');
    void priceEl.offsetWidth;
    priceEl.classList.add(price > previousPrice ? 'flash-up' : 'flash-down');
    
    setTimeout(() => {
      priceEl.classList.remove('flash-up', 'flash-down');
    }, 600);
  }
  
  previousPrice = price;
  livePrice = price;
  updatePriceDisplay(formatPrice(price));
  updatePriceChartLiveTip();
  document.title = `$${formatPrice(price)} · ZEC`;
}

// Fallback: poll CoinGecko every 10 seconds
function startPricePolling() {
  if (pollingInterval) return; // Already polling
  
  console.log('WebSocket unavailable, falling back to polling');
  pollingInterval = setInterval(async () => {
    try {
      const res = await fetch(COINGECKO_PRICE_URL);
      const data = await res.json();
      const price = data.zcash.usd;
      updatePrice(price);
    } catch (err) {
      console.error('Price poll failed:', err);
    }
  }, 10000); // Every 10 seconds
}

function stopPricePolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

function connectPriceStream() {
  const ws = new WebSocket(BINANCE_WS_URL);
  
  ws.onopen = () => {
    wsConnected = true;
    wsRetries = 0;
    stopPricePolling(); // Stop polling if WebSocket connects
  };
  
  ws.onmessage = (event) => {
    const trade = JSON.parse(event.data);
    const price = parseFloat(trade.p);
    updatePrice(price);
  };
  
  ws.onclose = (event) => {
    wsConnected = false;
    
    // If blocked (451) or too many retries, switch to polling
    if (wsRetries >= 3) {
      startPricePolling();
      return;
    }
    
    wsRetries++;
    setTimeout(connectPriceStream, 2000);
  };
  
  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
    wsConnected = false;
    ws.close();
  };
}

// ============================================================================
// UI Reveal
// ============================================================================

function revealUI() {
  if (isReady) return;
  isReady = true;
  splash.classList.add('fade-out');
  setTimeout(() => {
    container.classList.add('ready');
  }, 1300);
}

// ============================================================================
// Initialization
// ============================================================================

async function init() {
  // Fetch all data in parallel
  const [shielded, initialPrice] = await Promise.all([
    fetchShieldedData(),
    fetchInitialPrice(),
    fetchPriceChartData(),
    fetchCirculatingSupply()
  ]);
  
  // Initialize shielded chart and value
  initShieldedChart();
  
  // Initialize price display and chart
  if (initialPrice !== null) {
    livePrice = initialPrice;
    previousPrice = initialPrice;
    updatePriceDisplay(formatPrice(initialPrice));
  }
  initPriceChart();
  
  // Fetch live shielded supply (updates headline and chart tip)
  const liveShielded = await fetchLiveShieldedSupply();
  if (liveShielded) {
    updateLiveShieldedDisplay(liveShielded);
  }
  
  // Reveal UI
  revealUI();
  
  // Connect WebSocket for live price updates
  connectPriceStream();
}

init();

// Refresh price data every 5 minutes
setInterval(async () => {
  await fetchPriceChartData();
  updatePriceChartLiveTip();
}, 5 * 60 * 1000);

// Refresh shielded supply every 75 seconds (~1 block)
const POLL_INTERVAL = 75 * 1000;
let pollStartTime = Date.now();

// Animate progress bar
function updatePollProgress() {
  const elapsed = Date.now() - pollStartTime;
  const progress = Math.min((elapsed / POLL_INTERVAL) * 100, 100);
  pollProgressBar.style.width = `${progress}%`;
}

// Start progress bar animation
setInterval(updatePollProgress, 500);

// Poll for shielded supply
async function pollShieldedSupply() {
  // Flash the bar briefly to indicate polling
  pollProgressBar.classList.add('polling');
  
  const liveShielded = await fetchLiveShieldedSupply();
  if (liveShielded) {
    updateLiveShieldedDisplay(liveShielded);
  }
  
  // Reset progress bar
  pollProgressBar.classList.remove('polling');
  pollProgressBar.style.width = '0%';
  pollStartTime = Date.now();
}

setInterval(pollShieldedSupply, POLL_INTERVAL);
