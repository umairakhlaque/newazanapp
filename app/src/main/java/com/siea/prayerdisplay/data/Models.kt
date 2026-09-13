package com.siea.prayerdisplay.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class PrayerPayload(
    val version: String,
    @SerialName("mosque_name") val mosqueName: String,
    val timezone: String,
    @SerialName("prayer_days") val prayerDays: List<PrayerDayDto>,
    val content: List<ContentDto>
)

@Serializable
data class PrayerDayDto(
    val date: String,
    val fajr: PrayerTimeDto,
    val dhuhr: PrayerTimeDto,
    val asr: PrayerTimeDto,
    val maghrib: PrayerTimeDto,
    val isha: PrayerTimeDto
)

@Serializable
data class PrayerTimeDto(val adhan: String, val iqamah: String)

@Serializable
data class ContentDto(
    val id: String,
    val date: String,
    val type: String,
    val arabic: String,
    val english: String,
    val reference: String,
    val scholar: String = ""
)

@Entity(tableName = "prayer_days")
data class PrayerDayEntity(
    @PrimaryKey val date: String,
    val fajrAdhan: String,
    val fajrIqamah: String,
    val dhuhrAdhan: String,
    val dhuhrIqamah: String,
    val asrAdhan: String,
    val asrIqamah: String,
    val maghribAdhan: String,
    val maghribIqamah: String,
    val ishaAdhan: String,
    val ishaIqamah: String
)

@Entity(tableName = "daily_content")
data class ContentEntity(
    @PrimaryKey val id: String,
    val date: String,
    val type: String,
    val arabic: String,
    val english: String,
    val reference: String,
    val scholar: String
)

@Entity(tableName = "metadata")
data class MetadataEntity(@PrimaryKey val key: String, val value: String)

fun PrayerDayDto.toEntity() = PrayerDayEntity(
    date, fajr.adhan, fajr.iqamah, dhuhr.adhan, dhuhr.iqamah,
    asr.adhan, asr.iqamah, maghrib.adhan, maghrib.iqamah,
    isha.adhan, isha.iqamah
)

fun ContentDto.toEntity() = ContentEntity(id, date, type, arabic, english, reference, scholar)

