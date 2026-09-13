package com.siea.prayerdisplay.ui

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.NotificationsOff
import androidx.compose.material.icons.outlined.PhoneAndroid
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.siea.prayerdisplay.data.ContentEntity
import com.siea.prayerdisplay.domain.DisplayState
import com.siea.prayerdisplay.domain.PrayerRow
import kotlinx.coroutines.delay
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import kotlin.math.cos
import kotlin.math.min
import kotlin.math.sin

private val Navy = Color(0xFF061D2E)
private val NavyLight = Color(0xFF0B3047)
private val Ivory = Color(0xFFFFF7DF)
private val Gold = Color(0xFFD8AC4A)
private val Emerald = Color(0xFF00A86B)
private val Muted = Color(0xFFAAC0CB)
private val London = ZoneId.of("Europe/London")

@Composable
fun SIEAPrayerDisplay(state: DisplayState) {
    MaterialTheme(colorScheme = darkColorScheme(background = Navy, surface = Navy, primary = Gold)) {
        AppBackground {
            when (state) {
                DisplayState.Loading -> LoadingScreen()
                is DisplayState.Main -> MainScreen(state.rows)
                is DisplayState.Adhan -> AdhanScreen(state)
                is DisplayState.IqamahCountdown -> IqamahScreen(state)
                is DisplayState.DailyContent -> ContentScreen(state.item)
            }
        }
    }
}

@Composable
private fun AppBackground(content: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.radialGradient(
                    colors = listOf(NavyLight, Navy),
                    radius = 1_400f
                )
            )
    ) {
        Canvas(Modifier.fillMaxSize()) {
            drawRect(Gold.copy(alpha = .7f), style = Stroke(width = 2f))
            drawCircle(Gold.copy(alpha = .06f), radius = size.minDimension * .42f, center = center)
            drawCircle(Gold.copy(alpha = .04f), radius = size.minDimension * .32f, center = center)
        }
        content()
    }
}

@Composable
private fun Header(subtitle: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth()) {
        Text("SIEA", color = Ivory, fontSize = 48.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 6.sp)
        Text(subtitle, color = Gold, fontSize = 19.sp, letterSpacing = 4.sp)
    }
}

@Composable
private fun MainScreen(rows: List<PrayerRow>) {
    Column(Modifier.fillMaxSize().padding(horizontal = 44.dp, vertical = 26.dp)) {
        Header("PRAYER & IQAMAH TIMES")
        Spacer(Modifier.height(22.dp))
        Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically) {
            ClockPanel(Modifier.weight(.42f).fillMaxHeight())
            Spacer(Modifier.width(32.dp))
            PrayerTable(rows, Modifier.weight(.58f).fillMaxHeight())
        }
    }
}

@Composable
private fun ClockPanel(modifier: Modifier = Modifier) {
    var now by remember { mutableStateOf(ZonedDateTime.now(London)) }
    LaunchedEffect(Unit) {
        while (true) {
            now = ZonedDateTime.now(London)
            delay(1_000)
        }
    }
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        AnalogClock(now.toLocalTime(), Modifier.weight(1f).fillMaxWidth())
        Text(
            now.format(DateTimeFormatter.ofPattern("HH:mm")),
            color = Ivory,
            fontSize = 44.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .border(2.dp, Gold, RoundedCornerShape(24.dp))
                .padding(horizontal = 34.dp, vertical = 6.dp)
        )
        Spacer(Modifier.height(10.dp))
        Text(
            now.format(DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy")),
            color = Muted,
            fontSize = 17.sp
        )
    }
}

