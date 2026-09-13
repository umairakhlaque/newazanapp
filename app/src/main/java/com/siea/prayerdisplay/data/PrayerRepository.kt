package com.siea.prayerdisplay.data

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.net.HttpURLConnection
import java.net.URL

class PrayerRepository(
    private val context: Context,
    private val database: AppDatabase = AppDatabase.get(context)
) {
    private val dao = database.prayerDao()
    val prayerDays = dao.observePrayerDays()
    val content = dao.observeContent()

    private val json = Json { ignoreUnknownKeys = true }

    suspend fun initialise() = withContext(Dispatchers.IO) {
        if (dao.prayerDayCount() == 0) {
            val bundled = context.assets.open("payload.json").bufferedReader().use { it.readText() }
            database.replacePayload(json.decodeFromString<PrayerPayload>(bundled))
        }
    }

    suspend fun syncIfChanged(): Boolean = withContext(Dispatchers.IO) {
        val remoteVersion = download(VERSION_URL)
            ?.let { json.decodeFromString<VersionDocument>(it).version }
            ?: return@withContext false
        if (remoteVersion == dao.metadata("version")) return@withContext true

        val payloadText = download(PAYLOAD_URL) ?: return@withContext false
        val payload = json.decodeFromString<PrayerPayload>(payloadText)
        require(payload.version == remoteVersion) { "Version and payload do not match" }
        require(payload.prayerDays.isNotEmpty()) { "Prayer timetable is empty" }
        database.replacePayload(payload)
        true
    }

    private fun download(address: String): String? {
        val connection = URL(address).openConnection() as HttpURLConnection
        return try {
            connection.connectTimeout = 10_000
            connection.readTimeout = 15_000
            connection.requestMethod = "GET"
            connection.setRequestProperty("Cache-Control", "no-cache")
            if (connection.responseCode !in 200..299) null
            else connection.inputStream.bufferedReader().use { it.readText() }
        } finally {
            connection.disconnect()
        }
    }

    @Serializable
    private data class VersionDocument(val version: String)

    companion object {
        private const val BASE =
            "https://raw.githubusercontent.com/umairakhlaque/newazanapp/main/data"
        private const val VERSION_URL = "$BASE/version.json"
        private const val PAYLOAD_URL = "$BASE/payload.json"
    }
}
