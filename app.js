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
const COINGECKO_CHART_1Y_URL = `${COINGECKO_PROXY}?endpoint=coins/zcash/market_chart?vs_currency=usd%26days=365`;
const COINGECKO_CHART_1MO_URL = `${COINGECKO_PROXY}?endpoint=coins/zcash/market_chart?vs_currency=usd%26days=30`;
const COINGECKO_CHART_1D_URL = `${COINGECKO_PROXY}?endpoint=coins/zcash/market_chart?vs_currency=usd%26days=1`;
const COINGECKO_CHART_1H_URL = `${COINGECKO_PROXY}?endpoint=coins/zcash/market_chart?vs_currency=usd%26days=0.0417`; // ~1 hour

// Shielded pool data
const SHIELDED_DATA_URL = 'shielded-pool-data.json';
const SHIELDED_HOURLY_URL = '/api/shielded-hourly';
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
const priceChangeBtn = document.getElementById('price-change-btn');
const shieldedChangeBtn = document.getElementById('shielded-change-btn');
const liveIndicator = document.getElementById('live-indicator');
const pollProgressBar = document.getElementById('poll-progress-bar');

// ============================================================================
// State
// ============================================================================

let currentView = 'price'; // 'price' or 'shielded'
let isReady = false;

// Shielded data
let shieldedData = null;
let shieldedDataFull = null; // Full historical data for filtering
let shieldedChart = null;
let circulatingSupply = null;
let shieldedChartTimeframe = 'all'; // 'all', '1y', '1mo', '1d'
const SHIELDED_TIMEFRAME_CYCLE = ['all', '1y', '1mo', '1d'];
const SHIELDED_TIMEFRAME_LABELS = { 'all': 'All', '1y': 'Y', '1mo': 'M', '1d': 'D' };

// Price data
let priceChart = null;
let priceHistoricalData = null;
let livePrice = null;
let previousPrice = null;
let currentPriceChars = [];
let priceChartTimeframe = '1d'; // '1d', '1mo', '1y', or '1h' - starts at D
const TIMEFRAME_CYCLE = ['1d', '1mo', '1y', '1h'];
const TIMEFRAME_LABELS = { '1d': 'D', '1mo': 'M', '1y': 'Y', '1h': 'H' };
let hourlyYAxisLocked = { min: null, max: null };

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
    toggleText.textContent = 'price chart';
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
    toggleText.textContent = 'shielded supply';
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

// Progressive line draw animation plugin
const progressiveLinePlugin = {
  id: 'progressiveLine',
  afterInit(chart, args, options) {
    if (!options.enable) return;
    // Start with line hidden - animation will reveal it
    const meta = chart.getDatasetMeta(0);
    meta._progressiveLineProgress = 0;
  },
  beforeDatasetDraw(chart, args, options) {
    if (!options.enable) return;
    
    const meta = chart.getDatasetMeta(args.index);
    const progress = meta._progressiveLineProgress;
    
    // Skip clipping if animation complete
    if (progress >= 1) {
      meta._clipped = false;
      return;
    }
    
    const { ctx, chartArea } = chart;
    
    // Clip to reveal only the drawn portion
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      chartArea.left,
      chartArea.top,
      (chartArea.right - chartArea.left) * (progress || 0),
      chartArea.bottom - chartArea.top
    );
    ctx.clip();
    meta._clipped = true;
  },
  afterDatasetDraw(chart, args, options) {
    if (!options.enable) return;
    
    const meta = chart.getDatasetMeta(args.index);
    if (meta._clipped) {
      chart.ctx.restore();
      meta._clipped = false;
    }
  }
};

Chart.register(progressiveLinePlugin);

// Animate the progressive line reveal
let shieldedDrawAnimation = null;
let priceDrawAnimation = null;

function animateChartDraw(chart, animationRef, duration = 800, onComplete = null) {
  if (!chart) return;
  
  const meta = chart.getDatasetMeta(0);
  
  // Cancel any existing animation
  if (animationRef.current) {
    cancelAnimationFrame(animationRef.current);
  }
  
  // Start with line hidden
  meta._progressiveLineProgress = 0;
  chart.draw();
  
  const startTime = performance.now();
  
  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Ease out cubic for smooth deceleration
    meta._progressiveLineProgress = 1 - Math.pow(1 - progress, 3);
    
    chart.draw();
    
    if (progress < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      meta._progressiveLineProgress = 1;
      chart.draw();
      if (onComplete) onComplete();
    }
  }
  
  animationRef.current = requestAnimationFrame(animate);
}

// Wrapper refs for animation state
const shieldedAnimRef = { current: null };
const priceAnimRef = { current: null };

