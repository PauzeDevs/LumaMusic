package dev.pauze.lumamusic.newpipe

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.stream.AudioStream
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap

private class LumaNewPipeDownloader : Downloader() {
  private fun register(connection: HttpURLConnection, requestId: String?) {
    if (requestId.isNullOrBlank()) return
    activeConnections.computeIfAbsent(requestId) { ConcurrentHashMap.newKeySet() }.add(connection)
  }

  private fun unregister(connection: HttpURLConnection, requestId: String?) {
    if (requestId.isNullOrBlank()) return
    activeConnections[requestId]?.let { connections ->
      connections.remove(connection)
      if (connections.isEmpty()) activeConnections.remove(requestId, connections)
    }
  }

  private fun ensureNotCancelled(requestId: String?) {
    if (Thread.currentThread().isInterrupted || (!requestId.isNullOrBlank() && cancelledRequestIds.contains(requestId))) {
      throw IOException("NewPipe extraction was cancelled.")
    }
  }

  private fun readBoundedResponse(input: InputStream): String {
    val output = ByteArrayOutputStream()
    val buffer = ByteArray(16 * 1024)
    var totalBytes = 0
    input.use { stream ->
      while (true) {
        val count = stream.read(buffer)
        if (count < 0) break
        totalBytes += count
        if (totalBytes > MAX_RESPONSE_BYTES) {
          throw IOException("YouTube extractor response exceeded the 8 MB safety limit.")
        }
        output.write(buffer, 0, count)
      }
    }
    return output.toString(Charsets.UTF_8.name())
  }

  override fun execute(request: Request): Response {
    val connection = URL(request.url()).openConnection() as HttpURLConnection
    val requestId = activeRequestId.get()
    register(connection, requestId)
    try {
      ensureNotCancelled(requestId)
      connection.requestMethod = request.httpMethod()
      connection.connectTimeout = 15000
      connection.readTimeout = 20000
      connection.instanceFollowRedirects = true
      connection.setRequestProperty("User-Agent", USER_AGENT)
      request.headers().forEach { (name, values) ->
        if (values.isNotEmpty()) connection.setRequestProperty(name, values.joinToString(", "))
      }

      val body = request.dataToSend()
      if (body != null) {
        connection.doOutput = true
        connection.outputStream.use { it.write(body) }
      }

      ensureNotCancelled(requestId)
      val code = connection.responseCode
      ensureNotCancelled(requestId)
      val contentLength = connection.getHeaderFieldLong("Content-Length", -1L)
      if (contentLength > MAX_RESPONSE_BYTES) {
        throw IOException("YouTube extractor response exceeded the 8 MB safety limit.")
      }
      val stream: InputStream? = if (code >= 400) connection.errorStream else connection.inputStream
      val responseBody = stream?.let(::readBoundedResponse) ?: ""

      val responseHeaders = connection.headerFields
        .filterKeys { it != null }
        .mapKeys { it.key!! }
        .mapValues { it.value ?: emptyList() }

      return Response(
        code,
        connection.responseMessage ?: "",
        responseHeaders,
        responseBody,
        connection.url.toString()
      )
    } finally {
      unregister(connection, requestId)
      connection.disconnect()
    }
  }

  companion object {
    val activeRequestId = ThreadLocal<String?>()
    val activeConnections = ConcurrentHashMap<String, MutableSet<HttpURLConnection>>()
    val cancelledRequestIds = ConcurrentHashMap.newKeySet<String>()

    fun cancel(requestId: String) {
      cancelledRequestIds.add(requestId)
      activeConnections.remove(requestId)?.forEach { connection ->
        try { connection.disconnect() } catch (_: Exception) { }
      }
    }

    private const val MAX_RESPONSE_BYTES = 8L * 1024L * 1024L
    const val USER_AGENT =
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  }
}

class NewPipeExtractorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NewPipeExtractor")

    Function("cancelExtraction") { requestId: String ->
      if (requestId.matches(Regex("newpipe-[0-9]{1,16}"))) {
        LumaNewPipeDownloader.cancel(requestId)
      }
    }

    AsyncFunction("extractAudio") { videoId: String, requestId: String ->
      require(videoId.matches(Regex("[A-Za-z0-9_-]{11}"))) {
        "Invalid YouTube video ID."
      }
      require(requestId.matches(Regex("newpipe-[0-9]{1,16}"))) {
        "Invalid NewPipe extraction request ID."
      }

      // Do not clear a cancellation marker here: cancelExtraction may run
      // before Expo schedules this async function on its worker thread.
      LumaNewPipeDownloader.activeRequestId.set(requestId)
      try {
        synchronized(NewPipe::class.java) {
          if (NewPipe.getDownloader() == null) {
            NewPipe.init(LumaNewPipeDownloader())
          }
        }

        val extractor = ServiceList.YouTube.getStreamExtractor(
          "https://www.youtube.com/watch?v=$videoId"
        )
        extractor.fetchPage()

        val audioStreams = extractor.audioStreams
          .filter { it.isUrl && it.content.isNotBlank() }
          .sortedWith(
            compareByDescending<AudioStream> { it.format?.mimeType?.contains("audio/mp4") == true }
              .thenByDescending { it.averageBitrate }
          )

        val best = audioStreams.firstOrNull()
          ?: throw IllegalStateException("NewPipe did not return a direct audio stream.")

        mapOf(
          "url" to best.content,
          "mimeType" to (best.format?.mimeType ?: "audio/*"),
          "durationSeconds" to extractor.length.toDouble(),
          "bitrate" to best.averageBitrate,
          "userAgent" to LumaNewPipeDownloader.USER_AGENT
        )
      } finally {
        LumaNewPipeDownloader.activeRequestId.remove()
        LumaNewPipeDownloader.cancelledRequestIds.remove(requestId)
      }
    }
  }
}
