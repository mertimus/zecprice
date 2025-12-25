import Foundation

/// Represents the price data for ZEC
struct PriceData: Codable {
    let price: Double
    let change24h: Double
    let changePercent24h: Double
    let high24h: Double
    let low24h: Double
    let lastUpdated: Date

    /// Sparkline data points for mini chart
    let sparkline: [Double]

    /// Shielded pool data
    let shieldedPercent: Double
    let shieldedAmount: Double
    let shieldedChange24h: Double

    var formattedPrice: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: price)) ?? "$0.00"
    }

    var formattedChange: String {
        let sign = changePercent24h >= 0 ? "+" : ""
        return String(format: "%@%.2f%%", sign, changePercent24h)
    }

    var formattedShieldedAmount: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: shieldedAmount)) ?? "0"
    }

    var formattedShieldedPercent: String {
        return String(format: "%.1f%%", shieldedPercent)
    }

    var formattedShieldedChange: String {
        let sign = shieldedChange24h >= 0 ? "+" : ""
        return String(format: "%@%.2f%%", sign, shieldedChange24h)
    }

    var isPositiveChange: Bool {
        changePercent24h >= 0
    }

    var isPositiveShieldedChange: Bool {
        shieldedChange24h >= 0
    }

    var relativeUpdateTime: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: lastUpdated, relativeTo: Date())
    }

    /// Sample data for previews
    static let sample = PriceData(
        price: 48.23,
        change24h: 1.12,
        changePercent24h: 2.34,
        high24h: 49.50,
        low24h: 46.80,
        lastUpdated: Date(),
        sparkline: [45.2, 46.1, 45.8, 47.2, 46.9, 48.0, 47.5, 48.2, 48.1, 48.23],
        shieldedPercent: 23.4,
        shieldedAmount: 1234567,
        shieldedChange24h: 0.12
    )

    /// Sample data showing negative change
    static let sampleNegative = PriceData(
        price: 45.67,
        change24h: -2.56,
        changePercent24h: -5.31,
        high24h: 48.50,
        low24h: 44.20,
        lastUpdated: Date(),
        sparkline: [48.5, 47.8, 48.2, 47.0, 46.5, 45.8, 46.2, 45.9, 45.5, 45.67],
        shieldedPercent: 23.2,
        shieldedAmount: 1232000,
        shieldedChange24h: -0.08
    )

    /// Placeholder data for loading state
    static let placeholder = PriceData(
        price: 0,
        change24h: 0,
        changePercent24h: 0,
        high24h: 0,
        low24h: 0,
        lastUpdated: Date(),
        sparkline: [],
        shieldedPercent: 0,
        shieldedAmount: 0,
        shieldedChange24h: 0
    )
}