function animateShieldedChartDraw(duration = 800) {
  animateChartDraw(shieldedChart, shieldedAnimRef, duration);
}

function animatePriceChartDraw(duration = 800, onComplete = null) {
  animateChartDraw(priceChart, priceAnimRef, duration, onComplete);
}

async function fetchShieldedData() {
  try {
    const res = await fetch(SHIELDED_DATA_URL);
    const json = await res.json();
    shieldedDataFull = json.data;
    shieldedData = shieldedDataFull; // Start with all data
    return shieldedData;
  } catch (err) {
    console.error('Failed to fetch shielded data:', err);
    return null;
  }
}

// Fetch hourly shielded data for 1D view
async function fetchShieldedHourlyData() {
  try {
    const res = await fetch(SHIELDED_HOURLY_URL);
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.error('Failed to fetch hourly shielded data:', err);
    return null;
  }
}

// Filter shielded data by timeframe
function getShieldedDataForTimeframe(timeframe) {
  if (!shieldedDataFull) return [];
  
  const now = Date.now() / 1000;
  let cutoff;
  
  switch (timeframe) {
    case '1d':
      return null; // Will fetch from hourly endpoint
    case '1mo':
      cutoff = now - (30 * 24 * 60 * 60);
      break;
    case '1y':
      cutoff = now - (365 * 24 * 60 * 60);
      break;
    case 'all':
    default:
      return shieldedDataFull;
  }
  
  return shieldedDataFull.filter(d => d.t >= cutoff);
}

// Update shielded timeframe button with % change
function updateShieldedBtn(data) {
  const label = SHIELDED_TIMEFRAME_LABELS[shieldedChartTimeframe];
  
  // For "All" timeframe, just show label (% from genesis is meaningless)
  if (shieldedChartTimeframe === 'all') {
    shieldedChangeBtn.textContent = label;
    shieldedChangeBtn.classList.remove('up', 'down');
    return;
  }
  
  // Calculate % change if we have data
  let percentChange = 0;
  const chartData = data || shieldedData;
  if (chartData && chartData.length >= 2) {
    const firstValue = chartData[0].v;
    // For M/Y, use live value if available (more accurate than stale JSON)
    let lastValue = chartData[chartData.length - 1].v;
    if (shieldedChartTimeframe !== '1d' && currentShieldedValue > 0) {
      lastValue = currentShieldedValue;
    }
    if (firstValue > 0) {
      percentChange = ((lastValue - firstValue) / firstValue) * 100;
    }
  }
  
  const isUp = percentChange >= 0;
  // Use 2 decimal places to capture small daily changes (supply is ~5M ZEC)
  const absChange = Math.abs(percentChange);
  const decimals = absChange < 0.1 ? 2 : 1;
  const formatted = `${absChange.toFixed(decimals)}% · ${label}`;
  
  shieldedChangeBtn.textContent = formatted;
  shieldedChangeBtn.classList.remove('up', 'down');
  shieldedChangeBtn.classList.add(isUp ? 'up' : 'down');
}

