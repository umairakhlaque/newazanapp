package com.siea.prayerdisplay.domain

import com.siea.prayerdisplay.data.ContentEntity
import com.siea.prayerdisplay.data.PrayerDayEntity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.ZoneId
import java.time.ZonedDateTime

class PrayerEngineTest {
    private val zone = ZoneId.of("Europe/London")
    private val days = listOf(day("2026-09-13", "05:00", "05:30"), day("2026-09-14", "05:05", "05:35"))
    private val content = listOf(
        ContentEntity("q1", "*", "QURAN", "Arabic", "English", "Reference", "")
    )

    @Test
    fun `adhan screen lasts for first minute after adhan`() {
        val state = evaluate("2026-09-13T05:00:30")
        assertTrue(state is DisplayState.Adhan)
        assertEquals(PrayerName.FAJR, (state as DisplayState.Adhan).prayer)
    }

    @Test
    fun `iqamah countdown begins two minutes before iqamah`() {
        val state = evaluate("2026-09-13T05:28:30")
        assertTrue(state is DisplayState.IqamahCountdown)
        assertEquals(PrayerName.FAJR, (state as DisplayState.IqamahCountdown).prayer)
        assertEquals(90, state.secondsRemaining)
    }

    @Test
    fun `completed prayer rolls both times to tomorrow at exact iqamah`() {
        val state = evaluate("2026-09-13T05:30:00") as DisplayState.Main
        val fajr = state.rows.first { it.name == PrayerName.FAJR }
        assertEquals("05:05", fajr.adhan)
        assertEquals("05:35", fajr.iqamah)
        assertTrue(fajr.isTomorrow)
    }

    @Test
    fun `daily content is suppressed for fifteen minutes after iqamah`() {
        assertTrue(evaluate("2026-09-13T05:35:05") is DisplayState.Main)
        assertTrue(evaluate("2026-09-13T05:40:05") is DisplayState.Main)
    }

    @Test
    fun `daily content resumes at end of quiet period`() {
        assertTrue(evaluate("2026-09-13T05:45:05") is DisplayState.DailyContent)
    }

    @Test
    fun `future prayers stay on current day`() {
        val state = evaluate("2026-09-13T05:30:00") as DisplayState.Main
        val dhuhr = state.rows.first { it.name == PrayerName.DHUHR }
        assertFalse(dhuhr.isTomorrow)
    }

    private fun evaluate(localDateTime: String): DisplayState = PrayerEngine.evaluate(
        ZonedDateTime.parse("${localDateTime}+01:00[Europe/London]"),
        days,
        content
    )

    private fun day(date: String, fajrAdhan: String, fajrIqamah: String) = PrayerDayEntity(
        date = date,
        fajrAdhan = fajrAdhan,
        fajrIqamah = fajrIqamah,
        dhuhrAdhan = "13:00",
        dhuhrIqamah = "13:30",
        asrAdhan = "17:00",
        asrIqamah = "17:15",
        maghribAdhan = "19:30",
        maghribIqamah = "19:35",
        ishaAdhan = "21:00",
        ishaIqamah = "21:15"
    )
}
