import ExpoModulesCore
import SwiftUI
import UIKit

private final class LiquidGlassModel: ObservableObject {
  @Published var cornerRadius: CGFloat = 24
}

private struct LiquidGlassContent: View {
  @ObservedObject var model: LiquidGlassModel

  var body: some View {
    Group {
      if #available(iOS 26.0, *) {
        GlassEffectContainer(spacing: 12) {
          RoundedRectangle(cornerRadius: model.cornerRadius, style: .continuous)
            .fill(.clear)
            .glassEffect(.regular, in: RoundedRectangle(cornerRadius: model.cornerRadius, style: .continuous))
        }
      } else {
        RoundedRectangle(cornerRadius: model.cornerRadius, style: .continuous)
          .fill(.ultraThinMaterial)
          .overlay {
            RoundedRectangle(cornerRadius: model.cornerRadius, style: .continuous)
              .strokeBorder(Color.white.opacity(0.16), lineWidth: 1)
          }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Color.clear)
  }
}

final class LiquidGlassExpoView: ExpoView {
  private let model = LiquidGlassModel()
  private var hostingController: UIHostingController<LiquidGlassContent>!

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear
    isUserInteractionEnabled = false
    hostingController = UIHostingController(rootView: LiquidGlassContent(model: model))
    hostingController.view.backgroundColor = .clear
    hostingController.view.isUserInteractionEnabled = false
    hostingController.view.translatesAutoresizingMaskIntoConstraints = false
    addSubview(hostingController.view)
    NSLayoutConstraint.activate([
      hostingController.view.leadingAnchor.constraint(equalTo: leadingAnchor),
      hostingController.view.trailingAnchor.constraint(equalTo: trailingAnchor),
      hostingController.view.topAnchor.constraint(equalTo: topAnchor),
      hostingController.view.bottomAnchor.constraint(equalTo: bottomAnchor)
    ])
  }

  func setCornerRadius(_ radius: CGFloat) {
    model.cornerRadius = max(0, radius)
  }
}

public final class LiquidGlassModule: Module {
  public func definition() -> ModuleDefinition {
    Name("LiquidGlass")
    View(LiquidGlassExpoView.self) {
      Prop("cornerRadius") { (view: LiquidGlassExpoView, radius: Double) in
        view.setCornerRadius(CGFloat(radius))
      }
    }
  }
}
