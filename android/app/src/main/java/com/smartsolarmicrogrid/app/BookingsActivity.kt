package com.smartsolarmicrogrid.app

import android.app.Activity
import android.app.AlertDialog
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.*
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter

class BookingsActivity : Activity() {
    private lateinit var content: LinearLayout
    private lateinit var feedback: TextView
    private lateinit var createTab: Button
    private lateinit var listTab: Button
    private lateinit var session: SessionDatabaseHelper.MobileSession
    private var nodes = emptyList<ReservationApi.Node>()
    private var selectedNode: ReservationApi.Node? = null
    private var selectedSlot: ReservationApi.Slot? = null
    private var energyAmount = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_bookings)
        val savedSession = SessionDatabaseHelper(this).getSession()
        if (savedSession == null) { finish(); return }
        session = savedSession
        content = findViewById(R.id.reservationContent)
        feedback = findViewById(R.id.reservationFeedbackText)
        createTab = findViewById(R.id.createReservationTab)
        listTab = findViewById(R.id.myReservationsTab)
        findViewById<android.widget.ImageButton>(R.id.pageBackButton).setOnClickListener { finish() }
        AppNavigation.configure(this, AppNavigation.Destination.Bookings)
        createTab.setOnClickListener { showCreate() }
        listTab.setOnClickListener { showReservations() }

        if (session.role != "Prosumer") {
            createTab.visibility = View.GONE
            listTab.visibility = View.GONE
            clearContent()
            title("Reservations", "Prosumer mobile feature")
            content.addView(empty("Mobile reservation booking is available only to Prosumer accounts. Grid Operators and Backoffice users manage reservations in the web portal."))
        } else loadNodes()
    }

    private fun loadNodes() {
        setLoading("Loading stations...")
        Thread {
            ReservationApi.nodes(this, session.token).fold(
                onSuccess = { loaded -> runOnUiThread { nodes = loaded; hideMessage(); showCreate() } },
                onFailure = { showMessage(it.message ?: "Stations could not be loaded.", false) }
            )
        }.start()
    }

    private fun showCreate() {
        markTab(createTab); clearContent()
        title("Create Reservation", "Select an active station, available slot, and energy amount.")
        step("1", "Select")
        val card = card()
        card.addView(label("Select Station"))
        val stationSpinner = Spinner(this)
        stationSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item,
            listOf("Select a station") + nodes.map { "${it.name}  •  ${number(it.capacityKw)} kW" })
        val selectedIndex = nodes.indexOfFirst { it.id == selectedNode?.id }
        stationSpinner.setSelection(if (selectedIndex >= 0) selectedIndex + 1 else 0)
        card.addView(stationSpinner, matchWrap())
        card.addView(label("Available Slots (UTC)").apply { setPadding(0, dp(18), 0, dp(6)) })
        val slotContainer = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        card.addView(slotContainer, matchWrap())
        card.addView(label("Energy Amount (kWh)").apply { setPadding(0, dp(18), 0, dp(6)) })
        val energyInput = EditText(this).apply {
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
            hint = "Enter energy amount"; setText(energyAmount)
        }
        card.addView(energyInput, matchWrap())
        card.addView(info("Book up to 7 days ahead. Changes and cancellations require at least 12 hours' notice."))
        content.addView(card)
        val review = primaryButton("Review Reservation")
        content.addView(review, matchWrap(top = 16))

        stationSpinner.onItemSelectedListener = object : AdapterView.OnItemSelectedListener {
            override fun onNothingSelected(parent: AdapterView<*>?) = Unit
            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                if (position == 0) {
                    selectedNode = null; selectedSlot = null; slotContainer.removeAllViews()
                    slotContainer.addView(empty("Select a station to view available slots.")); return
                }
                val node = nodes[position - 1]
                if (selectedNode?.id != node.id) selectedSlot = null
                selectedNode = node
                loadSlots(node.id, slotContainer, selectedSlot?.id)
            }
        }
        review.setOnClickListener {
            energyAmount = energyInput.text.toString().trim()
            val energy = energyAmount.toDoubleOrNull()
            when {
                selectedNode == null -> showMessage("Select a microgrid station.", false)
                selectedSlot == null -> showMessage("Select an available booking slot.", false)
                energy == null || energy <= 0 -> showMessage("Enter a positive energy amount.", false)
                energy > selectedSlot!!.capacityKw -> showMessage("Energy amount cannot exceed the slot capacity.", false)
                else -> { hideMessage(); showReview() }
            }
        }
    }

    private fun loadSlots(nodeId: String, target: LinearLayout, selectedId: String? = null, includeReservedId: String? = null) {
        target.removeAllViews(); target.addView(empty("Loading available slots..."))
        Thread {
            ReservationApi.slots(this, session.token, nodeId).fold(onSuccess = { all ->
                val now = System.currentTimeMillis(); val limit = now + 7L * 24 * 60 * 60 * 1000
                val available = all.filter { slot ->
                    val start = epoch(slot.startTime)
                    slot.isActive && start > now && start <= limit && (slot.status == "Available" || slot.id == includeReservedId)
                }
                runOnUiThread {
                    target.removeAllViews()
                    if (available.isEmpty()) { target.addView(empty("No available slots within the next 7 days.")); return@runOnUiThread }
                    selectedSlot = available.firstOrNull { it.id == selectedId }
                    val group = RadioGroup(this).apply { orientation = RadioGroup.VERTICAL }
                    available.forEach { slot -> group.addView(RadioButton(this).apply {
                        text = "${utc(slot.startTime)} – ${utcTime(slot.endTime)}  •  ${number(slot.capacityKw)} kW\n${if (slot.status == "Available") "● Available" else "Current slot"}"
                        tag = slot; setPadding(dp(8), dp(8), dp(8), dp(8)); isChecked = slot.id == selectedId
                    }, matchWrap()) }
                    group.setOnCheckedChangeListener { radioGroup, checkedId -> selectedSlot = radioGroup.findViewById<RadioButton>(checkedId)?.tag as? ReservationApi.Slot }
                    target.addView(group)
                }
            }, onFailure = { showMessage(it.message ?: "Slots could not be loaded.", false) })
        }.start()
    }

    private fun showReview() {
        markTab(createTab); clearContent(); title("Review Reservation", "Confirm the details before creating the reservation."); step("2", "Review")
        content.addView(summaryCard(selectedNode!!, selectedSlot!!, energyAmount.toDouble()))
        content.addView(info("Your reservation will be created with Pending status."), matchWrap(top = 14))
        val confirmation = CheckBox(this).apply { text = "I confirm the reservation details"; setPadding(0, dp(12), 0, dp(8)) }
        content.addView(confirmation)
        val confirm = primaryButton("Confirm Reservation").apply { isEnabled = false }
        confirmation.setOnCheckedChangeListener { _, checked -> confirm.isEnabled = checked }
        confirm.setOnClickListener { createReservation(it as Button) }
        content.addView(confirm, matchWrap())
        content.addView(secondaryButton("Back") { showCreate() }, matchWrap(top = 8))
    }

    private fun createReservation(button: Button) {
        button.isEnabled = false; showMessage("Creating reservation...", null)
        Thread { ReservationApi.create(this, session.token, selectedNode!!.id, selectedSlot!!.id, energyAmount.toDouble()).fold(
            onSuccess = { runOnUiThread { hideMessage(); showConfirmation(it, "created") } },
            onFailure = { runOnUiThread { button.isEnabled = true }; showMessage(it.message ?: "Reservation could not be created.", false) }
        ) }.start()
    }

    private fun showReservations() {
        markTab(listTab); setLoading("Loading your reservations...")
        Thread { ReservationApi.reservations(this, session.token).fold(onSuccess = { reservations -> runOnUiThread {
            clearContent(); title("My Reservations", "View, modify, or cancel your energy reservations.")
            if (session.role == "Prosumer") content.addView(primaryButton("+ Create Reservation").apply { setOnClickListener { showCreate() } }, matchWrap(bottom = 12))
            if (reservations.isEmpty()) content.addView(empty("You have no reservations yet."))
            reservations.forEach { reservation ->
                val item = card(); item.addView(label(reservation.nodeName.ifBlank { reservation.nodeId }))
                item.addView(value("${utc(reservation.startTime)} – ${utcTime(reservation.endTime)}"))
                item.addView(value("${number(reservation.energyAmountKw)} kWh  •  ${reservation.status}"))
                item.setOnClickListener { showDetails(reservation.id) }; content.addView(item, matchWrap(bottom = 10))
            }
        } }, onFailure = { showMessage(it.message ?: "Reservations could not be loaded.", false) }) }.start()
    }

    private fun showDetails(id: String) {
        setLoading("Loading reservation...")
        Thread { ReservationApi.reservation(this, session.token, id).fold(
            onSuccess = { runOnUiThread { renderDetails(it) } },
            onFailure = { showMessage(it.message ?: "Reservation could not be loaded.", false) }
        ) }.start()
    }

    private fun renderDetails(reservation: ReservationApi.Reservation) {
        clearContent(); title("Reservation Details", reservation.status)
        val card = card(); detail(card, "Reservation ID", reservation.id); detail(card, "Station", reservation.nodeName.ifBlank { reservation.nodeId })
        detail(card, "Booking Slot", reservation.slotId); detail(card, "Scheduled Time (UTC)", "${utc(reservation.startTime)} – ${utcTime(reservation.endTime)}")
        detail(card, "Energy Amount", "${number(reservation.energyAmountKw)} kWh"); detail(card, "Status", reservation.status)
        detail(card, "Created", utc(reservation.createdAt)); detail(card, "Last Updated", utc(reservation.updatedAt)); reservation.cancelledAt?.let { detail(card, "Cancelled", utc(it)) }
        content.addView(card)
        val locked = reservation.status == "Cancelled" || reservation.status == "Completed"
        content.addView(primaryButton("Modify").apply { isEnabled = !locked; setOnClickListener { showEdit(reservation) } }, matchWrap(top = 14))
        content.addView(secondaryButton("Cancel Reservation") { confirmCancellation(reservation) }.apply { isEnabled = !locked; setTextColor(getColor(R.color.status_error)) }, matchWrap(top = 8))
        content.addView(secondaryButton("Back to Reservations") { showReservations() }, matchWrap(top = 8))
    }

    private fun showEdit(reservation: ReservationApi.Reservation) {
        clearContent(); title("Modify Reservation", "Change the slot or energy amount.")
        content.addView(info("Reservations cannot be modified when fewer than 12 hours remain."))
        val card = card(); detail(card, "Reservation ID", reservation.id); detail(card, "Station", reservation.nodeName.ifBlank { reservation.nodeId })
        card.addView(label("Available booking slot").apply { setPadding(0, dp(16), 0, dp(4)) })
        val slots = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }; card.addView(slots)
        selectedSlot = null; loadSlots(reservation.nodeId, slots, reservation.slotId, reservation.slotId)
        card.addView(label("Energy Amount (kWh)").apply { setPadding(0, dp(16), 0, dp(4)) })
        val energy = EditText(this).apply { inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL; setText(number(reservation.energyAmountKw)) }
        card.addView(energy); content.addView(card, matchWrap(top = 12))
        content.addView(primaryButton("Save Changes").apply { setOnClickListener {
            val amount = energy.text.toString().toDoubleOrNull(); val slot = selectedSlot
            if (slot == null || amount == null || amount <= 0) showMessage("Select a slot and enter a positive energy amount.", false)
            else updateReservation(reservation.id, slot.id, amount, this)
        } }, matchWrap(top = 14))
        content.addView(secondaryButton("Discard") { renderDetails(reservation) }, matchWrap(top = 8))
    }

    private fun updateReservation(id: String, slotId: String, energy: Double, button: Button) {
        button.isEnabled = false; showMessage("Saving changes...", null)
        Thread { ReservationApi.update(this, session.token, id, slotId, energy).fold(
            onSuccess = { runOnUiThread { hideMessage(); showConfirmation(it, "updated") } },
            onFailure = { runOnUiThread { button.isEnabled = true }; showMessage(it.message ?: "Reservation could not be updated.", false) }
        ) }.start()
    }

    private fun confirmCancellation(reservation: ReservationApi.Reservation) {
        AlertDialog.Builder(this).setTitle("Cancel reservation?")
            .setMessage("This reservation will be marked as Cancelled. It will not be permanently deleted.\n\n${reservation.nodeName}\n${utc(reservation.startTime)}")
            .setNegativeButton("Keep reservation", null).setPositiveButton("Cancel reservation") { _, _ -> cancelReservation(reservation.id) }.show()
    }

    private fun cancelReservation(id: String) {
        showMessage("Cancelling reservation...", null)
        Thread { ReservationApi.cancel(this, session.token, id).fold(
            onSuccess = { runOnUiThread { hideMessage(); showConfirmation(it, "cancelled") } },
            onFailure = { showMessage(it.message ?: "Reservation could not be cancelled.", false) }
        ) }.start()
    }

    private fun showConfirmation(reservation: ReservationApi.Reservation, operation: String) {
        clearContent(); content.addView(TextView(this).apply { text = "✓"; textSize = 64f; gravity = android.view.Gravity.CENTER; setTextColor(getColor(R.color.status_success)) })
        title("Reservation ${if (operation == "created") "Confirmed" else operation.replaceFirstChar { it.uppercase() }}", "Operation successful")
        val card = card(); detail(card, "Station", reservation.nodeName.ifBlank { reservation.nodeId }); detail(card, "Date & Time", "${utc(reservation.startTime)} – ${utcTime(reservation.endTime)}")
        detail(card, "Energy Amount", "${number(reservation.energyAmountKw)} kWh"); detail(card, "Reservation ID", reservation.id); detail(card, "Current Status", reservation.status); content.addView(card)
        content.addView(primaryButton("View Details").apply { setOnClickListener { showDetails(reservation.id) } }, matchWrap(top = 14))
        content.addView(secondaryButton("Done") { resetForm(); showReservations() }, matchWrap(top = 8))
    }

    private fun resetForm() { selectedNode = null; selectedSlot = null; energyAmount = "" }
    private fun clearContent() { content.removeAllViews(); hideMessage() }
    private fun setLoading(message: String) { clearContent(); content.addView(ProgressBar(this)); content.addView(empty(message)) }
    private fun showMessage(message: String, success: Boolean?) = runOnUiThread { feedback.visibility = View.VISIBLE; feedback.text = message; feedback.setTextColor(if (success == false) getColor(R.color.status_error) else if (success == true) getColor(R.color.status_success) else Color.DKGRAY) }
    private fun hideMessage() { feedback.visibility = View.GONE }
    private fun markTab(active: Button) { createTab.isEnabled = active !== createTab; listTab.isEnabled = active !== listTab }
    private fun title(text: String, subtitle: String) { content.addView(TextView(this).apply { this.text = text; textSize = 27f; setTextColor(Color.rgb(18, 39, 66)); setTypeface(typeface, android.graphics.Typeface.BOLD) }); content.addView(TextView(this).apply { this.text = subtitle; textSize = 14f; setTextColor(getColor(R.color.text_secondary)); setPadding(0, dp(4), 0, dp(14)) }) }
    private fun step(number: String, name: String) { content.addView(TextView(this).apply { text = "$number  $name     ○ Review     ○ Confirm"; textSize = 15f; setTextColor(getColor(R.color.status_success)); setPadding(0, 0, 0, dp(12)) }) }
    private fun card() = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(dp(16), dp(16), dp(16), dp(16)); setBackgroundResource(R.drawable.dashboard_card) }
    private fun label(text: String) = TextView(this).apply { this.text = text; textSize = 15f; setTextColor(Color.rgb(18, 39, 66)); setTypeface(typeface, android.graphics.Typeface.BOLD); setPadding(0, dp(4), 0, dp(6)) }
    private fun value(text: String) = TextView(this).apply { this.text = text; textSize = 14f; setTextColor(getColor(R.color.text_secondary)); setPadding(0, dp(3), 0, dp(3)) }
    private fun empty(text: String) = value(text).apply { setPadding(dp(10), dp(12), dp(10), dp(12)); setBackgroundColor(Color.rgb(244, 247, 250)) }
    private fun info(text: String) = value("ⓘ  $text").apply { setPadding(dp(12), dp(12), dp(12), dp(12)); setTextColor(getColor(R.color.brand_blue)); setBackgroundColor(Color.rgb(229, 244, 255)) }
    private fun detail(parent: LinearLayout, name: String, detail: String) { parent.addView(value(name)); parent.addView(label(detail)) }
    private fun summaryCard(node: ReservationApi.Node, slot: ReservationApi.Slot, energy: Double) = card().apply { addView(label("Reservation Summary")); detail(this, "Station", node.name); detail(this, "Date & Time (UTC)", "${utc(slot.startTime)} – ${utcTime(slot.endTime)}"); detail(this, "Energy Amount", "${number(energy)} kWh"); detail(this, "Initial Status", "Pending") }
    private fun primaryButton(text: String) = Button(this).apply { this.text = text; isAllCaps = false; backgroundTintList = ColorStateList.valueOf(Color.rgb(7, 151, 82)); setTextColor(Color.WHITE) }
    private fun secondaryButton(text: String, action: () -> Unit) = Button(this).apply { this.text = text; isAllCaps = false; setOnClickListener { action() } }
    private fun matchWrap(top: Int = 0, bottom: Int = 0) = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT).apply { topMargin = dp(top); bottomMargin = dp(bottom) }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun number(value: Double) = if (value % 1.0 == 0.0) value.toInt().toString() else "%.2f".format(value)
    private fun epoch(value: String): Long = runCatching { Instant.parse(value).toEpochMilli() }.getOrElse { runCatching { OffsetDateTime.parse(value).toInstant().toEpochMilli() }.getOrDefault(0) }
    private fun utc(value: String): String = runCatching { DateTimeFormatter.ofPattern("MMM dd, yyyy  HH:mm").withZone(ZoneOffset.UTC).format(Instant.ofEpochMilli(epoch(value))) + " UTC" }.getOrDefault(value)
    private fun utcTime(value: String): String = runCatching { DateTimeFormatter.ofPattern("HH:mm").withZone(ZoneOffset.UTC).format(Instant.ofEpochMilli(epoch(value))) + " UTC" }.getOrDefault(value)
}
