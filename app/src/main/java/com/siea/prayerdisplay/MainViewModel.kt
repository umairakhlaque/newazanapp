package com.siea.prayerdisplay

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.siea.prayerdisplay.data.PrayerRepository
import com.siea.prayerdisplay.domain.DisplayState
import com.siea.prayerdisplay.domain.PrayerEngine
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.ZoneId

class MainViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = PrayerRepository(application)
    private val clock = MutableStateFlow(Instant.now())
    private val zone = ZoneId.of("Europe/London")

    val displayState = combine(repository.prayerDays, repository.content, clock) { days, content, instant ->
        PrayerEngine.evaluate(instant.atZone(zone), days, content)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), DisplayState.Loading)

    init {
        viewModelScope.launch {
            repository.initialise()
            runCatching { repository.syncIfChanged() }
        }
        viewModelScope.launch {
            while (isActive) {
                clock.value = Instant.now()
                delay(1_000)
            }
        }
    }
}

