#!/usr/bin/env bash
set -euo pipefail

APK_PATH="$PWD/stress-app-debug.apk"
PACKAGE="dev.pauze.lumamusic"
RESULTS_DIR="$PWD/stress-results"
mkdir -p "$RESULTS_DIR"

capture_diagnostics() {
  local label="$1"
  adb logcat -d -t 12000 > "$RESULTS_DIR/logcat-$label.txt" 2>&1 || true
  adb shell dumpsys activity activities > "$RESULTS_DIR/activities-$label.txt" 2>&1 || true
  adb shell dumpsys package "$PACKAGE" > "$RESULTS_DIR/package-$label.txt" 2>&1 || true
  adb shell dumpsys dropbox --print data_app_anr > "$RESULTS_DIR/anr-dropbox-$label.txt" 2>&1 || true
}

if [[ ! -s "$APK_PATH" ]]; then
  echo "Expected debug APK is missing or empty: $APK_PATH" >&2
  ls -lah "$PWD" >&2
  exit 1
fi

adb wait-for-device
BOOT_READY=0
for attempt in $(seq 1 30); do
  if [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\\r')" == "1" ]] &&
     adb shell cmd package list packages >/dev/null 2>&1; then
    BOOT_READY=1
    break
  fi
  sleep 5
done
if [[ "$BOOT_READY" != "1" ]]; then
  capture_diagnostics "emulator-not-ready"
  echo "Android package manager did not become ready." >&2
  exit 1
fi

INSTALLED=0
for attempt in $(seq 1 5); do
  if adb install -r "$APK_PATH"; then
    INSTALLED=1
    break
  fi
  echo "APK install attempt $attempt failed; restarting ADB and retrying." >&2
  adb kill-server || true
  adb start-server || true
  adb wait-for-device || true
  sleep 8
done
if [[ "$INSTALLED" != "1" ]]; then
  capture_diagnostics "install-failure"
  echo "Could not install the debug APK after 5 attempts." >&2
  exit 1
fi

# The hosted emulator can report boot-complete while first-boot background
# services are still saturating its CPU. Let the launcher/system settle before
# measuring app startup, otherwise the test measures emulator cold-boot load.
sleep 60
adb shell am force-stop "$PACKAGE"
adb shell am start -W -n "$PACKAGE/.MainActivity" | tee "$RESULTS_DIR/activity-start.txt"
sleep 30
adb shell pidof "$PACKAGE" > "$RESULTS_DIR/initial-pid.txt" 2>&1 || true
if [[ ! -s "$RESULTS_DIR/initial-pid.txt" ]]; then
  capture_diagnostics "launch-failure"
  echo "App process was not running after the settled-emulator launch." | tee "$RESULTS_DIR/failure.txt"
  exit 1
fi
adb shell dumpsys meminfo "$PACKAGE" > "$RESULTS_DIR/meminfo-launch.txt"

adb shell monkey -p "$PACKAGE" --throttle 650 --pct-syskeys 0 --pct-appswitch 5 240 > "$RESULTS_DIR/monkey.txt" 2>&1 &
MONKEY_PID=$!

for sample in $(seq 1 20); do
  sleep 30
  adb shell pidof "$PACKAGE" > "$RESULTS_DIR/current-pid.txt" 2>&1 || true
  if [[ ! -s "$RESULTS_DIR/current-pid.txt" ]]; then
    echo "App process exited during stress soak at sample $sample" | tee "$RESULTS_DIR/failure.txt"
    capture_diagnostics "crash"
    exit 1
  fi
  adb shell dumpsys meminfo "$PACKAGE" > "$RESULTS_DIR/meminfo-$(printf '%02d' "$sample").txt"
  cat "$RESULTS_DIR/current-pid.txt" >> "$RESULTS_DIR/pids.txt"
done

wait "$MONKEY_PID" || true
adb shell dumpsys meminfo "$PACKAGE" > "$RESULTS_DIR/meminfo-final.txt"
capture_diagnostics "final"
echo "Stress soak completed: 10 minutes of UI event load with 20 memory/process samples."
