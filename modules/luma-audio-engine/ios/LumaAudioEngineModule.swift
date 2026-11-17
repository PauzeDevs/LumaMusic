import AVFoundation
import ExpoModulesCore

public class LumaAudioEngineModule: Module {
  private var player: AVPlayer?
  private var timeObserver: Any?
  private var statusObservation: NSKeyValueObservation?
  private var timeControlObservation: NSKeyValueObservation?
  private var activeTrackId: String?
  private var catalogueDurationSeconds: Double = 0
  private var lastError: String?
  private var isObserving = false

  public func definition() -> ModuleDefinition {
    Name("LumaAudioEngine")
    Events("onStateChange")

    OnCreate {
      self.configureAudioSession()
      self.createPlayer()
    }

    OnDestroy {
      self.releasePlayer()
    }

    OnStartObserving {
      self.isObserving = true
      self.emitState()
    }

    OnStopObserving {
      self.isObserving = false
    }

    AsyncFunction("getCapabilities") { (sourceKind: String) -> [String: Any] in
      return [
        "nativePlayback": true,
        "equalizer": false,
        "limiter": false,
        "reverb": false,
        "spatial": false,
        "audioTap": false,
        "sourceKind": sourceKind,
        "reasonUnavailable": "Native transport is available; DSP is not connected to the AVAudioEngine output graph yet."
      ]
    }

    AsyncFunction("getState") { () -> [String: Any] in
      return self.stateMap()
    }

    AsyncFunction("load") { (track: [String: Any], startPositionSeconds: Double?) throws -> Void in
      guard let id = track["id"] as? String, !id.isEmpty else {
        throw NSError(domain: "LumaAudioEngine", code: 1, userInfo: [NSLocalizedDescriptionKey: "Track id is required."])
      }
      guard let uri = track["uri"] as? String, let url = URL(string: uri) else {
        throw NSError(domain: "LumaAudioEngine", code: 2, userInfo: [NSLocalizedDescriptionKey: "A valid track URI is required."])
      }
      self.activeTrackId = id
      self.lastError = nil
      self.catalogueDurationSeconds = (track["durationSeconds"] as? NSNumber)?.doubleValue ?? 0
      let headers = track["headers"] as? [String: String] ?? [:]
      let assetOptions: [String: Any] = headers.isEmpty ? [:] : ["AVURLAssetHTTPHeaderFieldsKey": headers]
      let asset = AVURLAsset(url: url, options: assetOptions)
      let item = AVPlayerItem(asset: asset)
      self.statusObservation = item.observe(\.status, options: [.initial, .new]) { [weak self] item, _ in
        if item.status == .failed {
          self?.lastError = item.error?.localizedDescription ?? "Playback failed."
        }
        self?.emitState()
      }
      self.player?.replaceCurrentItem(with: item)
      let start = max(0, startPositionSeconds ?? 0)
      if start > 0 {
        self.player?.seek(to: CMTime(seconds: start, preferredTimescale: 600))
      }
      self.emitState()
    }

    AsyncFunction("play") {
      try self.activateAudioSession()
      self.player?.play()
      self.emitState()
    }

    AsyncFunction("pause") {
      self.player?.pause()
      self.emitState()
    }

    AsyncFunction("seekTo") { (positionSeconds: Double) throws -> Void in
      guard positionSeconds.isFinite && positionSeconds >= 0 else {
        throw NSError(domain: "LumaAudioEngine", code: 3, userInfo: [NSLocalizedDescriptionKey: "Seek position must be finite and non-negative."])
      }
      self.player?.seek(to: CMTime(seconds: positionSeconds, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
      self.emitState()
    }

    AsyncFunction("setPlaybackRate") { (rate: Double) throws -> Void in
      guard rate.isFinite && (0.5...2.0).contains(rate) else {
        throw NSError(domain: "LumaAudioEngine", code: 4, userInfo: [NSLocalizedDescriptionKey: "Playback rate must be between 0.5x and 2.0x."])
      }
      self.player?.rate = Float(rate)
      self.emitState()
    }

    AsyncFunction("release") {
      self.releasePlayer()
    }
  }

  private func configureAudioSession() {
    #if os(iOS)
    do {
      try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
    } catch {
      lastError = error.localizedDescription
    }
    #endif
  }

  private func activateAudioSession() throws {
    #if os(iOS)
    try AVAudioSession.sharedInstance().setActive(true)
    #endif
  }

  private func createPlayer() {
    let newPlayer = AVPlayer()
    newPlayer.automaticallyWaitsToMinimizeStalling = true
    player = newPlayer
    timeControlObservation = newPlayer.observe(\.timeControlStatus, options: [.initial, .new]) { [weak self] _, _ in
      self?.emitState()
    }
    timeObserver = newPlayer.addPeriodicTimeObserver(
      forInterval: CMTime(seconds: 0.25, preferredTimescale: 600),
      queue: .main
    ) { [weak self] _ in
      self?.emitState()
    }
  }

  private func stateMap() -> [String: Any] {
    let current = player?.currentTime().seconds ?? 0
    let item = player?.currentItem
    let itemDuration = item?.duration.seconds ?? 0
    let duration = itemDuration.isFinite && itemDuration > 0 ? itemDuration : catalogueDurationSeconds
    let rate = Double(player?.rate ?? 0)
    let buffering = player?.timeControlStatus == .waitingToPlayAtSpecifiedRate
    return [
      "trackId": activeTrackId ?? NSNull(),
      "isPlaying": rate > 0,
      "isBuffering": buffering,
      "positionSeconds": current.isFinite ? max(0, current) : 0,
      "durationSeconds": duration.isFinite ? max(0, duration) : 0,
      "bufferedSeconds": bufferedPosition(item: item),
      "playbackRate": rate > 0 ? rate : 1,
      "error": lastError ?? NSNull()
    ]
  }

  private func bufferedPosition(item: AVPlayerItem?) -> Double {
    guard let range = item?.loadedTimeRanges.first?.timeRangeValue else { return 0 }
    let end = CMTimeAdd(range.start, range.duration).seconds
    return end.isFinite ? max(0, end) : 0
  }

  private func emitState() {
    guard isObserving else { return }
    sendEvent("onStateChange", stateMap())
  }

  private func releasePlayer() {
    if let observer = timeObserver, let player {
      player.removeTimeObserver(observer)
    }
    timeObserver = nil
    statusObservation = nil
    timeControlObservation = nil
    player?.pause()
    player?.replaceCurrentItem(with: nil)
    player = nil
    activeTrackId = nil
    catalogueDurationSeconds = 0
  }
}
