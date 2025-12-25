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

// Colors are defined in Assets/Colors.xcassets and auto-generated

// MARK: - Preview Provider

#Preview("All Sizes", as: .systemSmall) {
    ZECPriceWidget()
} timeline: {
    PriceEntry(date: Date(), data: .sample, isPlaceholder: false)
}
