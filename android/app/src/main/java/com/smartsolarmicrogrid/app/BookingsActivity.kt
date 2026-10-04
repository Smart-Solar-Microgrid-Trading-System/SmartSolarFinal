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
import java.time.ZoneId
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
        // Build the reservation form with a clear order for station, slot and energy.
        markTab(createTab)
        clearContent()

        title(
            "Create reservation",
            "Choose where and when you need energy."
        )

        content.addView(
            progressSteps(1),
            matchWrap(bottom = 16)
        )

        val card = card()

        card.addView(
            label("Choose a station").apply {
                textSize = 18f
                setPadding(0, 0, 0, dp(12))
            }
        )

        val stationSpinner = Spinner(this)

        stationSpinner.adapter = ArrayAdapter(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            listOf("Select a station") +
                    nodes.map {
                        "${it.name} - ${number(it.capacityKw)} kW"
                    }
        )

        stationSpinner.setPadding(dp(8), dp(4), dp(8), dp(4))
        stationSpinner.background = roundedBackground(
            Color.WHITE,
            Color.rgb(203, 216, 230)
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
            label("Choose an available slot").apply {
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
            label("Energy needed").apply {
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
                gravity = android.view.Gravity.CENTER
                setSingleLine(true)
            }

        card.addView(
            energyControl(energyInput),
            matchWrap()
        )

        card.addView(
            info(
                "Book within the next 7 days. " +
                        "Changes and cancellations require at least 12 hours' notice."
            )
        )

        content.addView(card)

        val review =
            primaryButton(
                "Review reservation"
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
        // Load valid seven-day slot options and render them as selectable cards.
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

                        val options =
                            mutableListOf<RadioButton>()

                        available.forEach { slot ->
                            val option =
                                RadioButton(this).apply {
                                    id = View.generateViewId()
                                    text =
                                        "${localDate(slot.startTime)}\n" +
                                                "${localTime(slot.startTime)} - ${localTime(slot.endTime)}   " +
                                                if (slot.status == "Available") {
                                                    "Available"
                                                } else {
                                                    "Current slot"
                                                }

                                    tag = slot
                                    textSize = 14f
                                    setTextColor(Color.rgb(18, 39, 66))
                                    setPadding(dp(12), dp(12), dp(12), dp(12))
                                    isChecked = slot.id == selectedId
                                    background = slotOptionBackground(isChecked)
                                }

                            options.add(option)
                            group.addView(option, matchWrap(bottom = 8))
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

                            options.forEach { option ->
                                option.background =
                                    slotOptionBackground(option.id == checkedId)
                            }
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
        // Present the chosen reservation values for confirmation before submission.
        markTab(createTab)
        clearContent()

        title(
            "Review reservation",
            "Check everything before submitting."
        )

        content.addView(
            progressSteps(2),
            matchWrap(bottom = 16)
        )

        content.addView(
            summaryCard(
                selectedNode!!,
                selectedSlot!!,
                energyAmount.toDouble()
            )
        )

        content.addView(
            warning(
                "Your request will remain Pending until approved by a Grid Operator."
            ),
            matchWrap(top = 14)
        )

        val confirmation =
            CheckBox(this).apply {
                text =
                    "The reservation details are correct."

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
                "Submit reservation"
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
                "Go back"
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
            "Reservation details",
            "View your energy reservation information."
        )

        content.addView(
            statusBanner(reservation.status),
            matchWrap(bottom = 14)
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
            "Scheduled time",
            localRange(reservation.startTime, reservation.endTime)
        )

        detailRow(
            card,
            "Energy Amount",
            "${number(reservation.energyAmountKw)} kWh"
        )

        detailRow(card, "Time zone", "Sri Lanka Time")

        detailRow(
            card,
            "Created",
            localDateTime(
                reservation.createdAt
            )
        )

        detailRow(
            card,
            "Last Updated",
            localDateTime(
                reservation.updatedAt
            )
        )

        reservation.cancelledAt
            ?.let {

                detailRow(
                    card,
                    "Cancelled",
                    localDateTime(it)
                )
            }

        content.addView(card)

        val locked =
            reservation.status == "Cancelled" ||
                    reservation.status == "Completed" ||
                    reservation.status == "Rejected"

        if (reservation.status == "Approved") {
            content.addView(
                primaryButton(
                    "View transaction QR"
                ).apply {
                    setOnClickListener {
                        openTransactionQr(reservation.id)
                    }
                },
                matchWrap(top = 14)
            )
        }

        content.addView(
            primaryButton(
                "Modify reservation"
            ).apply {

                isEnabled = !locked

                setOnClickListener {
                    showEdit(
                        reservation
                    )
                }
            },
            matchWrap(top = 14)
        )

        content.addView(
            dangerButton(
                "Cancel reservation"
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
            info(
                "Modifications and cancellations require at least 12 hours' notice."
            ),
            matchWrap(top = 10)
        )

        content.addView(
            secondaryButton(
                "Back to bookings"
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
        // Display the current booking separately from the fields that can be changed.
        clearContent()

        title(
            "Modify reservation",
            "Update the time slot or energy amount."
        )

        content.addView(
            info(
                "Reservations cannot be modified when fewer than 12 hours remain."
            )
        )

        val card =
            card()

        card.addView(
            label("Current reservation").apply {
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
            "Current slot",
            localRange(reservation.startTime, reservation.endTime)
        )

        detailRow(
            card,
            "Current energy",
            "${number(reservation.energyAmountKw)} kWh"
        )

        card.addView(
            label("Select a different date and time").apply {
                textSize = 17f
                setPadding(0, dp(18), 0, dp(8))
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
                "Energy amount (kWh)"
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

                hint = "Enter the updated energy amount"
            }

        card.addView(energy)

        content.addView(
            card,
            matchWrap(top = 12)
        )

        content.addView(
            primaryButton(
                "Save changes"
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

        content.addView(
            dangerButton(
                "Cancel this reservation"
            ) {
                confirmCancellation(reservation)
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
        // Confirm the soft cancellation and clearly explain that no record is deleted.
        val dialog = AlertDialog.Builder(this)
            .setTitle(
                "Cancel reservation?"
            )
            .setMessage(
                "Station\n${reservation.nodeName.ifBlank { reservation.nodeId }}\n\n" +
                        "Scheduled time\n${localRange(reservation.startTime, reservation.endTime)}\n" +
                        "Sri Lanka Time\n\n" +
                        "The reservation will be marked as Cancelled. " +
                        "It will not be permanently deleted."
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
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE)
                .setTextColor(getColor(R.color.status_error))
        }

        dialog.show()
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
        // Show the result of create, update, or cancellation before returning to bookings.
        clearContent()

        if (operation == "created") {
            content.addView(
                progressSteps(3, complete = true),
                matchWrap(bottom = 16)
            )
        }

        content.addView(
            TextView(this).apply {
                text = "✓"
                textSize = 48f
                gravity = android.view.Gravity.CENTER
                setTextColor(getColor(R.color.status_success))
                background = roundedBackground(
                    Color.rgb(222, 248, 235),
                    Color.rgb(184, 234, 208)
                )
            },
            LinearLayout.LayoutParams(dp(84), dp(84)).apply {
                gravity = android.view.Gravity.CENTER_HORIZONTAL
                bottomMargin = dp(12)
            }
        )

        val heading =
            when (operation) {
                "created" -> "Request submitted"
                "updated" -> "Reservation updated"
                "cancelled" -> "Reservation cancelled"
                else -> "Operation successful"
            }

        val message =
            when (operation) {
                "created" -> "We'll notify you when the Grid Operator reviews it."
                "updated" -> "Your reservation changes have been saved."
                "cancelled" -> "The reservation was marked as Cancelled and was not deleted."
                else -> "Your request was completed successfully."
            }

        centeredHeading(heading, message)
        content.addView(
            centered(statusText(reservation.status)),
            matchWrap(bottom = 14)
        )

        val card =
            card()

        card.addView(
            label("Reservation details").apply {
                textSize = 18f
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
            "Schedule",
            localRange(reservation.startTime, reservation.endTime)
        )

        detailRow(
            card,
            "Energy amount",
            "${number(reservation.energyAmountKw)} kWh"
        )

        content.addView(card)

        content.addView(
            primaryButton(
                "View reservation"
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
                "Back to bookings"
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

    private fun openTransactionQr(
        reservationId: String
    ) {
        // Open the teammate-owned QR screen only for the selected approved reservation.
        startActivity(
            Intent(
                this,
                TransactionQrActivity::class.java
            ).putExtra(
                "reservationId",
                reservationId
            )
        )
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

    private fun progressSteps(
        activeStep: Int,
        complete: Boolean = false
    ): LinearLayout {
        // Build the three-step reservation progress card used during creation.
        val labels = listOf("Select", "Review", "Confirm")

        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER
            setPadding(dp(10), dp(10), dp(10), dp(10))
            background = roundedBackground(
                if (complete) Color.rgb(239, 252, 246) else Color.WHITE,
                if (complete) Color.rgb(190, 235, 213) else Color.rgb(217, 226, 236)
            )

            labels.forEachIndexed { index, label ->
                val stepNumber = index + 1
                val finished = complete || stepNumber < activeStep
                val active = stepNumber == activeStep && !complete
                val colour =
                    when {
                        finished -> getColor(R.color.status_success)
                        active -> getColor(R.color.brand_blue)
                        else -> Color.rgb(167, 181, 199)
                    }

                addView(
                    LinearLayout(this@BookingsActivity).apply {
                        orientation = LinearLayout.VERTICAL
                        gravity = android.view.Gravity.CENTER

                        addView(
                            TextView(this@BookingsActivity).apply {
                                text = if (finished) "✓" else stepNumber.toString()
                                textSize = 15f
                                gravity = android.view.Gravity.CENTER
                                setTypeface(typeface, android.graphics.Typeface.BOLD)
                                setTextColor(if (finished || active) Color.WHITE else Color.rgb(18, 39, 66))
                                background = roundedBackground(
                                    if (finished || active) colour else Color.rgb(239, 243, 248),
                                    colour
                                )
                            },
                            LinearLayout.LayoutParams(dp(38), dp(38))
                        )

                        addView(
                            TextView(this@BookingsActivity).apply {
                                text = label
                                textSize = 13f
                                gravity = android.view.Gravity.CENTER
                                setPadding(0, dp(5), 0, 0)
                                setTextColor(if (finished || active) colour else getColor(R.color.text_secondary))
                                if (active) setTypeface(typeface, android.graphics.Typeface.BOLD)
                            }
                        )
                    },
                    LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                )
            }
        }
    }

    private fun centeredHeading(
        heading: String,
        message: String
    ) {
        // Add a centred result heading without changing the shared app bar.
        content.addView(
            TextView(this).apply {
                text = heading
                textSize = 27f
                gravity = android.view.Gravity.CENTER
                setTextColor(Color.rgb(18, 39, 66))
                setTypeface(typeface, android.graphics.Typeface.BOLD)
            }
        )

        content.addView(
            TextView(this).apply {
                text = message
                textSize = 14f
                gravity = android.view.Gravity.CENTER
                setTextColor(getColor(R.color.text_secondary))
                setPadding(0, dp(4), 0, dp(10))
            }
        )
    }

    private fun centered(view: View): LinearLayout {
        // Centre a compact child such as a status badge inside the content area.
        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER
            addView(view, wrapContent())
        }
    }

    private fun energyControl(input: EditText): LinearLayout {
        // Provide minus and plus controls while keeping direct numeric entry available.
        val controlColour = Color.rgb(233, 239, 255)

        fun changeBy(amount: Int) {
            val current = input.text.toString().toDoubleOrNull() ?: 0.0
            input.setText(number((current + amount).coerceAtLeast(0.0)))
        }

        return LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
            setPadding(dp(4), dp(4), dp(4), dp(4))
            background = roundedBackground(Color.rgb(247, 249, 255), Color.rgb(208, 219, 244))

            addView(
                Button(this@BookingsActivity).apply {
                    text = "−"
                    textSize = 20f
                    isAllCaps = false
                    backgroundTintList = ColorStateList.valueOf(controlColour)
                    setTextColor(getColor(R.color.brand_blue))
                    setOnClickListener { changeBy(-1) }
                },
                LinearLayout.LayoutParams(dp(52), dp(48))
            )

            addView(
                input,
                LinearLayout.LayoutParams(0, dp(52), 1f).apply {
                    marginStart = dp(6)
                    marginEnd = dp(6)
                }
            )

            addView(
                Button(this@BookingsActivity).apply {
                    text = "+"
                    textSize = 20f
                    isAllCaps = false
                    backgroundTintList = ColorStateList.valueOf(controlColour)
                    setTextColor(getColor(R.color.brand_blue))
                    setOnClickListener { changeBy(1) }
                },
                LinearLayout.LayoutParams(dp(52), dp(48))
            )
        }
    }

    private fun slotOptionBackground(selected: Boolean): GradientDrawable {
        // Highlight the selected slot while keeping every option easy to scan.
        return roundedBackground(
            if (selected) Color.rgb(238, 247, 255) else Color.WHITE,
            if (selected) getColor(R.color.brand_blue) else Color.rgb(211, 222, 234)
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

    private fun statusBanner(
        status: String
    ): LinearLayout {
        // Build a clear status summary for the reservation details screen.
        val statusColor =
            when (status) {
                "Approved",
                "Completed" -> getColor(R.color.status_success)
                "Rejected",
                "Cancelled" -> getColor(R.color.status_error)
                "Pending" -> Color.rgb(161, 92, 0)
                else -> getColor(R.color.brand_blue)
            }

        val message =
            when (status) {
                "Pending" -> "Your reservation is awaiting confirmation."
                "Approved" -> "Your reservation has been approved."
                "Completed" -> "This reservation has been completed."
                "Cancelled" -> "This reservation has been cancelled."
                "Rejected" -> "This reservation was not approved."
                else -> "Current reservation status."
            }

        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(14), dp(16), dp(14))
            background = roundedBackground(
                colorWithAlpha(statusColor, 24),
                colorWithAlpha(statusColor, 80)
            )

            addView(
                label(status).apply {
                    textSize = 19f
                    setTextColor(statusColor)
                    setPadding(0, 0, 0, dp(3))
                }
            )

            addView(
                value(message).apply {
                    setTextColor(Color.rgb(73, 89, 108))
                    setPadding(0, 0, 0, 0)
                }
            )
        }
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

    private fun warning(
        text: String
    ) =
        value("!  $text").apply {
            // Present important reservation guidance without treating it as an error.
            setPadding(dp(12), dp(12), dp(12), dp(12))
            setTextColor(Color.rgb(133, 77, 0))
            background = roundedBackground(
                Color.rgb(255, 247, 224),
                Color.rgb(245, 207, 124)
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
                    "Reservation summary"
                ).apply {
                    textSize = 18f
                    setPadding(0, 0, 0, dp(8))
                }
            )

            detailRow(
                this,
                "Station",
                node.name
            )

            detailRow(
                this,
                "Date",
                localDate(slot.startTime)
            )

            detailRow(
                this,
                "Time",
                "${localTime(slot.startTime)} - ${localTime(slot.endTime)}"
            )

            detailRow(
                this,
                "Energy amount",
                "${number(energy)} kWh"
            )

            detailRow(
                this,
                "Initial status",
                "Pending"
            )

            addView(
                value("Sri Lanka Time").apply {
                    setPadding(0, dp(8), 0, 0)
                }
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

    private fun localDate(
        value: String
    ): String {
        // Format a reservation date in the Prosumer's Sri Lanka time zone.
        return formatLocal(value, "EEE, MMM d, yyyy")
    }

    private fun localTime(
        value: String
    ): String {
        // Format a reservation time using a concise 12-hour clock.
        return formatLocal(value, "h:mm a")
    }

    private fun localDateTime(
        value: String
    ): String {
        // Format a timestamp for readable reservation audit information.
        return formatLocal(value, "MMM d, yyyy  h:mm a")
    }

    private fun localRange(
        start: String,
        end: String
    ): String {
        // Show a compact local schedule while retaining both dates when required.
        val startDate = localDate(start)
        val endDate = localDate(end)

        return if (startDate == endDate) {
            "$startDate\n${localTime(start)} - ${localTime(end)}"
        } else {
            "$startDate ${localTime(start)} -\n$endDate ${localTime(end)}"
        }
    }

    private fun formatLocal(
        value: String,
        pattern: String
    ): String {
        // Convert the API timestamp to Asia/Colombo without changing stored UTC data.
        return runCatching {
            DateTimeFormatter
                .ofPattern(pattern)
                .withZone(ZoneId.of("Asia/Colombo"))
                .format(Instant.ofEpochMilli(epoch(value)))
        }.getOrDefault(value)
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

        val instant = Instant.ofEpochMilli(startEpoch)
        val local = instant.atZone(ZoneId.of("Asia/Colombo"))

        val period =
            when (local.hour) {
                in 5..11 -> "Morning"
                in 12..16 -> "Afternoon"
                in 17..20 -> "Evening"
                else -> "Night"
            }

        val date =
            DateTimeFormatter
                .ofPattern("MMM dd, yyyy")
                .withZone(ZoneId.of("Asia/Colombo"))
                .format(instant)

        return "$period slot - $date"
    }
}
