package com.siea.prayerdisplay.domain

import com.siea.prayerdisplay.data.ContentEntity
import com.siea.prayerdisplay.data.PrayerDayEntity
import java.time.Duration
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZonedDateTime

enum class PrayerName(val displayName: String) {
    FAJR("FAJR"), DHUHR("DHUHR"), ASR("ASR"), MAGHRIB("MAGHRIB"), ISHA("ISHA")
}

data class PrayerOccurrence(
    val name: PrayerName,
    val date: LocalDate,
    val adhan: ZonedDateTime,
    val iqamah: ZonedDateTime
)

data class PrayerRow(
    val name: PrayerName,
    val adhan: String,
    val iqamah: String,
    val isTomorrow: Boolean,
    val isNext: Boolean
)

sealed interface DisplayState {
    data object Loading : DisplayState
    data class Main(val rows: List<PrayerRow>) : DisplayState
    data class Adhan(val prayer: PrayerName, val time: String) : DisplayState
    data class IqamahCountdown(val prayer: PrayerName, val secondsRemaining: Long) : DisplayState
    data class DailyContent(val item: ContentEntity) : DisplayState
}

object PrayerEngine {
    private const val IQAMAH_COUNTDOWN_SECONDS = 120L
    private const val ADHAN_SCREEN_SECONDS = 60L
    private const val CONTENT_QUIET_AFTER_IQAMAH_MINUTES = 15L

    fun evaluate(
        now: ZonedDateTime,
        days: List<PrayerDayEntity>,
        content: List<ContentEntity>
    ): DisplayState {
        if (days.isEmpty()) return DisplayState.Loading
        val occurrences = days.flatMap { it.occurrences(now) }

        occurrences.firstOrNull {
            !now.isBefore(it.iqamah.minusSeconds(IQAMAH_COUNTDOWN_SECONDS)) && now.isBefore(it.iqamah)
        }?.let {
            return DisplayState.IqamahCountdown(
                prayer = it.name,
                secondsRemaining = Duration.between(now, it.iqamah).seconds.coerceAtLeast(0)
            )
        }

        occurrences.firstOrNull {
            !now.isBefore(it.adhan) && now.isBefore(it.adhan.plusSeconds(ADHAN_SCREEN_SECONDS))
        }?.let { return DisplayState.Adhan(it.name, it.adhan.toLocalTime().toClockText()) }

        val inQuietWindow = occurrences.any {
            !now.isBefore(it.iqamah.minusSeconds(IQAMAH_COUNTDOWN_SECONDS)) &&
                now.isBefore(it.iqamah.plusMinutes(CONTENT_QUIET_AFTER_IQAMAH_MINUTES))
        }
        val contentMoment = now.minute % 5 == 0 && now.second < 30
        if (!inQuietWindow && contentMoment) {
            val todayContent = content.filter { it.date == now.toLocalDate().toString() || it.date == "*" }
            if (todayContent.isNotEmpty()) {
                val index = (now.toLocalTime().toSecondOfDay() / 300) % todayContent.size
                return DisplayState.DailyContent(todayContent[index])
            }
        }

        return DisplayState.Main(buildRows(now, occurrences))
    }

    private fun buildRows(now: ZonedDateTime, occurrences: List<PrayerOccurrence>): List<PrayerRow> {
        val nextIqamah = occurrences.filter { now.isBefore(it.iqamah) }.minByOrNull { it.iqamah }
        return PrayerName.entries.map { name ->
            val next = occurrences
                .filter { it.name == name && now.isBefore(it.iqamah) }
                .minByOrNull { it.iqamah }
            PrayerRow(
                name = name,
                adhan = next?.adhan?.toLocalTime()?.toClockText() ?: "--:--",
                iqamah = next?.iqamah?.toLocalTime()?.toClockText() ?: "--:--",
                isTomorrow = next?.date?.isAfter(now.toLocalDate()) == true,
                isNext = next != null && next == nextIqamah
            )
        }
    }

    private fun PrayerDayEntity.occurrences(now: ZonedDateTime): List<PrayerOccurrence> {
        val day = LocalDate.parse(date)
        fun occurrence(name: PrayerName, adhanText: String, iqamahText: String) = PrayerOccurrence(
            name = name,
            date = day,
            adhan = ZonedDateTime.of(day, LocalTime.parse(adhanText), now.zone),
            iqamah = ZonedDateTime.of(day, LocalTime.parse(iqamahText), now.zone)
        )
        return listOf(
            occurrence(PrayerName.FAJR, fajrAdhan, fajrIqamah),
            occurrence(PrayerName.DHUHR, dhuhrAdhan, dhuhrIqamah),
            occurrence(PrayerName.ASR, asrAdhan, asrIqamah),
            occurrence(PrayerName.MAGHRIB, maghribAdhan, maghribIqamah),
            occurrence(PrayerName.ISHA, ishaAdhan, ishaIqamah)
        )
    }

    private fun LocalTime.toClockText(): String = "%02d:%02d".format(hour, minute)
}

