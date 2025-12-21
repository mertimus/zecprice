// ZEC Price App

// Binance WebSocket for real-time price
const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/zecusdt@trade';

// CoinGecko for historical chart data
const API_KEY = 'CG-6CM3isvQQP4nPqrW5iVR6hdC';
const API_BASE = 'https://pro-api.coingecko.com/api/v3';
const COINGECKO_CHART_URL = `${API_BASE}/coins/zcash/market_chart?vs_currency=usd&days=365`;

const headers = {
  'x-cg-pro-api-key': API_KEY
};

const priceEl = document.getElementById('price');
const chartCanvas = document.getElementById('chart');
const liveIndicator = document.getElementById('live-indicator');
const container = document.querySelector('.container');
const splash = document.getElementById('splash');

let chart = null;
let historicalData = null;  // CoinGecko data
let livePrice = null;       // Current Binance price
let previousPrice = null;   // For tracking direction
let isReady = false;        // Has first price loaded?

// Update live indicator position
function updateLiveIndicator() {
  if (!chart || !chart.data.datasets[0].data.length) return;
  
  const meta = chart.getDatasetMeta(0);
  const lastPoint = meta.data[meta.data.length - 1];
  
  if (lastPoint) {
    liveIndicator.style.left = `${lastPoint.x}px`;
    liveIndicator.style.top = `${lastPoint.y}px`;
  }
}

// Format price with commas and 2 decimal places
function formatPrice(price) {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Current displayed characters
let currentChars = [];

// Create rolling digit HTML
function createDigitSlot(char, index) {
  const slot = document.createElement('span');
  slot.className = 'digit-slot';
  slot.dataset.index = index;
  
  const roll = document.createElement('span');
  roll.className = 'digit-roll';
  
  // For digits, create a column of 0-9
  if (/\d/.test(char)) {
    for (let i = 0; i <= 9; i++) {
      const span = document.createElement('span');
      span.textContent = i;
      roll.appendChild(span);
    }
    roll.style.transform = `translateY(-${parseInt(char) * (100 / 10)}%)`;
  } else {
    // For non-digits (comma, period), just show the character
    const span = document.createElement('span');
    span.textContent = char;
    roll.appendChild(span);
  }
  
  slot.appendChild(roll);
  return slot;
}

// Update price with rolling animation
function updatePriceDisplay(newPrice) {
  const newChars = newPrice.split('');
  
  // If structure changed (different length), rebuild
  if (newChars.length !== currentChars.length) {
    priceEl.innerHTML = '';
    newChars.forEach((char, i) => {
      priceEl.appendChild(createDigitSlot(char, i));
    });
    currentChars = newChars;
    return;
  }
  
  // Update only changed digits with roll animation
  const slots = priceEl.querySelectorAll('.digit-slot');
  newChars.forEach((char, i) => {
    if (char !== currentChars[i]) {
      const roll = slots[i].querySelector('.digit-roll');
      if (/\d/.test(char)) {
        roll.style.transform = `translateY(-${parseInt(char) * (100 / 10)}%)`;
      }
    }
  });
  
  currentChars = newChars;
}

// Connect to Binance WebSocket for real-time price
function connectPriceStream() {
  const ws = new WebSocket(BINANCE_WS_URL);
  
  ws.onmessage = (event) => {
    const trade = JSON.parse(event.data);
    const price = parseFloat(trade.p);
    
    // Flash color on price change
    if (previousPrice !== null && price !== previousPrice) {
      priceEl.classList.remove('flash-up', 'flash-down');
      // Force reflow to restart transition
      void priceEl.offsetWidth;
      priceEl.classList.add(price > previousPrice ? 'flash-up' : 'flash-down');
      
      // Remove class after animation
      setTimeout(() => {
        priceEl.classList.remove('flash-up', 'flash-down');
      }, 600);
    }
    
    previousPrice = price;
    livePrice = price;
    updatePriceDisplay(formatPrice(price));
    updateChartLiveTip();
    
    // Update browser tab title
    document.title = `$${formatPrice(price)} · ZEC`;
    
    // Reveal UI on first price
    if (!isReady) {
      isReady = true;
      // Fade out splash
      splash.classList.add('fade-out');
      // After splash fades, show main UI
      setTimeout(() => {
        container.classList.add('ready');
      }, 600);
    }
  };
  
  ws.onclose = () => {
    // Reconnect after 1 second if connection drops
    setTimeout(connectPriceStream, 1000);
  };
  
  ws.onerror = (err) => {
    console.error('WebSocket error:', err);
    ws.close();
  };
}

// Fetch 1 year chart data
async function fetchChartData() {
  try {
    const res = await fetch(COINGECKO_CHART_URL, { headers });
    const data = await res.json();
    historicalData = data.prices; // [[timestamp, price], ...]
    return historicalData;
  } catch (err) {
    console.error('Failed to fetch chart data:', err);
    return null;
  }
}

// Get chart data with live tip appended
function getChartDataWithLiveTip() {
  if (!historicalData) return { labels: [], data: [] };
  
  const labels = historicalData.map(p => new Date(p[0]));
  const data = historicalData.map(p => p[1]);
  
  // Append live price as the rightmost point
  if (livePrice !== null) {
    labels.push(new Date());
    data.push(livePrice);
  }
  
  return { labels, data };
}

// Update just the live tip of the chart (called on every price update)
function updateChartLiveTip() {
  if (!chart || !historicalData) return;
  
  const { labels, data } = getChartDataWithLiveTip();
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.update('none');
  updateLiveIndicator();
}

// Initialize chart with historical data
async function initChart() {
  await fetchChartData();
  if (!historicalData) return;

  const { labels, data } = getChartDataWithLiveTip();

  chart = new Chart(chartCanvas, {
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

// Refresh historical data periodically
async function refreshHistoricalData() {
  await fetchChartData();
  updateChartLiveTip();
}

// Initial load
connectPriceStream();
initChart();

// Refresh historical data every 5 minutes (the live tip updates in real-time)
setInterval(refreshHistoricalData, 5 * 60 * 1000);

