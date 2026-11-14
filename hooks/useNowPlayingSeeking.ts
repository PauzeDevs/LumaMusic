import { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, View } from "react-native";

export function useNowPlayingSeeking(
  duration: number,
  seekTo: (position: number) => unknown
) {
  const [progressWidth, setProgressWidth] = useState(0);
  const [progressLeft, setProgressLeft] = useState(0);
  const progressRef = useRef<View>(null);

  const seekFromScreenX = useCallback((screenX: number) => {
    if (progressWidth <= 0 || duration <= 0) return;
    const fraction = Math.max(0, Math.min(1, (screenX - progressLeft) / progressWidth));
    void seekTo(duration * fraction);
  }, [progressWidth, progressLeft, duration, seekTo]);

  const progressPanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (_event, gesture) => seekFromScreenX(gesture.x0),
    onPanResponderMove: (_event, gesture) => seekFromScreenX(gesture.moveX)
  }), [seekFromScreenX]);

  const onProgressLayout = useCallback(() => {
    progressRef.current?.measureInWindow((x, _y, width) => {
      setProgressLeft(x);
      setProgressWidth(width);
    });
  }, []);

  return { progressRef, progressPanResponder, onProgressLayout };
}
