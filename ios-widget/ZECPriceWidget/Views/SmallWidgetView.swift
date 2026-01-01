import SwiftUI
import WidgetKit

/// Small widget view (155 x 155 pt)
/// Shows: Ticker, Price, Change percentage
struct SmallWidgetView: View {
    let entry: PriceEntry

    var body: some View {
        ZStack {
            // Pure black background
            Color.black

            VStack(alignment: .leading, spacing: 0) {
                // Header: Ticker
                HStack {
                    Text("ZEC")
                        .font(.system(size: 12, weight: .medium))
                        .tracking(2)
                        .foregroundColor(.white.opacity(0.5))

                    Spacer()

                    // Live indicator dot
                    Circle()
                        .fill(Color.white.opacity(0.4))
                        .frame(width: 6, height: 6)
                }

                Spacer()

                // Main price
                if entry.isPlaceholder {
                    Text("$--.--")
                        .font(.system(size: 28, weight: .semibold, design: .rounded))
                        .foregroundColor(.white.opacity(0.3))
                        .redacted(reason: .placeholder)
                } else {
                    Text(entry.data.formattedPrice)
                        .font(.system(size: 28, weight: .semibold, design: .rounded))
                        .tracking(-0.5)
                        .foregroundColor(.white)
                        .minimumScaleFactor(0.8)
                        .lineLimit(1)
                }

                Spacer()
                    .frame(height: 8)

                // Change pill
                HStack(spacing: 4) {
                    if !entry.isPlaceholder {
                        Image(systemName: entry.data.isPositiveChange ? "arrow.up" : "arrow.down")
                            .font(.system(size: 10, weight: .semibold))

                        Text(entry.data.formattedChange)
                            .font(.system(size: 13, weight: .medium))
                            .tracking(0.3)
                    } else {
                        Text("--.--% ")
                            .font(.system(size: 13, weight: .medium))
                            .foregroundColor(.white.opacity(0.3))
                    }
                }
                .foregroundColor(changeColor)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(
                    Capsule()
                        .fill(changeColor.opacity(0.15))
                        .overlay(
                            Capsule()
                                .strokeBorder(changeColor.opacity(0.3), lineWidth: 1)
                        )
                )

                Spacer()

                // Footer: Last updated
                HStack {
                    Spacer()
                    if !entry.isPlaceholder {
                        Text(entry.data.relativeUpdateTime)
                            .font(.system(size: 10, weight: .regular))
                            .foregroundColor(.white.opacity(0.4))
                    }
                }
            }
            .padding(16)
        }
    }

    private var changeColor: Color {
        guard !entry.isPlaceholder else { return .white.opacity(0.4) }
        return entry.data.isPositiveChange ? Color.zecGreen : Color.zecRed
    }
}

#Preview("Small - Positive", as: .systemSmall) {
    ZECPriceWidget()
} timeline: {
    PriceEntry(date: Date(), data: .sample, isPlaceholder: false)
}

#Preview("Small - Negative", as: .systemSmall) {
    ZECPriceWidget()
} timeline: {
    PriceEntry(date: Date(), data: .sampleNegative, isPlaceholder: false)
}

#Preview("Small - Placeholder", as: .systemSmall) {
    ZECPriceWidget()
} timeline: {
    PriceEntry(date: Date(), data: .placeholder, isPlaceholder: true)
}
