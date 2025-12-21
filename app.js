// ZEC Price App
const COINGECKO_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=zcash&vs_currencies=usd';
const COINGECKO_CHART_URL = 'https://api.coingecko.com/api/v3/coins/zcash/market_chart?vs_currency=usd&days=365';

const priceEl = document.getElementById('price');
const chartCanvas = document.getElementById('chart');

let chart = null;

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
    const res = await fetch(COINGECKO_PRICE_URL);
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
    const res = await fetch(COINGECKO_CHART_URL);
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
          duration: 0
        }
      }
    });
  }
}

// Initial load
updatePrice();
updateChart();

// Update price every 1 second
setInterval(updatePrice, 1000);

// Update chart every 60 seconds (API rate limits)
setInterval(updateChart, 60000);

