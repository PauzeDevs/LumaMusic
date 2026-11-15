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

adb install -r "$APK_PATH"
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
