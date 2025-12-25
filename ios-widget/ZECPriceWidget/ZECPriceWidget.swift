import WidgetKit
import SwiftUI

/// Main widget definition for ZEC Price
@main
struct ZECPriceWidget: Widget {
    let kind: String = "ZECPriceWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PriceProvider()) { entry in
            ZECPriceWidgetEntryView(entry: entry)
                .containerBackground(.black, for: .widget)
        }
        .configurationDisplayName("ZEC Price")
        .description("Track Zcash price and shielded pool statistics in real-time.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

/// Entry view that switches between widget sizes
struct ZECPriceWidgetEntryView: View {
    @Environment(\.widgetFamily) var family
    let entry: PriceEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemMedium:
            MediumWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            MediumWidgetView(entry: entry)
        }
    }
}

// MARK: - Color Extensions

extension Color {
    /// ZEC brand green for positive changes
    /// Matches web: #22c55e
    static let zecGreen = Color(red: 34/255, green: 197/255, blue: 94/255)

    /// ZEC brand red for negative changes
    /// Matches web: #ef4444
    static let zecRed = Color(red: 239/255, green: 68/255, blue: 68/255)

    /// Widget background - pure black
    static let zecBackground = Color.black

    /// Primary text color
    static let zecPrimary = Color.white

    /// Secondary text color (50% opacity white)
    static let zecSecondary = Color.white.opacity(0.5)

    /// Tertiary text color (40% opacity white)
    static let zecTertiary = Color.white.opacity(0.4)
}

// MARK: - Preview Provider

#Preview("All Sizes", as: .systemSmall) {
    ZECPriceWidget()
} timeline: {
    PriceEntry(date: Date(), data: .sample, isPlaceholder: false)
}
