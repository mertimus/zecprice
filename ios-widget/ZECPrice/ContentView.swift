import SwiftUI

struct ContentView: View {
    var body: some View {
        ZStack {
            Color.black
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Text("ZEC Price")
                    .font(.system(size: 32, weight: .semibold))
                    .foregroundColor(.white)

                Text("Add the widget to your home screen")
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.6))

                VStack(alignment: .leading, spacing: 12) {
                    instructionRow(number: "1", text: "Long press on your home screen")
                    instructionRow(number: "2", text: "Tap the + button in the top left")
                    instructionRow(number: "3", text: "Search for \"ZEC Price\"")
                    instructionRow(number: "4", text: "Choose a widget size and tap \"Add Widget\"")
                }
                .padding(24)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.white.opacity(0.05))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .strokeBorder(Color.white.opacity(0.1), lineWidth: 1)
                        )
                )
            }
            .padding(32)
        }
    }

    private func instructionRow(number: String, text: String) -> some View {
        HStack(spacing: 12) {
            Text(number)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.black)
                .frame(width: 24, height: 24)
                .background(Circle().fill(Color.white))

            Text(text)
                .font(.system(size: 15))
                .foregroundColor(.white.opacity(0.8))
        }
    }
}

#Preview {
    ContentView()
}
