import WidgetKit
import Foundation

/// Timeline provider for the ZEC Price widget
struct PriceProvider: TimelineProvider {

    /// Placeholder entry shown during loading
    func placeholder(in context: Context) -> PriceEntry {
        PriceEntry(date: Date(), data: .placeholder, isPlaceholder: true)
    }

    /// Snapshot for widget gallery preview
    func getSnapshot(in context: Context, completion: @escaping (PriceEntry) -> Void) {
        let entry = PriceEntry(date: Date(), data: .sample, isPlaceholder: false)
        completion(entry)
    }

    /// Generates timeline with price updates
    func getTimeline(in context: Context, completion: @escaping (Timeline<PriceEntry>) -> Void) {
        Task {
            do {
                let data = try await fetchPriceData()
                let entry = PriceEntry(date: Date(), data: data, isPlaceholder: false)

                // Refresh every 15 minutes
                let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
                let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
                completion(timeline)
            } catch {
                print("Widget fetch error: \(error)")
                // On error, use sample data so widget still looks good
                let entry = PriceEntry(date: Date(), data: .sample, isPlaceholder: false)
                let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
                let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
                completion(timeline)
            }
        }
    }

    /// Fetches current ZEC price data from APIs
    private func fetchPriceData() async throws -> PriceData {
        // Fetch all data concurrently
        async let tickerTask = fetchBinanceTicker()
        async let klinesTask = fetchBinanceKlines()
        async let shieldedTask = fetchShieldedData()

        let (ticker, sparkline, shielded) = try await (tickerTask, klinesTask, shieldedTask)

        return PriceData(
            price: Double(ticker.lastPrice) ?? 0,
            change24h: Double(ticker.priceChange) ?? 0,
            changePercent24h: Double(ticker.priceChangePercent) ?? 0,
            high24h: Double(ticker.highPrice) ?? 0,
            low24h: Double(ticker.lowPrice) ?? 0,
            lastUpdated: Date(),
            sparkline: sparkline,
            shieldedPercent: shielded.percent,
            shieldedAmount: shielded.amount,
            shieldedChange24h: shielded.change24h
        )
    }

    /// Fetch 24hr ticker from Binance
    private func fetchBinanceTicker() async throws -> BinanceTicker {
        let url = URL(string: "https://api.binance.com/api/v3/ticker/24hr?symbol=ZECUSDT")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(BinanceTicker.self, from: data)
    }

    /// Fetch klines for sparkline chart from Binance
    private func fetchBinanceKlines() async throws -> [Double] {
        let url = URL(string: "https://api.binance.com/api/v3/klines?symbol=ZECUSDT&interval=2h&limit=12")!
        let (data, _) = try await URLSession.shared.data(from: url)
        let klines = try JSONDecoder().decode([[KlineValue]].self, from: data)
        return klines.compactMap { $0[4].doubleValue } // Close prices (index 4)
    }

    /// Fetch shielded pool data from zecprice.com
    private func fetchShieldedData() async throws -> ShieldedData {
        // Fetch the shielded pool JSON from the hosted site
        let shieldedURL = URL(string: "https://zecprice.com/shielded-pool-data.json")!
        let (shieldedData, _) = try await URLSession.shared.data(from: shieldedURL)
        let poolData = try JSONDecoder().decode(ShieldedPoolResponse.self, from: shieldedData)

        // Get latest shielded value from the data
        guard let latestPoint = poolData.data.last else {
            return ShieldedData(percent: 0, amount: 0, change24h: 0)
        }

        let shieldedAmount = latestPoint.v

        // Fetch circulating supply from CoinGecko
        let geckoURL = URL(string: "https://api.coingecko.com/api/v3/coins/zcash")!
        let (geckoData, _) = try await URLSession.shared.data(from: geckoURL)
        let geckoResponse = try JSONDecoder().decode(CoinGeckoResponse.self, from: geckoData)

        let circulatingSupply = geckoResponse.market_data.circulating_supply
        let shieldedPercent = circulatingSupply > 0 ? (shieldedAmount / circulatingSupply) * 100 : 0

        // Calculate 24h change (find data point from ~24h ago)
        let oneDayAgo = Date().timeIntervalSince1970 - (24 * 60 * 60)
        let oldPoint = poolData.data.last { Double($0.t) < oneDayAgo } ?? poolData.data.first
        let change24h: Double
        if let old = oldPoint, old.v > 0 {
            change24h = ((shieldedAmount - old.v) / old.v) * 100
        } else {
            change24h = 0
        }

        return ShieldedData(
            percent: shieldedPercent,
            amount: shieldedAmount,
            change24h: change24h
        )
    }
}

/// Timeline entry for the widget
struct PriceEntry: TimelineEntry {
    let date: Date
    let data: PriceData
    let isPlaceholder: Bool
}

// MARK: - API Response Models

struct BinanceTicker: Codable {
    let lastPrice: String
    let priceChange: String
    let priceChangePercent: String
    let highPrice: String
    let lowPrice: String
}

struct ShieldedData {
    let percent: Double
    let amount: Double
    let change24h: Double
}

/// Response from shielded-pool-data.json
struct ShieldedPoolResponse: Codable {
    let meta: ShieldedMeta
    let data: [ShieldedDataPoint]
}

struct ShieldedMeta: Codable {
    let generated: String
    let dataPoints: Int
}

struct ShieldedDataPoint: Codable {
    let t: Int      // timestamp
    let h: Int      // block height
    let v: Double   // total shielded value
}

/// CoinGecko response for circulating supply
struct CoinGeckoResponse: Codable {
    let market_data: CoinGeckoMarketData
}

struct CoinGeckoMarketData: Codable {
    let circulating_supply: Double
}

/// Handles mixed types in Binance klines response
enum KlineValue: Codable {
    case string(String)
    case int(Int)

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let intVal = try? container.decode(Int.self) {
            self = .int(intVal)
            return
        }
        if let stringVal = try? container.decode(String.self) {
            self = .string(stringVal)
            return
        }
        throw DecodingError.typeMismatch(
            KlineValue.self,
            DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Expected String or Int")
        )
    }

    var doubleValue: Double? {
        switch self {
        case .string(let str): return Double(str)
        case .int(let num): return Double(num)
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let str): try container.encode(str)
        case .int(let num): try container.encode(num)
        }
    }
}
