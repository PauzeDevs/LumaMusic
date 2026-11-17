#!/usr/bin/env bash
set -Eeuo pipefail

WORKSPACE="${GITHUB_WORKSPACE:-$(pwd)}"
APK="$WORKSPACE/stress-app-debug.apk"
PACKAGE="dev.pauze.lumamusic"
RESULTS="$WORKSPACE/stress-results"
mkdir -p "$RESULTS"

capture_diagnostics() {
  local status=$?
  if command -v adb >/dev/null 2>&1; then
    adb logcat -d -t 8000 > "$RESULTS/logcat-exit.txt" 2>&1 || true
    adb shell dumpsys activity activities > "$RESULTS/activities-exit.txt" 2>&1 || true
    adb shell dumpsys meminfo "$PACKAGE" > "$RESULTS/meminfo-exit.txt" 2>&1 || true
    adb shell pidof "$PACKAGE" > "$RESULTS/pid-exit.txt" 2>&1 || true
  fi
  if [ "$status" -ne 0 ]; then
    printf 'Android stress script failed with exit code %s at %s\n' "$status" "$(date -Is)" > "$RESULTS/failure.txt"
  fi
}
trap capture_diagnostics EXIT

echo "Workspace: $WORKSPACE"
echo "APK: $APK"
if [ ! -s "$APK" ]; then
  echo "Debug APK not found or empty: $APK"
  ls -lah "$WORKSPACE" || true
  exit 1
fi

adb wait-for-device
adb shell getprop sys.boot_completed
adb logcat -c
adb install -r "$APK"
adb shell am force-stop "$PACKAGE"
adb shell monkey -p "$PACKAGE" -c android.intent.category.LAUNCHER 1
sleep 45

if ! adb shell pidof "$PACKAGE" | tee "$RESULTS/initial-pid.txt" | grep -q '[0-9]'; then
  echo "App process was not running 45 seconds after launch." | tee "$RESULTS/failure.txt"
  exit 1
fi
adb shell dumpsys meminfo "$PACKAGE" > "$RESULTS/meminfo-launch.txt"

# Apply bounded generic navigation events while sampling process health and PSS.
adb shell monkey -p "$PACKAGE" --throttle 650 --pct-syskeys 0 --pct-appswitch 5 240 > "$RESULTS/monkey.txt" 2>&1 &
MONKEY_PID=$!

for sample in $(seq 1 20); do
  sleep 30
  if ! adb shell pidof "$PACKAGE" | grep -q '[0-9]'; then
    echo "App process exited during stress soak at sample $sample." | tee "$RESULTS/failure.txt"
    exit 1
  fi
  adb shell dumpsys meminfo "$PACKAGE" > "$RESULTS/meminfo-$(printf '%02d' "$sample").txt"
  adb shell pidof "$PACKAGE" >> "$RESULTS/pids.txt"
done

wait "$MONKEY_PID" || true
adb shell dumpsys meminfo "$PACKAGE" > "$RESULTS/meminfo-final.txt"
adb logcat -d -t 8000 > "$RESULTS/logcat-success.txt"
echo "Stress soak completed: 10 minutes of UI events and 20 process/memory samples."
