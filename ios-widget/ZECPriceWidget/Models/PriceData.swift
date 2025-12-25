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

    /// Sample data for previews (realistic current ZEC prices ~$440)
    static let sample = PriceData(
        price: 440.38,
        change24h: -2.08,
        changePercent24h: -0.47,
        high24h: 448.50,
        low24h: 432.20,
        lastUpdated: Date(),
        sparkline: [435.2, 438.1, 442.8, 445.2, 443.9, 440.0, 438.5, 441.2, 439.1, 440.38],
        shieldedPercent: 23.4,
        shieldedAmount: 4200000,
        shieldedChange24h: 0.12
    )

    /// Sample data showing negative change
    static let sampleNegative = PriceData(
        price: 428.67,
        change24h: -12.56,
        changePercent24h: -2.85,
        high24h: 445.50,
        low24h: 425.20,
        lastUpdated: Date(),
        sparkline: [442.5, 440.8, 438.2, 435.0, 432.5, 430.8, 429.2, 428.9, 428.5, 428.67],
        shieldedPercent: 23.2,
        shieldedAmount: 4180000,
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