// Toggle shielded chart timeframe
async function toggleShieldedChartTimeframe() {
  const currentIndex = SHIELDED_TIMEFRAME_CYCLE.indexOf(shieldedChartTimeframe);
  shieldedChartTimeframe = SHIELDED_TIMEFRAME_CYCLE[(currentIndex + 1) % SHIELDED_TIMEFRAME_CYCLE.length];
  
  let newData;
  if (shieldedChartTimeframe === '1d') {
    // Show loading state for API fetch
    shieldedChangeBtn.textContent = '· · ·';
    shieldedChangeBtn.classList.add('loading');
    shieldedChangeBtn.classList.remove('up', 'down');
    
    // Fetch hourly data for 1D view
    newData = await fetchShieldedHourlyData();
    
    shieldedChangeBtn.classList.remove('loading');
  } else {
    // Filter existing data (instant, no loading needed)
    newData = getShieldedDataForTimeframe(shieldedChartTimeframe);
  }
  
  if (newData && newData.length > 0) {
    shieldedData = newData;
    
    // Update chart
    const labels = shieldedData.map(d => new Date(d.t * 1000));
    const data = shieldedData.map(d => d.v);
    
    // For M/Y/All, append live value as final point (keeps chart current)
    if (shieldedChartTimeframe !== '1d' && currentShieldedValue > 0) {
      labels.push(new Date());
      data.push(currentShieldedValue);
    }
    
    shieldedChart.data.labels = labels;
    shieldedChart.data.datasets[0].data = data;
    shieldedChart.update('none'); // Update data without animation
    
    // Trigger progressive line draw animation
    animateShieldedChartDraw(800);
  }
  
  // Update button with % change
  updateShieldedBtn(newData);
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
  
  // Update percentage of supply shielded
  if (circulatingSupply && circulatingSupply > 0) {
    const percent = (data.total / circulatingSupply) * 100;
    shieldedPercentEl.textContent = `${Math.round(percent)}%`;
  }
  
  // Update chart's live tip (for M/Y/All timeframes only)
  if (shieldedChart && shieldedData && shieldedChartTimeframe !== '1d') {
    const labels = shieldedData.map(d => new Date(d.t * 1000));
    const chartData = shieldedData.map(d => d.v);
    
    // Append live data point as the tip
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
  
  // Update percentage of supply shielded
  if (circulatingSupply && circulatingSupply > 0) {
    const percent = (latestValue / circulatingSupply) * 100;
    shieldedPercentEl.textContent = `${Math.round(percent)}%`;
  }
  
  // Set initial timeframe button label
  updateShieldedBtn();
  
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
              if (shieldedChartTimeframe === '1d') {
                // Show time for 1D view
                return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
              } else if (shieldedChartTimeframe === '1mo') {
                // Show date without year for 1M
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            },
            label: (item) => {
              return Math.round(item.raw).toLocaleString('en-US') + ' ZEC';
            }
          }
        },
        progressiveLine: {
          enable: true
        }
      },
      scales: {
        x: {
          display: true,
          border: { display: false },
          grid: { 
            display: false
          },
          ticks: {
            display: true,
            color: 'rgba(255, 255, 255, 0.25)',
            font: { family: "'Inter', sans-serif", size: 10, weight: '400' },
            maxTicksLimit: 5,
            maxRotation: 0,
            callback: function(value, index, ticks) {
              const date = new Date(this.getLabelForValue(value));
              if (shieldedChartTimeframe === '1d') {
                return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
              } else if (shieldedChartTimeframe === '1mo') {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }
              return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }
          }
        },
        y: {
          display: true,
          position: 'right',
          border: { display: false },
          grid: { 
            color: 'rgba(255, 255, 255, 0.06)',
            lineWidth: 1
          },
          ticks: {
            display: true,
            color: 'rgba(255, 255, 255, 0.25)',
            font: { family: "'Inter', sans-serif", size: 10, weight: '400' },
            maxTicksLimit: 4,
            callback: function(value) {
              return (value / 1000000).toFixed(1) + 'M';
            }
          }
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
      updatePriceChangeBtn(change24h);
    }
    
    return data.zcash.usd;
  } catch (err) {
    console.error('Failed to fetch initial price:', err);
    return null;
  }
}

let currentPriceChange = 0;

function updatePriceChangeBtn(change) {
  currentPriceChange = change;
  const isUp = change >= 0;
  const label = TIMEFRAME_LABELS[priceChartTimeframe];
  const percentText = `${Math.abs(change).toFixed(2)}%`;
  
  // Use innerHTML to style the label differently
  priceChangeBtn.innerHTML = `<span class="pct">${percentText}</span> · <span class="tf-label">${label}</span>`;
  priceChangeBtn.classList.remove('up', 'down');
  priceChangeBtn.classList.add(isUp ? 'up' : 'down');
}

// Toggle price chart timeframe
async function togglePriceChartTimeframe() {
  // Cycle to next timeframe: 1d → 1m → 1y → 1d...
  const currentIndex = TIMEFRAME_CYCLE.indexOf(priceChartTimeframe);
  priceChartTimeframe = TIMEFRAME_CYCLE[(currentIndex + 1) % TIMEFRAME_CYCLE.length];
  
  // Hide live indicator immediately
  liveIndicator.style.opacity = '0';
  
  // Add loading state to button
  priceChangeBtn.style.opacity = '0.5';
  
  // Fetch new chart data
  await fetchPriceChartData(priceChartTimeframe);
  
  // Update chart with smooth animation
  if (priceChart && priceHistoricalData) {
    const { labels, data } = getPriceChartDataWithLiveTip();
    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = data;
    
    // Lock y-axis for 1H to prevent jitter on refresh, reset for others
    if (priceChartTimeframe === '1h') {
      lockYAxisForHourly(data);
      applyYAxisLock();
    } else {
      hourlyYAxisLocked = { min: null, max: null };
      applyYAxisLock();
    }
    
    // Update chart data without animation, then trigger draw animation
    priceChart.update('none');
    
    // Animate the line drawing, show indicator when complete
    animatePriceChartDraw(800, () => {
      updateLiveIndicator();
      liveIndicator.style.opacity = '1';
    });
    
    // Calculate % change for current timeframe
    if (data.length >= 2) {
      const firstPrice = data[0];
      const lastPrice = data[data.length - 1];
      const percentChange = ((lastPrice - firstPrice) / firstPrice) * 100;
      
      // Animate button content change
      priceChangeBtn.style.opacity = '0';
      setTimeout(() => {
        updatePriceChangeBtn(percentChange);
        priceChangeBtn.style.opacity = '1';
      }, 150);
    }
  } else {
    priceChangeBtn.style.opacity = '1';
    liveIndicator.style.opacity = '1';
  }
}

