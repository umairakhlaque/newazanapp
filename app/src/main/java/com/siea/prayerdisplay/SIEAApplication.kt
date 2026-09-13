package com.siea.prayerdisplay

import android.app.Application
import com.siea.prayerdisplay.data.SyncWorker

class SIEAApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        SyncWorker.schedule(this)
    }
}

