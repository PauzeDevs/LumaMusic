#!/usr/bin/env bash
set -euo pipefail

APK_PATH="$PWD/stress-app-debug.apk"
PACKAGE="dev.pauze.lumamusic"
RESULTS_DIR="$PWD/stress-results"

mkdir -p "$RESULTS_DIR"

if [[ ! -s "$APK_PATH" ]]; then
  echo "Expected debug APK is missing or empty: $APK_PATH" >&2
  ls -lah "$PWD" >&2
  exit 1
fi

# Wait until Android's package manager is responsive, not merely until the
# emulator reports boot-complete. ADB can briefly return Broken pipe while
# system services are still restarting.
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
  adb logcat -d -t 4000 > "$RESULTS_DIR/logcat-emulator-not-ready.txt" || true
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
  adb logcat -d -t 4000 > "$RESULTS_DIR/logcat-install-failure.txt" || true
  echo "Could not install the debug APK after 5 attempts." >&2
  exit 1
fi

adb shell am force-stop "$PACKAGE"
adb shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1
sleep 45
adb shell pidof "$PACKAGE" | tee "$RESULTS_DIR/initial-pid.txt"
adb shell dumpsys meminfo "$PACKAGE" > "$RESULTS_DIR/meminfo-launch.txt"

# Exercise the app UI with bounded input events while sampling PSS.
# This is a generic navigation soak, not a substitute for scripted playback
# or Audio Lab interaction with a real music account/device.
adb shell monkey -p "$PACKAGE" --throttle 650 --pct-syskeys 0 --pct-appswitch 5 240 > "$RESULTS_DIR/monkey.txt" 2>&1 &
MONKEY_PID=$!

for sample in $(seq 1 20); do
  sleep 30
  if ! adb shell pidof "$PACKAGE" >/dev/null 2>&1; then
    echo "App process exited during stress soak at sample $sample" | tee "$RESULTS_DIR/failure.txt"
    adb logcat -d -t 4000 > "$RESULTS_DIR/logcat-crash.txt"
    exit 1
  fi
  adb shell dumpsys meminfo "$PACKAGE" > "$RESULTS_DIR/meminfo-$(printf '%02d' "$sample").txt"
  adb shell pidof "$PACKAGE" >> "$RESULTS_DIR/pids.txt"
done

wait "$MONKEY_PID" || true
adb shell dumpsys meminfo "$PACKAGE" > "$RESULTS_DIR/meminfo-final.txt"
adb logcat -d -t 4000 > "$RESULTS_DIR/logcat-final.txt"
echo "Stress soak completed: 10 minutes of UI event load with 20 memory/process samples."
