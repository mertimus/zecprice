import SwiftUI
import WidgetKit

/// Large widget view (329 x 345 pt)
/// Shows: Price, Chart, Shielded Pool data
struct LargeWidgetView: View {
    let entry: PriceEntry

    var body: some View {
        ZStack {
            // Pure black background
            Color.black

            VStack(alignment: .leading, spacing: 0) {
                // Header
                HStack(alignment: .center) {
                    Text("ZEC/USD")
                        .font(.system(size: 12, weight: .medium))
                        .tracking(1)
                        .foregroundColor(.white.opacity(0.5))

                    Spacer()

                    // Live indicator
                    HStack(spacing: 6) {
                        Circle()
                            .fill(Color.white.opacity(0.5))
                            .frame(width: 5, height: 5)

                        Text("LIVE")
                            .font(.system(size: 10, weight: .medium))
                            .tracking(1)
                            .foregroundColor(.white.opacity(0.4))
                    }
                }

                Spacer()
                    .frame(height: 8)

                // Price section
                VStack(alignment: .leading, spacing: 4) {
                    // Main price
                    if entry.isPlaceholder {
                        Text("$--.--")
                            .font(.system(size: 48, weight: .semibold, design: .rounded))
                            .foregroundColor(.white.opacity(0.3))
                    } else {
                        Text(entry.data.formattedPrice)
                            .font(.system(size: 48, weight: .semibold, design: .rounded))
                            .tracking(-1)
                            .foregroundColor(.white)
                            .minimumScaleFactor(0.7)
                            .lineLimit(1)
                    }

                    // Change row
                    HStack(spacing: 8) {
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
                        .foregroundColor(priceChangeColor)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(
                            Capsule()
                                .fill(priceChangeColor.opacity(0.15))
                                .overlay(
                                    Capsule()
                                        .strokeBorder(priceChangeColor.opacity(0.3), lineWidth: 1)
                                )
                        )

                        Text("(24h)")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.white.opacity(0.4))
                    }
                }

                Spacer()
                    .frame(height: 16)

                // Chart
                LargeSparklineView(
                    dataPoints: entry.isPlaceholder ? [] : entry.data.sparkline,
                    isPositive: entry.data.isPositiveChange
                )
                .frame(height: 100)
                .opacity(entry.isPlaceholder ? 0.3 : 1)

                Spacer()
                    .frame(height: 16)

                // Separator
                Rectangle()
                    .fill(Color.white.opacity(0.1))
                    .frame(height: 1)

                Spacer()
                    .frame(height: 16)

                // Shielded Pool Section
                VStack(alignment: .leading, spacing: 8) {
                    // Header
                    Text("SHIELDED POOL")
                        .font(.system(size: 10, weight: .medium))
                        .tracking(2)
                        .foregroundColor(.white.opacity(0.4))

                    // Main row
                    HStack(alignment: .firstTextBaseline) {
                        // Percentage
                        if entry.isPlaceholder {
                            Text("--.-%")
                                .font(.system(size: 28, weight: .semibold, design: .rounded))
                                .foregroundColor(.white.opacity(0.3))
                        } else {
                            Text(entry.data.formattedShieldedPercent)
                                .font(.system(size: 28, weight: .semibold, design: .rounded))
                                .foregroundColor(.white)
                        }

                        Spacer()

                        // Amount
                        if !entry.isPlaceholder {
                            HStack(alignment: .firstTextBaseline, spacing: 4) {
                                Text(entry.data.formattedShieldedAmount)
                                    .font(.system(size: 16, weight: .medium, design: .rounded))
                                    .foregroundColor(.white.opacity(0.7))

                                Text("ZEC")
                                    .font(.system(size: 12, weight: .medium))
                                    .tracking(1)
                                    .foregroundColor(.white.opacity(0.5))
                            }
                        }
                    }

                    // Shielded change
                    HStack(spacing: 8) {
                        HStack(spacing: 4) {
                            if !entry.isPlaceholder {
                                Image(systemName: entry.data.isPositiveShieldedChange ? "arrow.up" : "arrow.down")
                                    .font(.system(size: 9, weight: .semibold))

                                Text(entry.data.formattedShieldedChange)
                                    .font(.system(size: 12, weight: .medium))
                                    .tracking(0.3)
                            } else {
                                Text("--.--% ")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundColor(.white.opacity(0.3))
                            }
                        }
                        .foregroundColor(shieldedChangeColor)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            Capsule()
                                .fill(shieldedChangeColor.opacity(0.15))
                                .overlay(
                                    Capsule()
                                        .strokeBorder(shieldedChangeColor.opacity(0.3), lineWidth: 1)
                                )
                        )

                        Text("(24h)")
                            .font(.system(size: 11, weight: .regular))
                            .foregroundColor(.white.opacity(0.4))
                    }
                }

                Spacer()
            }
            .padding(16)
        }
    }

    private var priceChangeColor: Color {
        guard !entry.isPlaceholder else { return .white.opacity(0.4) }
        return entry.data.isPositiveChange ? Color.zecGreen : Color.zecRed
    }

    private var shieldedChangeColor: Color {
        guard !entry.isPlaceholder else { return .white.opacity(0.4) }
        return entry.data.isPositiveShieldedChange ? Color.zecGreen : Color.zecRed
    }
}

