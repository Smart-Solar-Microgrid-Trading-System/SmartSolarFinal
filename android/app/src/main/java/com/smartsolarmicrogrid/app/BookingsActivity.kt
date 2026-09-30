package com.smartsolarmicrogrid.app

import android.app.Activity
import android.app.AlertDialog
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
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
        // Prepare the reservation screen and connect its local navigation controls.
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_bookings)

        val savedSession = SessionDatabaseHelper(this).getSession()

        if (savedSession == null) {
            finish()
            return
        }

        session = savedSession

        content = findViewById(R.id.reservationContent)
        feedback = findViewById(R.id.reservationFeedbackText)
        createTab = findViewById(R.id.createReservationTab)
        listTab = findViewById(R.id.myReservationsTab)

        findViewById<ImageButton>(R.id.pageBackButton)
            .setOnClickListener {
                finish()
            }

        AppNavigation.configure(
            this,
            AppNavigation.Destination.Bookings
        )

        createTab.setOnClickListener {
            showCreate()
        }

        listTab.setOnClickListener {
            showReservations()
        }

        if (session.role != "Prosumer") {
            createTab.visibility = View.GONE
            listTab.visibility = View.GONE

            clearContent()

            title(
                "Reservations",
                "Prosumer mobile feature"
            )

            content.addView(
                empty(
                    "Mobile reservation booking is available only to Prosumer accounts."
                )
            )
        } else {
            loadNodes()
        }
    }

    private fun loadNodes() {
        setLoading("Loading stations...")

        Thread {
            ReservationApi.nodes(
                this,
                session.token
            ).fold(
                onSuccess = { loaded ->

                    runOnUiThread {
                        nodes = loaded
                        hideMessage()
                        showReservations()
                    }
                },

                onFailure = {
                    showMessage(
                        it.message ?: "Stations could not be loaded.",
                        false
                    )
                }
            )
        }.start()
    }

    // ---------------------------------------------------------
    // MEMBER 3 - CREATE RESERVATION
    // ---------------------------------------------------------

    private fun showCreate() {
        markTab(createTab)
        clearContent()

        title(
            "Create Reservation",
            "Select a station, available slot and energy amount."
        )

        step("1", "Select")

        val card = card()

        card.addView(
            label("Select Station")
        )

        val stationSpinner = Spinner(this)

        stationSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            listOf("Select a station") +
                    nodes.map {
                        "${it.name} • ${number(it.capacityKw)} kW"
                    }
        )

        val selectedIndex =
            nodes.indexOfFirst {
                it.id == selectedNode?.id
            }

        stationSpinner.setSelection(
            if (selectedIndex >= 0) {
                selectedIndex + 1
            } else {
                0
            }
        )

        card.addView(
            stationSpinner,
            matchWrap()
        )

        card.addView(
            label("Available Slots (UTC)").apply {
                setPadding(
                    0,
                    dp(18),
                    0,
                    dp(6)
                )
            }
        )

        val slotContainer =
            LinearLayout(this).apply {
                orientation = LinearLayout.VERTICAL
            }

        card.addView(
            slotContainer,
            matchWrap()
        )

        card.addView(
            label("Energy Amount (kWh)").apply {
                setPadding(
                    0,
                    dp(18),
                    0,
                    dp(6)
                )
            }
        )

        val energyInput =
            EditText(this).apply {

                inputType =
                    android.text.InputType.TYPE_CLASS_NUMBER or
                            android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL

                hint = "Enter energy amount"

                setText(energyAmount)
            }

        card.addView(
            energyInput,
            matchWrap()
        )

        card.addView(
            info(
                "Bookings can be made up to 7 days ahead. " +
                        "Changes and cancellations require at least 12 hours' notice."
            )
        )

        content.addView(card)

        val review =
            primaryButton(
                "Review Reservation"
            )

        content.addView(
            review,
            matchWrap(top = 16)
        )

        stationSpinner.onItemSelectedListener =
            object : AdapterView.OnItemSelectedListener {

                override fun onNothingSelected(
                    parent: AdapterView<*>?
                ) = Unit

                override fun onItemSelected(
                    parent: AdapterView<*>?,
                    view: View?,
                    position: Int,
                    id: Long
                ) {

                    if (position == 0) {

                        selectedNode = null
                        selectedSlot = null

                        slotContainer.removeAllViews()

                        slotContainer.addView(
                            empty(
                                "Select a station to view available slots."
                            )
                        )

                        return
                    }

                    val node =
                        nodes[position - 1]

                    if (selectedNode?.id != node.id) {
                        selectedSlot = null
                    }

                    selectedNode = node

                    loadSlots(
                        node.id,
                        slotContainer,
                        selectedSlot?.id
                    )
                }
            }

        review.setOnClickListener {

            energyAmount =
                energyInput.text
                    .toString()
                    .trim()

            val energy =
                energyAmount.toDoubleOrNull()

            when {

                selectedNode == null -> {
                    showMessage(
                        "Select a microgrid station.",
                        false
                    )
                }

                selectedSlot == null -> {
                    showMessage(
                        "Select an available booking slot.",
                        false
                    )
                }

                energy == null || energy <= 0 -> {
                    showMessage(
                        "Enter a positive energy amount.",
                        false
                    )
                }

                energy > selectedSlot!!.capacityKw -> {
                    showMessage(
                        "Energy amount cannot exceed the slot capacity.",
                        false
                    )
                }

                else -> {
                    hideMessage()
                    showReview()
                }
            }
        }
    }

    private fun loadSlots(
        nodeId: String,
        target: LinearLayout,
        selectedId: String? = null,
        includeReservedId: String? = null
    ) {

        target.removeAllViews()

        target.addView(
            empty("Loading available slots...")
        )

        Thread {

            ReservationApi.slots(
                this,
                session.token,
                nodeId
            ).fold(

                onSuccess = { all ->

                    val now =
                        System.currentTimeMillis()

                    val limit =
                        now + 7L * 24 * 60 * 60 * 1000

                    val available =
                        all.filter { slot ->

                            val start =
                                epoch(slot.startTime)

                            slot.isActive &&
                                    start > now &&
                                    start <= limit &&
                                    (
                                            slot.status == "Available" ||
                                                    slot.id == includeReservedId
                                            )
                        }

                    runOnUiThread {

                        target.removeAllViews()

                        if (available.isEmpty()) {

                            target.addView(
                                empty(
                                    "No available slots within the next 7 days."
                                )
                            )

                            return@runOnUiThread
                        }

                        selectedSlot =
                            available.firstOrNull {
                                it.id == selectedId
                            }

                        val group =
                            RadioGroup(this).apply {
                                orientation =
                                    RadioGroup.VERTICAL
                            }

                        available.forEach { slot ->

                            group.addView(
                                RadioButton(this).apply {

                                    text =
                                        "${utc(slot.startTime)} – " +
                                                "${utcTime(slot.endTime)} • " +
                                                "${number(slot.capacityKw)} kW\n" +
                                                if (slot.status == "Available") {
                                                    "● Available"
                                                } else {
                                                    "Current slot"
                                                }

                                    tag = slot

                                    setPadding(
                                        dp(8),
                                        dp(8),
                                        dp(8),
                                        dp(8)
                                    )

                                    isChecked =
                                        slot.id == selectedId
                                },
                                matchWrap()
                            )
                        }

                        group.setOnCheckedChangeListener {
                                radioGroup,
                                checkedId ->

                            selectedSlot =
                                radioGroup
                                    .findViewById<RadioButton>(
                                        checkedId
                                    )
                                    ?.tag as? ReservationApi.Slot
                        }

                        target.addView(group)
                    }
                },

                onFailure = {
                    showMessage(
                        it.message
                            ?: "Slots could not be loaded.",
                        false
                    )
                }
            )

        }.start()
    }

    private fun showReview() {
        markTab(createTab)
        clearContent()

        title(
            "Review Reservation",
            "Confirm the details before creating the reservation."
        )

        step("2", "Review")

        content.addView(
            summaryCard(
                selectedNode!!,
                selectedSlot!!,
                energyAmount.toDouble()
            )
        )

        content.addView(
            info(
                "Your reservation will be created with Pending status."
            ),
            matchWrap(top = 14)
        )

        val confirmation =
            CheckBox(this).apply {
                text =
                    "I confirm the reservation details"

                setPadding(
                    0,
                    dp(12),
                    0,
                    dp(8)
                )
            }

        content.addView(confirmation)

        val confirm =
            primaryButton(
                "Confirm Reservation"
            ).apply {
                isEnabled = false
            }

        confirmation.setOnCheckedChangeListener {
                _,
                checked ->

            confirm.isEnabled = checked
        }

        confirm.setOnClickListener {
            createReservation(
                it as Button
            )
        }

        content.addView(
            confirm,
            matchWrap()
        )

        content.addView(
            secondaryButton(
                "Back"
            ) {
                showCreate()
            },
            matchWrap(top = 8)
        )
    }

    private fun createReservation(
        button: Button
    ) {

        button.isEnabled = false

        showMessage(
            "Creating reservation...",
            null
        )

        Thread {

            ReservationApi.create(
                this,
                session.token,
                selectedNode!!.id,
                selectedSlot!!.id,
                energyAmount.toDouble()
            ).fold(

                onSuccess = {
                    runOnUiThread {
                        hideMessage()

                        showConfirmation(
                            it,
                            "created"
                        )
                    }
                },

                onFailure = {

                    runOnUiThread {
                        button.isEnabled = true
                    }

                    showMessage(
                        it.message
                            ?: "Reservation could not be created.",
                        false
                    )
                }
            )

        }.start()
    }

    // ---------------------------------------------------------
    // MEMBER 4 - MY RESERVATIONS
    // ---------------------------------------------------------

    private fun showReservations() {
        markTab(listTab)
        clearContent()

        title(
            "My Reservations",
            "View your current, pending and previous energy reservations."
        )

        showReservationFilters()

        loadCurrentReservations()
    }

    private fun showReservationFilters() {

        val row =
            LinearLayout(this).apply {
                orientation =
                    LinearLayout.HORIZONTAL
            }

        val currentButton =
            filterButton(
                "Current"
            ) {
                loadCurrentReservations()
            }

        val pendingButton =
            filterButton(
                "Pending"
            ) {
                loadPendingReservations()
            }

        val historyButton =
            filterButton(
                "History"
            ) {
                loadHistoryReservations()
            }

        row.addView(
            currentButton,
            weightedButton()
        )

        row.addView(
            pendingButton,
            weightedButton()
        )

        row.addView(
            historyButton,
            weightedButton()
        )

        content.addView(
            row,
            matchWrap(bottom = 12)
        )

        val searchInput =
            EditText(this).apply {

                hint =
                    "Search reservation ID or station"

                setSingleLine(true)
            }

        content.addView(
            searchInput,
            matchWrap(bottom = 8)
        )

        val statusSpinner =
            Spinner(this)

        val statuses =
            listOf(
                "All Status",
                "Pending",
                "Approved",
                "Completed",
                "Cancelled",
                "Rejected"
            )

        statusSpinner.adapter =
            ArrayAdapter(
                this,
                android.R.layout
                    .simple_spinner_dropdown_item,
                statuses
            )

        content.addView(
            statusSpinner,
            matchWrap(bottom = 8)
        )

        val searchButton =
            primaryButton(
                "Search / Filter"
            )

        searchButton.setOnClickListener {

            val search =
                searchInput.text
                    .toString()
                    .trim()

            val selectedStatus =
                statusSpinner
                    .selectedItem
                    .toString()

            val status =
                if (
                    selectedStatus ==
                    "All Status"
                ) {
                    null
                } else {
                    selectedStatus
                }

            loadFilteredReservations(
                search.takeIf {
                    it.isNotBlank()
                },
                status
            )
        }

        content.addView(
            searchButton,
            matchWrap(bottom = 8)
        )

        val showAllButton =
            secondaryButton(
                "Show All Reservations"
            ) {
                loadAllReservations()
            }

        content.addView(
            showAllButton,
            matchWrap(bottom = 16)
        )

        content.addView(
            primaryButton(
                "+ Create Reservation"
            ).apply {

                setOnClickListener {
                    showCreate()
                }

            },
            matchWrap(bottom = 16)
        )
    }

    private fun loadCurrentReservations() {
        showBookingLoading(
            "Loading current bookings..."
        )

        Thread {

            ReservationApi.currentReservations(
                this,
                session.token
            ).fold(

                onSuccess = {
                    runOnUiThread {
                        renderReservationList(
                            "Current Bookings",
                            it
                        )
                    }
                },

                onFailure = {
                    showMessage(
                        it.message
                            ?: "Current bookings could not be loaded.",
                        false
                    )
                }
            )

        }.start()
    }

    private fun loadPendingReservations() {
        showBookingLoading(
            "Loading pending reservations..."
        )

        Thread {

            ReservationApi.pendingReservations(
                this,
                session.token
            ).fold(

                onSuccess = {
                    runOnUiThread {
                        renderReservationList(
                            "Pending Reservations",
                            it
                        )
                    }
                },

                onFailure = {
                    showMessage(
                        it.message
                            ?: "Pending reservations could not be loaded.",
                        false
                    )
                }
            )

        }.start()
    }

    private fun loadHistoryReservations() {
        showBookingLoading(
            "Loading booking history..."
        )

        Thread {

            ReservationApi.historyReservations(
                this,
                session.token
            ).fold(

                onSuccess = {
                    runOnUiThread {
                        renderReservationList(
                            "Booking History",
                            it
                        )
                    }
                },

                onFailure = {
                    showMessage(
                        it.message
                            ?: "Booking history could not be loaded.",
                        false
                    )
                }
            )

        }.start()
    }

    private fun loadAllReservations() {
        showBookingLoading(
            "Loading reservations..."
        )

        Thread {

            ReservationApi.reservations(
                this,
                session.token
            ).fold(

                onSuccess = {
                    runOnUiThread {
                        renderReservationList(
                            "All Reservations",
                            it
                        )
                    }
                },

                onFailure = {
                    showMessage(
                        it.message
                            ?: "Reservations could not be loaded.",
                        false
                    )
                }
            )

        }.start()
    }

    private fun loadFilteredReservations(
        search: String?,
        status: String?
    ) {

        showBookingLoading(
            "Searching reservations..."
        )

        Thread {

            ReservationApi.filteredReservations(
                context = this,
                token = session.token,
                search = search,
                status = status
            ).fold(

                onSuccess = {

                    runOnUiThread {
                        renderReservationList(
                            "Search Results",
                            it
                        )
                    }
                },

                onFailure = {
                    showMessage(
                        it.message
                            ?: "Reservations could not be filtered.",
                        false
                    )
                }
            )

        }.start()
    }

    private fun showBookingLoading(
        message: String
    ) {

        runOnUiThread {

            val oldResult =
                content.findViewWithTag<View>(
                    "booking_results"
                )

            if (oldResult != null) {
                content.removeView(
                    oldResult
                )
            }

            val loadingContainer =
                LinearLayout(this).apply {

                    tag = "booking_results"

                    orientation =
                        LinearLayout.VERTICAL

                    addView(
                        ProgressBar(this@BookingsActivity)
                    )

                    addView(
                        empty(message)
                    )
                }

            content.addView(
                loadingContainer
            )
        }
    }

    private fun renderReservationList(
        heading: String,
        reservations:
        List<ReservationApi.Reservation>
    ) {

        hideMessage()

        val existing =
            content.findViewWithTag<View>(
                "booking_results"
            )

        if (existing != null) {
            content.removeView(
                existing
            )
        }

        val results =
            LinearLayout(this).apply {

                tag = "booking_results"

                orientation =
                    LinearLayout.VERTICAL
            }

        results.addView(
            label(
                "$heading (${reservations.size})"
            ).apply {

                textSize = 19f

                setPadding(
                    0,
                    dp(4),
                    0,
                    dp(12)
                )
            }
        )

        if (reservations.isEmpty()) {

            results.addView(
                empty(
                    "No reservations found."
                )
            )

            content.addView(results)

            return
        }

        reservations.forEach {
                reservation ->

            val item =
                card()

            item.addView(
                label(
                    reservation.nodeName
                        .ifBlank {
                            reservation.nodeId
                        }
                )
            )

            item.addView(
                value(
                    "${utc(reservation.startTime)} – " +
                            utcTime(
                                reservation.endTime
                            )
                )
            )

            item.addView(
                value(
                    "${number(reservation.energyAmountKw)} kWh"
                )
            )

            item.addView(
                statusText(
                    reservation.status
                )
            )

            item.addView(
                value(
                    "Reservation ID: ${reservation.id}"
                )
            )

            item.setOnClickListener {
                showDetails(
                    reservation.id
                )
            }

            results.addView(
                item,
                matchWrap(bottom = 10)
            )
        }

        content.addView(results)
    }

    // ---------------------------------------------------------
    // MEMBER 4 - RESERVATION DETAILS
    // ---------------------------------------------------------

    private fun showDetails(
        id: String
    ) {

        setLoading(
            "Loading reservation..."
        )

        Thread {

            ReservationApi.reservation(
                this,
                session.token,
                id
            ).fold(

                onSuccess = {
                    runOnUiThread {
                        renderDetails(it)
                    }
                },

                onFailure = {
                    showMessage(
                        it.message
                            ?: "Reservation could not be loaded.",
                        false
                    )
                }
            )

        }.start()
    }

    private fun renderDetails(
        reservation:
        ReservationApi.Reservation
    ) {
        // Present the selected reservation in a compact, readable details card.
        clearContent()

        title(
            "Reservation Details",
            "View your energy reservation information."
        )

        content.addView(
            statusText(reservation.status),
            wrapContent(bottom = 12)
        )

        val card =
            card()

        card.addView(
            label("Reservation information").apply {
                textSize = 17f
                setPadding(0, 0, 0, dp(8))
            }
        )

        detailRow(
            card,
            "Reservation ID",
            reservation.id
        )

        detailRow(
            card,
            "Station",
            reservation.nodeName
                .ifBlank {
                    reservation.nodeId
                }
        )

        detailRow(
            card,
            "Booking Slot",
            slotDisplayName(reservation.startTime)
        )

        detailRow(
            card,
            "Scheduled Time (UTC)",
            "${utc(reservation.startTime)} – " +
                    utcTime(
                        reservation.endTime
                    )
        )

        detailRow(
            card,
            "Energy Amount",
            "${number(reservation.energyAmountKw)} kWh"
        )

        detailRow(
            card,
            "Status",
            reservation.status
        )

        detailRow(
            card,
            "Created",
            utc(
                reservation.createdAt
            )
        )

        detailRow(
            card,
            "Last Updated",
            utc(
                reservation.updatedAt
            )
        )

        reservation.cancelledAt
            ?.let {

                detailRow(
                    card,
                    "Cancelled",
                    utc(it)
                )
            }

        content.addView(card)

        if (reservation.status.equals("Approved", ignoreCase = true)) {

            val transactionQrButton =
                primaryButton(
                    "View Transaction QR"
                )

            transactionQrButton.setOnClickListener {
                startActivity(
                    Intent(
                        this,
                        TransactionQrActivity::class.java
                    ).putExtra(
                        "reservationId",
                        reservation.id
                    )
                )
            }

            content.addView(
                transactionQrButton,
                matchWrap(top = 14)
            )
        }

        val locked =
            reservation.status == "Cancelled" ||
                    reservation.status == "Completed" ||
                    reservation.status == "Rejected"

        content.addView(
            primaryButton(
                "Modify"
            ).apply {

                isEnabled = !locked

                setOnClickListener {
                    showEdit(
                        reservation
                    )
                }
            },
            matchWrap(top = if (reservation.status.equals("Approved", ignoreCase = true)) 8 else 14)
        )

        content.addView(
            dangerButton(
                "Cancel Reservation"
            ) {
                confirmCancellation(
                    reservation
                )
            }.apply {

                isEnabled = !locked

                setTextColor(
                    getColor(
                        R.color.status_error
                    )
                )
            },
            matchWrap(top = 8)
        )

        content.addView(
            secondaryButton(
                "Back to My Reservations"
            ) {
                showReservations()
            },
            matchWrap(top = 8)
        )
    }

    // ---------------------------------------------------------
    // MEMBER 3 - EDIT / CANCEL
    // ---------------------------------------------------------

    private fun showEdit(
        reservation:
        ReservationApi.Reservation
    ) {

        clearContent()

        title(
            "Modify Reservation",
            "Change the slot or energy amount."
        )

        content.addView(
            info(
                "Reservations cannot be modified when fewer than 12 hours remain."
            )
        )

        val card =
            card()

        detail(
            card,
            "Reservation ID",
            reservation.id
        )

        detail(
            card,
            "Station",
            reservation.nodeName
                .ifBlank {
                    reservation.nodeId
                }
        )

        card.addView(
            label(
                "Available booking slot"
            ).apply {

                setPadding(
                    0,
                    dp(16),
                    0,
                    dp(4)
                )
            }
        )

        val slots =
            LinearLayout(this).apply {
                orientation =
                    LinearLayout.VERTICAL
            }

        card.addView(slots)

        selectedSlot = null

        loadSlots(
            reservation.nodeId,
            slots,
            reservation.slotId,
            reservation.slotId
        )

        card.addView(
            label(
                "Energy Amount (kWh)"
            ).apply {

                setPadding(
                    0,
                    dp(16),
                    0,
                    dp(4)
                )
            }
        )

        val energy =
            EditText(this).apply {

                inputType =
                    android.text.InputType.TYPE_CLASS_NUMBER or
                            android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL

                setText(
                    number(
                        reservation.energyAmountKw
                    )
                )
            }

        card.addView(energy)

        content.addView(
            card,
            matchWrap(top = 12)
        )

        content.addView(
            primaryButton(
                "Save Changes"
            ).apply {

                setOnClickListener {

                    val amount =
                        energy.text
                            .toString()
                            .toDoubleOrNull()

                    val slot =
                        selectedSlot

                    if (
                        slot == null ||
                        amount == null ||
                        amount <= 0
                    ) {

                        showMessage(
                            "Select a slot and enter a positive energy amount.",
                            false
                        )

                    } else if (
                        amount >
                        slot.capacityKw
                    ) {

                        showMessage(
                            "Energy amount cannot exceed the slot capacity.",
                            false
                        )

                    } else {

                        updateReservation(
                            reservation.id,
                            slot.id,
                            amount,
                            this
                        )
                    }
                }
            },
            matchWrap(top = 14)
        )

        content.addView(
            secondaryButton(
                "Discard"
            ) {
                renderDetails(
                    reservation
                )
            },
            matchWrap(top = 8)
        )
    }

    private fun updateReservation(
        id: String,
        slotId: String,
        energy: Double,
        button: Button
    ) {

        button.isEnabled = false

        showMessage(
            "Saving changes...",
            null
        )

        Thread {

            ReservationApi.update(
                this,
                session.token,
                id,
                slotId,
                energy
            ).fold(

                onSuccess = {
                    runOnUiThread {

                        hideMessage()

                        showConfirmation(
                            it,
                            "updated"
                        )
                    }
                },

                onFailure = {

                    runOnUiThread {
                        button.isEnabled = true
                    }

                    showMessage(
                        it.message
                            ?: "Reservation could not be updated.",
                        false
                    )
                }
            )

        }.start()
    }

    private fun confirmCancellation(
        reservation:
        ReservationApi.Reservation
    ) {

        AlertDialog.Builder(this)
            .setTitle(
                "Cancel reservation?"
            )
            .setMessage(
                "This reservation will be marked as Cancelled. " +
                        "It will not be permanently deleted.\n\n" +
                        "${reservation.nodeName}\n" +
                        utc(
                            reservation.startTime
                        )
            )
            .setNegativeButton(
                "Keep reservation",
                null
            )
            .setPositiveButton(
                "Cancel reservation"
            ) {
                    _,
                    _ ->

                cancelReservation(
                    reservation.id
                )
            }
            .show()
    }

    private fun cancelReservation(
        id: String
    ) {

        showMessage(
            "Cancelling reservation...",
            null
        )

        Thread {

            ReservationApi.cancel(
                this,
                session.token,
                id
            ).fold(

                onSuccess = {
                    runOnUiThread {

                        hideMessage()

                        showConfirmation(
                            it,
                            "cancelled"
                        )
                    }
                },

                onFailure = {
                    showMessage(
                        it.message
                            ?: "Reservation could not be cancelled.",
                        false
                    )
                }
            )

        }.start()
    }

    private fun showConfirmation(
        reservation:
        ReservationApi.Reservation,
        operation: String
    ) {

        clearContent()

        content.addView(
            TextView(this).apply {

                text = "✓"
                textSize = 64f

                gravity =
                    android.view.Gravity.CENTER

                setTextColor(
                    getColor(
                        R.color.status_success
                    )
                )
            }
        )

        title(
            "Reservation ${
                if (operation == "created") {
                    "Confirmed"
                } else {
                    operation.replaceFirstChar {
                        it.uppercase()
                    }
                }
            }",
            "Operation successful"
        )

        val card =
            card()

        detail(
            card,
            "Station",
            reservation.nodeName
                .ifBlank {
                    reservation.nodeId
                }
        )

        detail(
            card,
            "Date & Time",
            "${utc(reservation.startTime)} – " +
                    utcTime(
                        reservation.endTime
                    )
        )

        detail(
            card,
            "Energy Amount",
            "${number(reservation.energyAmountKw)} kWh"
        )

        detail(
            card,
            "Reservation ID",
            reservation.id
        )

        detail(
            card,
            "Current Status",
            reservation.status
        )

        content.addView(card)

        content.addView(
            primaryButton(
                "View Details"
            ).apply {

                setOnClickListener {
                    showDetails(
                        reservation.id
                    )
                }
            },
            matchWrap(top = 14)
        )

        content.addView(
            secondaryButton(
                "Done"
            ) {

                resetForm()
                showReservations()

            },
            matchWrap(top = 8)
        )
    }

    // ---------------------------------------------------------
    // UI HELPERS
    // ---------------------------------------------------------

    private fun resetForm() {
        selectedNode = null
        selectedSlot = null
        energyAmount = ""
    }

    private fun clearContent() {
        content.removeAllViews()
        hideMessage()
    }

    private fun setLoading(
        message: String
    ) {

        clearContent()

        content.addView(
            ProgressBar(this)
        )

        content.addView(
            empty(message)
        )
    }

    private fun showMessage(
        message: String,
        success: Boolean?
    ) = runOnUiThread {

        feedback.visibility =
            View.VISIBLE

        feedback.text =
            message

        feedback.setTextColor(
            when (success) {

                false ->
                    getColor(
                        R.color.status_error
                    )

                true ->
                    getColor(
                        R.color.status_success
                    )

                null ->
                    Color.DKGRAY
            }
        )
    }

    private fun hideMessage() {
        feedback.visibility =
            View.GONE
    }

    private fun markTab(
        active: Button
    ) {
        // Show which reservation tab is active without changing shared navigation.
        createTab.isEnabled = true
        listTab.isEnabled = true
        createTab.isSelected = active === createTab
        listTab.isSelected = active === listTab

        styleTab(
            createTab,
            active === createTab
        )

        styleTab(
            listTab,
            active === listTab
        )
    }

    private fun styleTab(
        button: Button,
        active: Boolean
    ) {
        // Apply a simple local tab style that matches the reservation screen.
        button.backgroundTintList = null
        button.elevation = 0f
        button.setTextColor(
            if (active) {
                Color.WHITE
            } else {
                getColor(R.color.text_secondary)
            }
        )
        button.background = roundedBackground(
            if (active) {
                getColor(R.color.brand_blue)
            } else {
                Color.rgb(235, 241, 247)
            }
        )
    }

    private fun title(
        text: String,
        subtitle: String
    ) {

        content.addView(
            TextView(this).apply {

                this.text = text
                textSize = 27f

                setTextColor(
                    Color.rgb(
                        18,
                        39,
                        66
                    )
                )

                setTypeface(
                    typeface,
                    android.graphics.Typeface.BOLD
                )
            }
        )

        content.addView(
            TextView(this).apply {

                this.text =
                    subtitle

                textSize =
                    14f

                setTextColor(
                    getColor(
                        R.color.text_secondary
                    )
                )

                setPadding(
                    0,
                    dp(4),
                    0,
                    dp(14)
                )
            }
        )
    }

    private fun step(
        number: String,
        name: String
    ) {

        content.addView(
            TextView(this).apply {

                text =
                    "$number  $name     ○ Review     ○ Confirm"

                textSize =
                    15f

                setTextColor(
                    getColor(
                        R.color.status_success
                    )
                )

                setPadding(
                    0,
                    0,
                    0,
                    dp(12)
                )
            }
        )
    }

    private fun card() =
        LinearLayout(this).apply {

            orientation =
                LinearLayout.VERTICAL

            setPadding(
                dp(16),
                dp(16),
                dp(16),
                dp(16)
            )

            setBackgroundResource(
                R.drawable.dashboard_card
            )
        }

    private fun label(
        text: String
    ) =
        TextView(this).apply {

            this.text =
                text

            textSize =
                15f

            setTextColor(
                Color.rgb(
                    18,
                    39,
                    66
                )
            )

            setTypeface(
                typeface,
                android.graphics.Typeface.BOLD
            )

            setPadding(
                0,
                dp(4),
                0,
                dp(6)
            )
        }

    private fun value(
        text: String
    ) =
        TextView(this).apply {

            this.text =
                text

            textSize =
                14f

            setTextColor(
                getColor(
                    R.color.text_secondary
                )
            )

            setPadding(
                0,
                dp(3),
                0,
                dp(3)
            )
        }

    private fun statusText(
        status: String
    ) =
        TextView(this).apply {
            // Display the reservation status as a small badge.
            text =
                "● $status"

            textSize =
                14f

            setTypeface(
                typeface,
                android.graphics.Typeface.BOLD
            )

            setPadding(
                dp(12),
                dp(7),
                dp(12),
                dp(7)
            )

            val statusColor =
                when (status) {

                    "Approved",
                    "Completed" ->
                        getColor(
                            R.color.status_success
                        )

                    "Rejected",
                    "Cancelled" ->
                        getColor(
                            R.color.status_error
                        )

                    else ->
                        getColor(
                            R.color.brand_blue
                        )
                }

            setTextColor(statusColor)
            background = roundedBackground(
                colorWithAlpha(statusColor, 24),
                statusColor
            )
        }

    private fun empty(
        text: String
    ) =
        value(text).apply {

            setPadding(
                dp(10),
                dp(12),
                dp(10),
                dp(12)
            )

            setBackgroundColor(
                Color.rgb(
                    244,
                    247,
                    250
                )
            )
        }

    private fun info(
        text: String
    ) =
        value(
            "ⓘ  $text"
        ).apply {

            setPadding(
                dp(12),
                dp(12),
                dp(12),
                dp(12)
            )

            setTextColor(
                getColor(
                    R.color.brand_blue
                )
            )

            setBackgroundColor(
                Color.rgb(
                    229,
                    244,
                    255
                )
            )
        }

    private fun detail(
        parent: LinearLayout,
        name: String,
        detail: String
    ) {
        // Add a stacked label and value to summary-style cards.
        parent.addView(
            value(name)
        )

        parent.addView(
            label(detail)
        )
    }

    private fun detailRow(
        parent: LinearLayout,
        name: String,
        detail: String
    ) {
        // Add one aligned label and value row to the reservation details card.
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.TOP
            setPadding(0, dp(10), 0, dp(10))
        }

        row.addView(
            value(name).apply {
                setPadding(0, 0, dp(12), 0)
            },
            LinearLayout.LayoutParams(
                0,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                0.42f
            )
        )

        row.addView(
            label(detail).apply {
                textSize = 14f
                setPadding(0, 0, 0, 0)
            },
            LinearLayout.LayoutParams(
                0,
                LinearLayout.LayoutParams.WRAP_CONTENT,
                0.58f
            )
        )

        parent.addView(row)
        parent.addView(
            View(this).apply {
                setBackgroundColor(Color.rgb(220, 229, 238))
            },
            LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                dp(1)
            )
        )
    }

    private fun summaryCard(
        node: ReservationApi.Node,
        slot: ReservationApi.Slot,
        energy: Double
    ) =
        card().apply {

            addView(
                label(
                    "Reservation Summary"
                )
            )

            detail(
                this,
                "Station",
                node.name
            )

            detail(
                this,
                "Date & Time (UTC)",
                "${utc(slot.startTime)} – " +
                        utcTime(
                            slot.endTime
                        )
            )

            detail(
                this,
                "Energy Amount",
                "${number(energy)} kWh"
            )

            detail(
                this,
                "Initial Status",
                "Pending"
            )
        }

    private fun primaryButton(
        text: String
    ) =
        Button(this).apply {

            this.text =
                text

            isAllCaps =
                false

            backgroundTintList =
                ColorStateList.valueOf(
                    Color.rgb(
                        7,
                        151,
                        82
                    )
                )

            setTextColor(
                Color.WHITE
            )
        }

    private fun filterButton(
        text: String,
        action: () -> Unit
    ) =
        Button(this).apply {

            this.text =
                text

            textSize =
                12f

            isAllCaps =
                false

            setOnClickListener {
                action()
            }
        }

    private fun secondaryButton(
        text: String,
        action: () -> Unit
    ) =
        Button(this).apply {

            this.text =
                text

            isAllCaps =
                false

            setOnClickListener {
                action()
            }
        }

    private fun dangerButton(
        text: String,
        action: () -> Unit
    ) =
        Button(this).apply {
            // Use a restrained outline for the destructive reservation action.
            this.text = text
            isAllCaps = false
            elevation = 0f
            setTextColor(getColor(R.color.status_error))
            backgroundTintList = null
            background = roundedBackground(
                Color.TRANSPARENT,
                getColor(R.color.status_error)
            )
            setOnClickListener {
                action()
            }
        }

    private fun roundedBackground(
        color: Int,
        strokeColor: Int? = null
    ) =
        GradientDrawable().apply {
            // Build a component-local background for tabs and badges.
            shape = GradientDrawable.RECTANGLE
            cornerRadius = dp(9).toFloat()
            setColor(color)

            if (strokeColor != null) {
                setStroke(dp(1), strokeColor)
            }
        }

    private fun colorWithAlpha(
        color: Int,
        alpha: Int
    ): Int {
        // Retain the source colour while creating a light badge background.
        return Color.argb(
            alpha,
            Color.red(color),
            Color.green(color),
            Color.blue(color)
        )
    }

    private fun weightedButton() =
        LinearLayout.LayoutParams(
            0,
            LinearLayout.LayoutParams.WRAP_CONTENT,
            1f
        ).apply {

            marginEnd =
                dp(4)
        }

    private fun matchWrap(
        top: Int = 0,
        bottom: Int = 0
    ) =
        LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply {

            topMargin =
                dp(top)

            bottomMargin =
                dp(bottom)
        }

    private fun wrapContent(
        top: Int = 0,
        bottom: Int = 0
    ) =
        LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        ).apply {
            // Keep compact elements such as status badges from filling the row.
            topMargin = dp(top)
            bottomMargin = dp(bottom)
        }

    private fun dp(
        value: Int
    ) =
        (
                value *
                        resources.displayMetrics.density
                ).toInt()

    private fun number(
        value: Double
    ) =
        if (
            value % 1.0 == 0.0
        ) {
            value.toInt()
                .toString()
        } else {
            "%.2f".format(
                value
            )
        }

    private fun epoch(
        value: String
    ): Long =
        runCatching {

            Instant.parse(
                value
            ).toEpochMilli()

        }.getOrElse {

            runCatching {

                OffsetDateTime.parse(
                    value
                ).toInstant()
                    .toEpochMilli()

            }.getOrDefault(0)
        }

    private fun utc(
        value: String
    ): String =
        runCatching {

            DateTimeFormatter
                .ofPattern(
                    "MMM dd, yyyy  HH:mm"
                )
                .withZone(
                    ZoneOffset.UTC
                )
                .format(
                    Instant.ofEpochMilli(
                        epoch(value)
                    )
                ) + " UTC"

        }.getOrDefault(
            value
        )

    private fun utcTime(
        value: String
    ): String =
        runCatching {

            DateTimeFormatter
                .ofPattern(
                    "HH:mm"
                )
                .withZone(
                    ZoneOffset.UTC
                )
                .format(
                    Instant.ofEpochMilli(
                        epoch(value)
                    )
                ) + " UTC"

        }.getOrDefault(
            value
        )

    private fun slotDisplayName(
        startTime: String
    ): String {
        // Build a readable slot label while keeping the slot ID for API operations.
        val startEpoch = epoch(startTime)

        if (startEpoch <= 0) {
            return "Scheduled slot"
        }

        val instant =
            Instant.ofEpochMilli(
                startEpoch
            )

        val period =
            when (instant.atZone(ZoneOffset.UTC).hour) {
                in 5..11 -> "Morning"
                in 12..16 -> "Afternoon"
                in 17..20 -> "Evening"
                else -> "Night"
            }

        val date =
            DateTimeFormatter
                .ofPattern("MMM dd, yyyy")
                .withZone(ZoneOffset.UTC)
                .format(instant)

        return "$period slot - $date"
    }
}