priceChangeBtn.addEventListener('click', togglePriceChartTimeframe);
shieldedChangeBtn.addEventListener('click', toggleShieldedChartTimeframe);

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

async function fetchPriceChartData(timeframe = '1d') {
  try {
    let url;
    if (timeframe === '1h') url = COINGECKO_CHART_1H_URL;
    else if (timeframe === '1d') url = COINGECKO_CHART_1D_URL;
    else if (timeframe === '1mo') url = COINGECKO_CHART_1MO_URL;
    else url = COINGECKO_CHART_1Y_URL;
    
    const res = await fetch(url);
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
              if (priceChartTimeframe === '1h') {
                // Show time with minutes for 1H chart
                return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
              } else if (priceChartTimeframe === '1d') {
                // Show time for 1D chart
                return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
              } else if (priceChartTimeframe === '1mo') {
                // Show date without year for 1MO chart
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            },
            label: (item) => {
              return '$' + item.raw.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
          }
        },
        progressiveLine: {
          enable: true
        }
      },
      scales: {
        x: {
          display: true,
          border: { display: false },
          grid: { 
            display: false
          },
          ticks: {
            display: true,
            color: 'rgba(255, 255, 255, 0.25)',
            font: { family: "'Inter', sans-serif", size: 10, weight: '400' },
            maxTicksLimit: 5,
            maxRotation: 0,
            callback: function(value, index, ticks) {
              const date = new Date(this.getLabelForValue(value));
              if (priceChartTimeframe === '1h' || priceChartTimeframe === '1d') {
                return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
              } else if (priceChartTimeframe === '1mo') {
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }
              return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }
          }
        },
        y: {
          display: true,
          position: 'right',
          border: { display: false },
          grid: { 
            color: 'rgba(255, 255, 255, 0.06)',
            lineWidth: 1
          },
          ticks: {
            display: true,
            color: 'rgba(255, 255, 255, 0.25)',
            font: { family: "'Inter', sans-serif", size: 10, weight: '400' },
            maxTicksLimit: 4,
            callback: function(value) {
              return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
            }
          }
        }
      },
      animation: {
        duration: 0
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
  
  // Hide live indicator until animation completes
  liveIndicator.style.opacity = '0';
  
  splash.classList.add('fade-out');
  setTimeout(() => {
    container.classList.add('ready');
    // Trigger chart animations after UI is visible
    animatePriceChartDraw(800, () => {
      updateLiveIndicator();
      liveIndicator.style.opacity = '1';
    });
    animateShieldedChartDraw(1000);
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
    fetchPriceChartData(priceChartTimeframe),
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
  
  // Lock y-axis for initial 1H view
  if (priceChartTimeframe === '1h' && priceHistoricalData) {
    const { data } = getPriceChartDataWithLiveTip();
    lockYAxisForHourly(data);
    applyYAxisLock();
    priceChart.update('none');
  }
  
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

// Refresh price chart data - 30s for 1H, 5min for others
function getChartRefreshInterval() {
  return priceChartTimeframe === '1h' ? 30 * 1000 : 5 * 60 * 1000;
}

function lockYAxisForHourly(data) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const padding = (max - min) * 0.1; // 10% padding
  hourlyYAxisLocked.min = min - padding;
  hourlyYAxisLocked.max = max + padding;
}

function applyYAxisLock() {
  if (priceChartTimeframe === '1h' && hourlyYAxisLocked.min !== null) {
    priceChart.options.scales.y.min = hourlyYAxisLocked.min;
    priceChart.options.scales.y.max = hourlyYAxisLocked.max;
  } else {
    // Reset to auto-scale for other timeframes
    priceChart.options.scales.y.min = undefined;
    priceChart.options.scales.y.max = undefined;
  }
}

async function refreshPriceChart() {
  await fetchPriceChartData(priceChartTimeframe);
  
  // Update chart silently (no animation) for background refreshes
  if (priceChart && priceHistoricalData) {
    const { labels, data } = getPriceChartDataWithLiveTip();
    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = data;
    
    // For 1H, keep y-axis locked to prevent vertical jitter
    if (priceChartTimeframe === '1h') {
      applyYAxisLock();
    }
    
    priceChart.update('none'); // No animation for silent refresh
    updateLiveIndicator();
  }
  
  setTimeout(refreshPriceChart, getChartRefreshInterval());
}

setTimeout(refreshPriceChart, getChartRefreshInterval());

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