/// Larger sparkline chart for the large widget
struct LargeSparklineView: View {
    let dataPoints: [Double]
    let isPositive: Bool

    var body: some View {
        GeometryReader { geometry in
            if dataPoints.count >= 2 {
                let minVal = dataPoints.min() ?? 0
                let maxVal = dataPoints.max() ?? 1
                let range = max(maxVal - minVal, 0.01)

                ZStack {
                    // Gradient fill
                    Path { path in
                        path.move(to: CGPoint(x: 0, y: geometry.size.height))

                        for (index, point) in dataPoints.enumerated() {
                            let x = geometry.size.width * CGFloat(index) / CGFloat(dataPoints.count - 1)
                            let y = geometry.size.height * (1 - CGFloat((point - minVal) / range))
                            path.addLine(to: CGPoint(x: x, y: y))
                        }

                        path.addLine(to: CGPoint(x: geometry.size.width, y: geometry.size.height))
                        path.closeSubpath()
                    }
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.white.opacity(0.12),
                                Color.white.opacity(0.02)
                            ]),
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                    // Main line
                    Path { path in
                        for (index, point) in dataPoints.enumerated() {
                            let x = geometry.size.width * CGFloat(index) / CGFloat(dataPoints.count - 1)
                            let y = geometry.size.height * (1 - CGFloat((point - minVal) / range))

                            if index == 0 {
                                path.move(to: CGPoint(x: x, y: y))
                            } else {
                                path.addLine(to: CGPoint(x: x, y: y))
                            }
                        }
                    }
                    .stroke(Color.white.opacity(0.7), lineWidth: 2)

                    // Current price dot with glow effect
                    if let lastPoint = dataPoints.last {
                        let x = geometry.size.width
                        let y = geometry.size.height * (1 - CGFloat((lastPoint - minVal) / range))

                        // Outer glow
                        Circle()
                            .fill(Color.white.opacity(0.2))
                            .frame(width: 16, height: 16)
                            .position(x: x, y: y)

                        // Inner dot
                        Circle()
                            .fill(Color.white)
                            .frame(width: 8, height: 8)
                            .position(x: x, y: y)
                    }
                }
            } else {
                // Placeholder
                VStack {
                    Spacer()
                    Rectangle()
                        .fill(Color.white.opacity(0.1))
                        .frame(height: 1)
                    Spacer()
                }
            }
        }
    }
}

#Preview("Large - Positive", as: .systemLarge) {
    ZECPriceWidget()
} timeline: {
    PriceEntry(date: Date(), data: .sample, isPlaceholder: false)
}

#Preview("Large - Negative", as: .systemLarge) {
    ZECPriceWidget()
} timeline: {
    PriceEntry(date: Date(), data: .sampleNegative, isPlaceholder: false)
}
