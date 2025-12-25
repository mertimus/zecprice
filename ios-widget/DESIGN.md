# ZEC Price iOS Widget Design Specification

## Design Philosophy

The iOS widget maintains the **Minimalist Luxury** aesthetic of the web dashboard:
- Pure black background with white typography
- Strategic use of opacity for visual hierarchy
- Green/red accent colors for price changes
- Clean, data-focused presentation
- Premium feel with subtle visual refinements

---

## Color System

### Core Colors
| Name | Hex | Usage |
|------|-----|-------|
| Background | `#000000` | Widget background |
| Primary Text | `#FFFFFF` | Price values, main content |
| Secondary Text | `#FFFFFF` @ 50% | Labels, tickers |
| Tertiary Text | `#FFFFFF` @ 40% | Timestamps, subtle info |
| Up/Positive | `#22C55E` | Positive price changes |
| Down/Negative | `#EF4444` | Negative price changes |
| Subtle Border | `#FFFFFF` @ 10% | Separator lines, pill backgrounds |

### Opacity Scale
```
100% - Primary values (price)
 70% - Important labels
 50% - Secondary labels (ticker symbols)
 40% - Tertiary info (timestamps)
 20% - Subtle borders
 10% - Pill backgrounds
  5% - Micro separators
```

---

## Typography

### Font Family
**SF Pro Display** (system font) - matches Inter's clean geometric style

### Type Scale
| Element | Size | Weight | Letter Spacing |
|---------|------|--------|----------------|
| Price (Large Widget) | 48pt | Semibold | -0.02em |
| Price (Medium Widget) | 36pt | Semibold | -0.02em |
| Price (Small Widget) | 28pt | Semibold | -0.02em |
| Currency Symbol | 20pt | Regular | 0 |
| Change Percentage | 13pt | Medium | 0.02em |
| Ticker Label | 12pt | Medium | 0.1em |
| Timestamp | 10pt | Regular | 0.02em |

---

## Widget Sizes & Layouts

### Small Widget (155 x 155 pt)

```
┌─────────────────────────────┐
│                             │
│  ZEC                   ▲    │
│  $48.23                     │
│                             │
│  +2.34%                     │
│                    updated  │
└─────────────────────────────┘
```

**Content:**
- Ticker symbol (top-left, subtle)
- Current price (centered, large)
- Change percentage with indicator arrow
- Last updated timestamp (bottom-right, subtle)

**Spacing:**
- Padding: 16pt all sides
- Between price and change: 8pt

---

### Medium Widget (329 x 155 pt)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ZEC/USD                                         24h ▼      │
│                                                             │
│  $48.23                                      +2.34%         │
│                                                             │
│  ─────────────────────────────────────────────────── • LIVE │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Content:**
- Trading pair (top-left)
- Timeframe selector indicator (top-right)
- Current price (left, prominent)
- Change percentage with color (right of price)
- Mini sparkline chart (bottom)
- Live indicator dot

**Spacing:**
- Padding: 16pt all sides
- Chart height: 40pt
- Between price row and chart: 12pt

---

### Large Widget (329 x 345 pt)

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ZEC/USD                                              LIVE  │
│                                                             │
│  $48.23                                                     │
│                                              +2.34% (24h)   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                    PRICE CHART                      │   │
│  │                         ●                           │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  SHIELDED POOL                                              │
│  23.4%             1,234,567 ZEC                            │
│                                              +0.12% (24h)   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Content:**
- Trading pair + Live indicator (header)
- Current price (large)
- 24h change percentage
- Interactive price chart
- Separator line
- Shielded pool section with:
  - Percentage of supply
  - Absolute ZEC amount
  - 24h change

**Spacing:**
- Padding: 16pt all sides
- Chart height: 100pt
- Section separator: 1pt line with 10% opacity
- Between sections: 16pt

---

## Component Details

### Change Pill

A small capsule showing the percentage change:

```
┌──────────────┐
│  ▲ +2.34%    │   Positive (green)
└──────────────┘

┌──────────────┐
│  ▼ -1.23%    │   Negative (red)
└──────────────┘
```

**Styling:**
- Background: Change color @ 15% opacity
- Border: Change color @ 30% opacity, 1pt
- Text: Change color @ 100%
- Corner radius: 12pt (fully rounded)
- Padding: 4pt vertical, 10pt horizontal
- Font: 13pt Medium

### Live Indicator

```
  ● LIVE
```

**Styling:**
- Dot: White with pulsing animation (not in static widget, but color indicates live)
- Text: White @ 50%, 10pt, letter-spacing 0.1em

### Sparkline Chart

A minimal line chart showing price movement:

**Styling:**
- Line: White @ 60%, 1.5pt stroke
- Area fill: Linear gradient from white @ 20% to transparent
- No axes, no labels
- Smooth bezier curves between points

---

## Interactive Elements

### Deep Links
Tapping the widget opens the web app:
- Small: Opens main price view
- Medium: Opens price view with 24h chart
- Large: Opens price view (top) or shielded view (bottom section)

### Widget Configuration (Optional)
Users can configure:
- Default timeframe (1h, 24h, 7d, 30d, 1y)
- Show/hide shielded pool section (large widget)
- Price alert threshold

---

## Animation Considerations

Since iOS widgets are largely static with limited animation support:

1. **Price Updates**: Use "relevance" to show most current data
2. **Timeline Provider**: Refresh every 15 minutes minimum
3. **Redaction**: Design for placeholder state during loading

### Placeholder State
```
┌─────────────────────────────┐
│                             │
│  ZEC                        │
│  $--.--                     │
│                             │
│  --.---%                    │
│                             │
└─────────────────────────────┘
```
- Placeholder text: Light gray rectangles
- Maintains layout structure

---

## Dark Mode Handling

The widget is designed for a pure black aesthetic, which works seamlessly in both light and dark iOS system modes:

- **Dark Mode**: Native appearance, black background blends with system
- **Light Mode**: Widget provides striking contrast, stands out elegantly

No color adjustments needed between modes.

---

## Accessibility

### VoiceOver Labels
- Price: "Zcash price: 48 dollars and 23 cents"
- Change: "Up 2.34 percent in the last 24 hours"
- Shielded: "Shielded pool: 23.4 percent of supply"

### Dynamic Type
- Support for accessibility text sizes
- Minimum touch target: 44pt (for interactive areas)

---

## Visual Examples

### Color Application

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [#FFFFFF @ 50%] ZEC/USD              [#FFFFFF @ 40%] LIVE  │
│                                                             │
│  [#FFFFFF @ 100%] $48.23                                    │
│                                                             │
│  [#22C55E @ 100%] ▲ +2.34%  [#FFFFFF @ 40%] (24h)          │
│                                                             │
│  [#FFFFFF @ 60%] ────────────────────────────────────       │
│  [#FFFFFF @ 20% → 0%] gradient fill                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
ios-widget/
├── DESIGN.md                 # This specification
├── ZECPriceWidget/
│   ├── ZECPriceWidget.swift  # Main widget entry
│   ├── Views/
│   │   ├── SmallWidgetView.swift
│   │   ├── MediumWidgetView.swift
│   │   └── LargeWidgetView.swift
│   ├── Models/
│   │   └── PriceData.swift
│   ├── Providers/
│   │   └── PriceProvider.swift
│   └── Assets/
│       └── Colors.xcassets
└── Preview/
    └── WidgetPreviews.swift
```
