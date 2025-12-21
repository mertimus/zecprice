// ZEC Price App
const API_KEY = 'CG-6CM3isvQQP4nPqrW5iVR6hdC';
const API_BASE = 'https://pro-api.coingecko.com/api/v3';
const COINGECKO_PRICE_URL = `${API_BASE}/simple/price?ids=zcash&vs_currencies=usd`;
const COINGECKO_CHART_URL = `${API_BASE}/coins/zcash/market_chart?vs_currency=usd&days=365`;

const headers = {
  'x-cg-pro-api-key': API_KEY
};

const priceEl = document.getElementById('price');
const chartCanvas = document.getElementById('chart');
const liveIndicator = document.getElementById('live-indicator');

let chart = null;

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

// Fetch current ZEC price
async function fetchPrice() {
  try {
    const res = await fetch(COINGECKO_PRICE_URL, { headers });
    const data = await res.json();
    return data.zcash.usd;
  } catch (err) {
    console.error('Failed to fetch price:', err);
    return null;
  }
}

// Fetch 1 year chart data
async function fetchChartData() {
  try {
    const res = await fetch(COINGECKO_CHART_URL, { headers });
    const data = await res.json();
    return data.prices; // [[timestamp, price], ...]
  } catch (err) {
    console.error('Failed to fetch chart data:', err);
    return null;
  }
}

// Update displayed price with animation
async function updatePrice() {
  priceEl.classList.add('updating');
  
  const price = await fetchPrice();
  
  setTimeout(() => {
    if (price !== null) {
      priceEl.textContent = formatPrice(price);
    }
    priceEl.classList.remove('updating');
  }, 150);
}

// Initialize or update chart
async function updateChart() {
  const prices = await fetchChartData();
  if (!prices) return;

  const labels = prices.map(p => new Date(p[0]));
  const data = prices.map(p => p[1]);

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets[0].data = data;
    chart.update('none');
    updateLiveIndicator();
  } else {
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
          tooltip: { enabled: false }
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
}

// Initial load
updatePrice();
updateChart();

// Update price and chart every 1 second
setInterval(updatePrice, 1000);
setInterval(updateChart, 1000);

