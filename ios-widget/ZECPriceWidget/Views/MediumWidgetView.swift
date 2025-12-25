import SwiftUI
import WidgetKit

/// Medium widget view (329 x 155 pt)
/// Shows: Trading pair, Price, Change, Sparkline chart
struct MediumWidgetView: View {
    let entry: PriceEntry

    var body: some View {
        ZStack {
            // Pure black background
            Color.black

            VStack(alignment: .leading, spacing: 0) {
                // Header row
                HStack(alignment: .center) {
                    // Trading pair
                    Text("ZEC/USD")
                        .font(.system(size: 12, weight: .medium))
                        .tracking(1)
                        .foregroundColor(.white.opacity(0.5))

                    Spacer()

                    // Timeframe + Live indicator
                    HStack(spacing: 6) {
                        Text("24h")
                            .font(.system(size: 11, weight: .regular))
                            .foregroundColor(.white.opacity(0.4))

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
                    .frame(height: 12)

                // Price row
                HStack(alignment: .firstTextBaseline, spacing: 16) {
                    // Main price
                    if entry.isPlaceholder {
                        Text("$--.--")
                            .font(.system(size: 36, weight: .semibold, design: .rounded))
                            .foregroundColor(.white.opacity(0.3))
                    } else {
                        Text(entry.data.formattedPrice)
                            .font(.system(size: 36, weight: .semibold, design: .rounded))
                            .tracking(-0.5)
                            .foregroundColor(.white)
                            .minimumScaleFactor(0.7)
                            .lineLimit(1)
                    }

                    Spacer()

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
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(
                        Capsule()
                            .fill(changeColor.opacity(0.15))
                            .overlay(
                                Capsule()
                                    .strokeBorder(changeColor.opacity(0.3), lineWidth: 1)
                            )
                    )
                }

                Spacer()

                // Sparkline chart
                SparklineView(
                    dataPoints: entry.isPlaceholder ? [] : entry.data.sparkline,
                    isPositive: entry.data.isPositiveChange
                )
                .frame(height: 40)
                .opacity(entry.isPlaceholder ? 0.3 : 0.8)
            }
            .padding(16)
        }
    }

    private var changeColor: Color {
        guard !entry.isPlaceholder else { return .white.opacity(0.4) }
        return entry.data.isPositiveChange ? Color.zecGreen : Color.zecRed
    }
}

/// Minimal sparkline chart component
struct SparklineView: View {
    let dataPoints: [Double]
    let isPositive: Bool

    var body: some View {
        GeometryReader { geometry in
            if dataPoints.count >= 2 {
                let minVal = dataPoints.min() ?? 0
                let maxVal = dataPoints.max() ?? 1
                let range = max(maxVal - minVal, 0.01)

                ZStack {
                    // Gradient fill under the line
                    Path { path in
                        path.move(to: CGPoint(x: 0, y: geometry.size.height))

                        for (index, point) in dataPoints.enumerated() {
                            let x = geometry.size.width * CGFloat(index) / CGFloat(dataPoints.count - 1)
                            let y = geometry.size.height * (1 - CGFloat((point - minVal) / range))
                            if index == 0 {
                                path.addLine(to: CGPoint(x: x, y: y))
                            } else {
                                path.addLine(to: CGPoint(x: x, y: y))
                            }
                        }

                        path.addLine(to: CGPoint(x: geometry.size.width, y: geometry.size.height))
                        path.closeSubpath()
                    }
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.white.opacity(0.15),
                                Color.white.opacity(0.02)
                            ]),
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )

                    // Line stroke
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
                    .stroke(Color.white.opacity(0.6), lineWidth: 1.5)

                    // Current price indicator dot
                    if let lastPoint = dataPoints.last {
                        let x = geometry.size.width
                        let y = geometry.size.height * (1 - CGFloat((lastPoint - minVal) / range))

                        Circle()
                            .fill(Color.white)
                            .frame(width: 6, height: 6)
                            .position(x: x, y: y)
                    }
                }
            } else {
                // Placeholder line
                Rectangle()
                    .fill(Color.white.opacity(0.1))
                    .frame(height: 1)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
        }
    }
}

#Preview("Medium - Positive", as: .systemMedium) {
    ZECPriceWidget()
} timeline: {
    PriceEntry(date: Date(), data: .sample, isPlaceholder: false)
}

#Preview("Medium - Negative", as: .systemMedium) {
    ZECPriceWidget()
} timeline: {
    PriceEntry(date: Date(), data: .sampleNegative, isPlaceholder: false)
}
