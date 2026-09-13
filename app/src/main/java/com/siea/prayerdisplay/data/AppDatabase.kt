package com.siea.prayerdisplay.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.withTransaction
import kotlinx.coroutines.flow.Flow

@Dao
interface PrayerDao {
    @Query("SELECT * FROM prayer_days ORDER BY date")
    fun observePrayerDays(): Flow<List<PrayerDayEntity>>

    @Query("SELECT * FROM daily_content ORDER BY date, id")
    fun observeContent(): Flow<List<ContentEntity>>

    @Query("SELECT value FROM metadata WHERE `key` = :key LIMIT 1")
    suspend fun metadata(key: String): String?

    @Query("SELECT COUNT(*) FROM prayer_days")
    suspend fun prayerDayCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPrayerDays(rows: List<PrayerDayEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertContent(rows: List<ContentEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMetadata(row: MetadataEntity)

    @Query("DELETE FROM prayer_days")
    suspend fun clearPrayerDays()

    @Query("DELETE FROM daily_content")
    suspend fun clearContent()
}

@Database(
    entities = [PrayerDayEntity::class, ContentEntity::class, MetadataEntity::class],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun prayerDao(): PrayerDao

    companion object {
        @Volatile private var instance: AppDatabase? = null

        fun get(context: Context): AppDatabase = instance ?: synchronized(this) {
            instance ?: Room.databaseBuilder(
                context.applicationContext,
                AppDatabase::class.java,
                "siea-prayer-display.db"
            ).build().also { instance = it }
        }
    }
}

suspend fun AppDatabase.replacePayload(payload: PrayerPayload) = withTransaction {
    val dao = prayerDao()
    dao.clearPrayerDays()
    dao.clearContent()
    dao.insertPrayerDays(payload.prayerDays.map(PrayerDayDto::toEntity))
    dao.insertContent(payload.content.map(ContentDto::toEntity))
    dao.insertMetadata(MetadataEntity("version", payload.version))
    dao.insertMetadata(MetadataEntity("mosque_name", payload.mosqueName))
    dao.insertMetadata(MetadataEntity("timezone", payload.timezone))
    dao.insertMetadata(MetadataEntity("last_sync", System.currentTimeMillis().toString()))
}
