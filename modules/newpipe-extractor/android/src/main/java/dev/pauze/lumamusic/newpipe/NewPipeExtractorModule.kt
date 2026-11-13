package dev.pauze.lumamusic.newpipe

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.services.youtube.YoutubeService
import org.schabi.newpipe.extractor.stream.AudioStream
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

private class LumaNewPipeDownloader : Downloader() {
  override fun execute(request: Request): Response {
    val connection = (URL(request.url()).openConnection() as HttpURLConnection).apply {
      requestMethod = request.httpMethod()
      connectTimeout = 15000
      readTimeout = 20000
      instanceFollowRedirects = true
      setRequestProperty("User-Agent", USER_AGENT)
      request.headers().forEach { (name, values) ->
        if (values.isNotEmpty()) setRequestProperty(name, values.joinToString(", "))
      }
    }

    val body = request.dataToSend()
    if (body != null) {
      connection.doOutput = true
      connection.outputStream.use { it.write(body) }
    }

    val code = connection.responseCode
    val stream: InputStream? = if (code >= 400) connection.errorStream else connection.inputStream
    val responseBody = stream?.use { input ->
      BufferedReader(InputStreamReader(input, Charsets.UTF_8)).use { it.readText() }
    } ?: ""

    val responseHeaders = connection.headerFields
      .filterKeys { it != null }
      .mapKeys { it.key!! }
      .mapValues { it.value ?: emptyList() }

    val response = Response(
      code,
      connection.responseMessage ?: "",
      responseHeaders,
      responseBody,
      connection.url.toString()
    )
    connection.disconnect()
    return response
  }

  companion object {
    const val USER_AGENT =
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
  }
}

class NewPipeExtractorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("NewPipeExtractor")

    AsyncFunction("extractAudio") { videoId: String ->
      require(videoId.matches(Regex("[A-Za-z0-9_-]{11}"))) {
        "Invalid YouTube video ID."
      }

      synchronized(NewPipe::class.java) {
        if (NewPipe.getDownloader() == null) {
          NewPipe.init(LumaNewPipeDownloader())
        }
      }

      val extractor = YoutubeService().getStreamExtractor(
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
    }
  }
}