@Composable
private fun AnalogClock(time: LocalTime, modifier: Modifier = Modifier) {
    Canvas(modifier.padding(16.dp)) {
        val radius = min(size.width, size.height) * .43f
        val clockCenter = center
        drawCircle(Gold.copy(alpha = .14f), radius + 7f, clockCenter)
        drawCircle(Navy, radius, clockCenter)
        drawCircle(Gold, radius, clockCenter, style = Stroke(width = 7f))
        for (minute in 0 until 60) {
            val angle = Math.toRadians(minute * 6.0 - 90)
            val outer = Offset(
                clockCenter.x + cos(angle).toFloat() * radius * .94f,
                clockCenter.y + sin(angle).toFloat() * radius * .94f
            )
            val innerScale = if (minute % 5 == 0) .82f else .88f
            val inner = Offset(
                clockCenter.x + cos(angle).toFloat() * radius * innerScale,
                clockCenter.y + sin(angle).toFloat() * radius * innerScale
            )
            drawLine(Gold, inner, outer, strokeWidth = if (minute % 5 == 0) 6f else 2f, cap = StrokeCap.Round)
        }
        val secondAngle = time.second * 6f
        val minuteAngle = time.minute * 6f + time.second * .1f
        val hourAngle = (time.hour % 12) * 30f + time.minute * .5f
        rotate(hourAngle, clockCenter) {
            drawLine(Ivory, clockCenter, Offset(clockCenter.x, clockCenter.y - radius * .48f), 12f, StrokeCap.Round)
        }
        rotate(minuteAngle, clockCenter) {
            drawLine(Ivory, clockCenter, Offset(clockCenter.x, clockCenter.y - radius * .70f), 8f, StrokeCap.Round)
        }
        rotate(secondAngle, clockCenter) {
            drawLine(Emerald, clockCenter, Offset(clockCenter.x, clockCenter.y - radius * .76f), 3f, StrokeCap.Round)
        }
        drawCircle(Gold, 12f, clockCenter)
    }
}

@Composable
private fun PrayerTable(rows: List<PrayerRow>, modifier: Modifier = Modifier) {
    Column(modifier.border(1.dp, Gold.copy(alpha = .65f), RoundedCornerShape(14.dp))) {
        PrayerTableRow("PRAYER", "ADHAN", "IQAMAH", header = true)
        rows.forEach { row -> PrayerDataRow(row, Modifier.weight(1f)) }
    }
}

