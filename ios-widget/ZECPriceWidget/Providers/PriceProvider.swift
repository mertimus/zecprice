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
                // On error, use cached data or placeholder
                let entry = PriceEntry(date: Date(), data: .placeholder, isPlaceholder: true)
                let nextUpdate = Calendar.current.date(byAdding: .minute, value: 5, to: Date())!
                let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
                completion(timeline)
            }
        }
    }

    /// Fetches current ZEC price data from API
    private func fetchPriceData() async throws -> PriceData {
        // Binance API for current price
        let tickerURL = URL(string: "https://api.binance.com/api/v3/ticker/24hr?symbol=ZECUSDT")!
        let (tickerData, _) = try await URLSession.shared.data(from: tickerURL)
        let ticker = try JSONDecoder().decode(BinanceTicker.self, from: tickerData)

        // Klines for sparkline (last 24 hours, 2-hour intervals)
        let klinesURL = URL(string: "https://api.binance.com/api/v3/klines?symbol=ZECUSDT&interval=2h&limit=12")!
        let (klinesData, _) = try await URLSession.shared.data(from: klinesURL)
        let klines = try JSONDecoder().decode([[KlineValue]].self, from: klinesData)
        let sparkline = klines.compactMap { $0[4].doubleValue } // Close prices

        // Shielded pool data from your API
        let shieldedURL = URL(string: "https://zecprice.com/api/shielded")!
        let (shieldedData, _) = try await URLSession.shared.data(from: shieldedURL)
        let shielded = try JSONDecoder().decode(ShieldedResponse.self, from: shieldedData)

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

struct ShieldedResponse: Codable {
    let percent: Double
    let amount: Double
    let change24h: Double
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
