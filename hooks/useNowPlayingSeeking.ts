import { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, View } from "react-native";

export function useNowPlayingSeeking(
  duration: number,
  seekTo: (position: number) => unknown
) {
  const [progressWidth, setProgressWidth] = useState(0);
  const [progressLeft, setProgressLeft] = useState(0);
  const progressRef = useRef<View>(null);

  const measureProgress = useCallback(() => {
    requestAnimationFrame(() => {
      progressRef.current?.measureInWindow((x, _y, width) => {
        if (width > 0) {
          setProgressLeft(x);
          setProgressWidth(width);
        }
      });
    });
  }, []);

  const seekFromPageX = useCallback((pageX: number) => {
    if (progressWidth <= 0 || duration <= 0 || !Number.isFinite(pageX)) return;
    const fraction = Math.max(0, Math.min(1, (pageX - progressLeft) / progressWidth));
    void seekTo(duration * fraction);
  }, [progressWidth, progressLeft, duration, seekTo]);

  const progressPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (event) => {
      measureProgress();
      seekFromPageX(event.nativeEvent.pageX);
    },
    onPanResponderMove: (event) => seekFromPageX(event.nativeEvent.pageX),
    onPanResponderRelease: (event) => seekFromPageX(event.nativeEvent.pageX)
  }), [measureProgress, seekFromPageX]);

  return { progressRef, progressPanResponder, onProgressLayout: measureProgress };
}