@Composable
private fun PrayerTableRow(prayer: String, adhan: String, iqamah: String, header: Boolean = false) {
    val size = if (header) 22.sp else 31.sp
    val weight = if (header) FontWeight.SemiBold else FontWeight.Bold
    Row(
        Modifier.fillMaxWidth().height(if (header) 60.dp else 90.dp).padding(horizontal = 24.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(prayer, color = if (header) Gold else Ivory, fontSize = size, fontWeight = weight, modifier = Modifier.weight(1.25f))
        Text(adhan, color = Ivory, fontSize = size, fontWeight = weight, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
        Text(iqamah, color = Ivory, fontSize = size, fontWeight = weight, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun PrayerDataRow(row: PrayerRow, modifier: Modifier = Modifier) {
    val background = if (row.isNext) Emerald.copy(alpha = .26f) else Color.Transparent
    Row(
        modifier
            .fillMaxWidth()
            .background(background)
            .border(.5.dp, Color.White.copy(alpha = .14f))
            .padding(horizontal = 24.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(Modifier.weight(1.25f)) {
            Text(row.name.displayName, color = Ivory, fontSize = 31.sp, fontWeight = FontWeight.ExtraBold)
            if (row.isTomorrow) Text("TOMORROW", color = Gold, fontSize = 11.sp, letterSpacing = 2.sp)
            else if (row.isNext) Text("NEXT PRAYER", color = Emerald, fontSize = 11.sp, letterSpacing = 2.sp)
        }
        Text(row.adhan, color = Ivory, fontSize = 34.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
        Text(row.iqamah, color = Ivory, fontSize = 34.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
    }
}

@Composable
private fun AdhanScreen(state: DisplayState.Adhan) {
    Column(
        Modifier.fillMaxSize().padding(36.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Header("PRAYER & IQAMAH TIMES")
        Column(
            Modifier.border(3.dp, Gold, RoundedCornerShape(topStart = 180.dp, topEnd = 180.dp, bottomStart = 16.dp, bottomEnd = 16.dp))
                .padding(horizontal = 120.dp, vertical = 55.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(state.prayer.displayName, color = Ivory, fontSize = 88.sp, fontWeight = FontWeight.ExtraBold)
            Text("ADHAN TIME", color = Gold, fontSize = 38.sp, fontWeight = FontWeight.Bold, letterSpacing = 6.sp)
            Text(state.time, color = Ivory, fontSize = 104.sp, fontWeight = FontWeight.ExtraBold)
        }
        Text("The main prayer timetable will return shortly", color = Muted, fontSize = 16.sp, letterSpacing = 2.sp)
    }
}

@Composable
private fun IqamahScreen(state: DisplayState.IqamahCountdown) {
    val transition = rememberInfiniteTransition(label = "mobile-pulse")
    val pulse by transition.animateFloat(
        initialValue = .82f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(700), RepeatMode.Reverse),
        label = "pulse"
    )
    val minutes = state.secondsRemaining / 60
    val seconds = state.secondsRemaining % 60
    Column(Modifier.fillMaxSize().padding(34.dp)) {
        Header("")
        Row(Modifier.fillMaxSize(), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(.7f), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("${state.prayer.displayName} IQAMAH", color = Ivory, fontSize = 42.sp, fontWeight = FontWeight.Bold)
                Box(contentAlignment = Alignment.Center, modifier = Modifier.size(430.dp)) {
                    Canvas(Modifier.fillMaxSize()) {
                        drawCircle(Emerald.copy(alpha = .16f))
                        drawCircle(Emerald, style = Stroke(width = 18f))
                    }
                    Text(
                        "%02d:%02d".format(minutes, seconds),
                        color = Ivory,
                        fontSize = 100.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                }
                Text("MINUTES REMAINING", color = Gold, fontSize = 20.sp, letterSpacing = 5.sp)
            }
            Column(
                Modifier.weight(.3f).fillMaxHeight().border(1.dp, Gold.copy(alpha = .7f)).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Box(contentAlignment = Alignment.Center, modifier = Modifier.size((130 * pulse).dp)) {
                    Icon(Icons.Outlined.PhoneAndroid, null, tint = Gold, modifier = Modifier.fillMaxSize())
                    Icon(Icons.Outlined.NotificationsOff, null, tint = Emerald, modifier = Modifier.size(60.dp))
                }
                Spacer(Modifier.height(24.dp))
                Text(
                    "PLEASE SILENCE\nYOUR MOBILE PHONE",
                    color = Ivory,
                    fontSize = 25.sp,
                    fontWeight = FontWeight.Bold,
                    textAlign = TextAlign.Center,
                    lineHeight = 38.sp
                )
            }
        }
    }
}

@Composable
private fun ContentScreen(item: ContentEntity) {
    val title = when (item.type.uppercase()) {
        "QURAN" -> "AYAH OF THE DAY"
        "HADITH" -> "HADITH OF THE DAY"
        else -> "WISDOM OF THE DAY"
    }
    Column(
        Modifier.fillMaxSize().padding(horizontal = 70.dp, vertical = 34.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        Header(title)
        Text(
            item.arabic,
            color = Ivory,
            fontSize = 55.sp,
            fontWeight = FontWeight.SemiBold,
            textAlign = TextAlign.Center,
            lineHeight = 84.sp,
            style = MaterialTheme.typography.displayMedium.copy(textDirection = TextDirection.Rtl),
            modifier = Modifier.fillMaxWidth()
        )
        Text(
            item.english,
            color = Ivory,
            fontFamily = FontFamily.Serif,
            fontSize = 32.sp,
            textAlign = TextAlign.Center,
            lineHeight = 45.sp,
            modifier = Modifier.fillMaxWidth(.86f)
        )
        Text(
            listOf(item.reference, item.scholar).filter(String::isNotBlank).joinToString(" · "),
            color = Gold,
            fontSize = 19.sp,
            modifier = Modifier.border(1.dp, Gold, RoundedCornerShape(20.dp)).padding(horizontal = 28.dp, vertical = 8.dp)
        )
    }
}

@Composable
private fun LoadingScreen() {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("SIEA", color = Ivory, fontSize = 72.sp, fontWeight = FontWeight.ExtraBold, letterSpacing = 8.sp)
    }
}
