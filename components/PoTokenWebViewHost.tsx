import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import {
  attachPoTokenWebView,
  failPendingPoTokenRequests,
  handlePoTokenWebViewMessage,
  subscribePoTokenDemand
} from "../services/poTokenResolver";

const BOTGUARD_SCRIPT = String.raw`
(function () {
  if (window.__lumaPoTokenReady) return true;
  window.__lumaPoTokenReady = true;
  window.__lumaGeneratePoToken = async function (requestId, videoId) {
    const send = (payload) => window.ReactNativeWebView.postMessage(JSON.stringify({
      type: "potoken-result", requestId, ...payload
    }));
    try {
      const requestKey = "O43z0dpjhgX20SCx4KAo";
      const [botguard, webpo, utils] = await Promise.all([
        import("https://cdn.jsdelivr.net/npm/bgutils-js@4.0.3/botguard/+esm"),
        import("https://cdn.jsdelivr.net/npm/bgutils-js@4.0.3/webpo/+esm"),
        import("https://cdn.jsdelivr.net/npm/bgutils-js@4.0.3/utils/+esm")
      ]);
      const challenge = await botguard.getChallenge({
        fetchFunction: window.fetch.bind(window), requestKey
      });
      const interpreter = challenge.interpreterJavascript?.privateDoNotAccessOrElseSafeScriptWrappedValue;
      if (!interpreter) throw new Error("BotGuard interpreter was not provided");
      window.eval(interpreter);
      const client = await botguard.BotGuardClient.create({
        program: challenge.program, globalName: challenge.globalName, globalObject: window
      });
      const signals = [];
      const snapshot = await client.snapshot({ webPoSignalOutput: signals });
      const integrityResponse = await window.fetch(utils.buildURL("GenerateIT", true), {
        method: "POST", headers: utils.getHeaders(), body: JSON.stringify([requestKey, snapshot])
      });
      if (!integrityResponse.ok) throw new Error("Google attestation returned HTTP " + integrityResponse.status);
      const [integrityToken, estimatedTtlSecs, mintRefreshThreshold, websafeFallbackToken] =
        await integrityResponse.json();
      if (!integrityToken || !estimatedTtlSecs) throw new Error("Google returned an incomplete integrity token");
      const minter = await webpo.WebPoMinter.create({
        integrityToken, estimatedTtlSecs,
        mintRefreshThreshold: mintRefreshThreshold || 0, websafeFallbackToken
      }, signals);
      const contentToken = await minter.mintAsWebsafeString(videoId);
      if (!contentToken) throw new Error("BotGuard returned an empty content token");
      send({ contentToken, expiresAt: Date.now() + Math.max(60, estimatedTtlSecs - 600) * 1000 });
    } catch (error) {
      send({ error: error && error.message ? error.message : String(error) });
    }
  };
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: "potoken-ready" }));
  return true;
})();
true;
`;

export default function PoTokenWebViewHost() {
  const webView = useRef<WebView>(null);
  const rendererFailures = useRef(0);
  const [requested, setRequested] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [instance, setInstance] = useState(0);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    return subscribePoTokenDemand((active) => {
      setRequested(active);
      if (!active) setPageLoaded(false);
    });
  }, []);

  const sendRequest = useCallback((requestId: string, videoId: string) => {
    const script = `window.__lumaGeneratePoToken && window.__lumaGeneratePoToken(${JSON.stringify(requestId)}, ${JSON.stringify(videoId)}); true;`;
    webView.current?.injectJavaScript(script);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android" || !requested || !pageLoaded) return;
    return attachPoTokenWebView(sendRequest);
  }, [requested, pageLoaded, sendRequest]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === "potoken-ready") {
        setPageLoaded(true);
        return;
      }
      handlePoTokenWebViewMessage(message);
    } catch {
      // Ignore malformed messages from the embedded page.
    }
  }, []);

  const onRendererGone = useCallback((event: { nativeEvent: { didCrash: boolean } }) => {
    rendererFailures.current += 1;
    console.warn("[LumaMusic][PoTokenWebView] renderer terminated", {
      didCrash: event.nativeEvent.didCrash,
      recoveryAttempt: rendererFailures.current
    });
    // A dead WebView cannot be reused. Fail optional token work and unmount it;
    // a later PoToken request will create a fresh instance instead of reload-looping.
    failPendingPoTokenRequests();
    setPageLoaded(false);
    setRequested(false);
    setInstance((value) => value + 1);
  }, []);

  if (Platform.OS !== "android" || !requested) return null;

  return (
    <View pointerEvents="none" style={styles.host}>
      <WebView
        key={instance}
        ref={webView}
        source={{ uri: "https://www.youtube.com/" }}
        onLoadEnd={() => webView.current?.injectJavaScript(BOTGUARD_SCRIPT)}
        onMessage={onMessage}
        onRenderProcessGone={onRendererGone}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        originWhitelist={["https://*"]}
        style={styles.webView}
        containerStyle={styles.webView}
        scrollEnabled={false}
        bounces={false}
        onError={() => {
          setPageLoaded(false);
          failPendingPoTokenRequests();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: "absolute", width: 1, height: 1, opacity: 0, left: -10, top: -10 },
  webView: { width: 1, height: 1, backgroundColor: "transparent" }
});
