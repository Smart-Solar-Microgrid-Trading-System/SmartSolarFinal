using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public class BookingSlotService
{
    private readonly IMongoCollection<EnergyBookingSlot> _slots;
    private readonly IMongoCollection<MicrogridNode> _nodes;
    private readonly IMongoCollection<EnergyReservation> _reservations;

    public BookingSlotService(IMongoDatabase database)
    {
        _slots = database.GetCollection<EnergyBookingSlot>("EnergyBookingSlots");
        _nodes = database.GetCollection<MicrogridNode>("MicrogridNodes");
        _reservations = database.GetCollection<EnergyReservation>("EnergyReservations");
    }

    public async Task<IReadOnlyList<BookingSlotResponse>> GetAllAsync()
    {
        // Get all active slots
        var slots = await _slots
            .Find(slot => slot.IsActive)
            .SortBy(slot => slot.StartTime)
            .ToListAsync();

        return slots.Select(slot => new BookingSlotResponse
        {
            Id = slot.Id,
            NodeId = slot.NodeId,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            CapacityKw = slot.CapacityKw,
            Status = slot.Status,
            IsActive = slot.IsActive
        }).ToList();
    }

    public async Task<BookingSlotResponse?> GetByIdAsync(string id)
    {
        // Find the requested slot
        var slot = await _slots
            .Find(slot => slot.Id == id && slot.IsActive)
            .FirstOrDefaultAsync();

        if (slot == null)
        {
            return null;
        }

        return new BookingSlotResponse
        {
            Id = slot.Id,
            NodeId = slot.NodeId,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            CapacityKw = slot.CapacityKw,
            Status = slot.Status,
            IsActive = slot.IsActive
        };
    }

    public async Task<IReadOnlyList<BookingSlotResponse>> GetByNodeAsync(string nodeId)
    {
        // Get active slots for one node
        var slots = await _slots
            .Find(slot => slot.NodeId == nodeId && slot.IsActive)
            .SortBy(slot => slot.StartTime)
            .ToListAsync();

        return slots.Select(slot => new BookingSlotResponse
        {
            Id = slot.Id,
            NodeId = slot.NodeId,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            CapacityKw = slot.CapacityKw,
            Status = slot.Status,
            IsActive = slot.IsActive
        }).ToList();
    }

    public async Task<(BookingSlotResponse? Slot, string? Error)> CreateAsync(
        CreateBookingSlotRequest request)
    {
        // Check whether the entered times are valid
        if (request.EndTime <= request.StartTime)
        {
            return (null, "End time must be after start time.");
        }

        var node = await _nodes
            .Find(node => node.Id == request.NodeId && node.IsActive)
            .FirstOrDefaultAsync();

        if (node == null)
        {
            return (null, "Microgrid node was not found.");
        }

        // Do not allow two slots at the same time for the same station
        var existingSlot = await _slots
            .Find(slot =>
                slot.NodeId == request.NodeId &&
                slot.IsActive &&
                slot.StartTime < request.EndTime &&
                slot.EndTime > request.StartTime)
            .FirstOrDefaultAsync();

        if (existingSlot != null)
        {
            return (null, "A booking slot already exists during this time.");
        }

        var slot = new EnergyBookingSlot
        {
            Id = Guid.NewGuid().ToString(),
            NodeId = request.NodeId,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            CapacityKw = request.CapacityKw,
            Status = BookingSlotStatuses.Available,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _slots.InsertOneAsync(slot);

        var response = new BookingSlotResponse
        {
            Id = slot.Id,
            NodeId = slot.NodeId,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            CapacityKw = slot.CapacityKw,
            Status = slot.Status,
            IsActive = slot.IsActive
        };

        return (response, null);
    }

    public async Task<(BookingSlotResponse? Slot, string? Error)> UpdateAsync(
        string id,
        UpdateBookingSlotRequest request)
    {
        // Find the slot first
        var slot = await _slots
            .Find(slot => slot.Id == id && slot.IsActive)
            .FirstOrDefaultAsync();

        if (slot == null)
        {
            return (null, "Booking slot was not found.");
        }

        if (request.EndTime <= request.StartTime)
        {
            return (null, "End time must be after start time.");
        }

        if (!IsValidStatus(request.Status))
        {
            return (null, "Invalid booking slot status.");
        }

        var hasReservation = await _reservations
            .Find(reservation =>
                reservation.SlotId == id &&
                (reservation.Status == ReservationStatuses.Pending ||
                 reservation.Status == ReservationStatuses.Approved))
            .AnyAsync();

        if (hasReservation)
        {
            return (null, "This slot cannot be updated because it has an active reservation.");
        }

        var overlappingSlot = await _slots
            .Find(otherSlot =>
                otherSlot.Id != id &&
                otherSlot.NodeId == slot.NodeId &&
                otherSlot.IsActive &&
                otherSlot.StartTime < request.EndTime &&
                otherSlot.EndTime > request.StartTime)
            .FirstOrDefaultAsync();

        if (overlappingSlot != null)
        {
            return (null, "A booking slot already exists during this time.");
        }

        slot.StartTime = request.StartTime;
        slot.EndTime = request.EndTime;
        slot.CapacityKw = request.CapacityKw;
        slot.Status = request.Status;
        slot.UpdatedAt = DateTime.UtcNow;

        await _slots.ReplaceOneAsync(
            existingSlot => existingSlot.Id == id,
            slot);

        var response = new BookingSlotResponse
        {
            Id = slot.Id,
            NodeId = slot.NodeId,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            CapacityKw = slot.CapacityKw,
            Status = slot.Status,
            IsActive = slot.IsActive
        };

        return (response, null);
    }

    public async Task<(bool Success, string? Error)> DeleteAsync(string id)
    {
        // Check whether the slot exists
        var slot = await _slots
            .Find(slot => slot.Id == id && slot.IsActive)
            .FirstOrDefaultAsync();

        if (slot == null)
        {
            return (false, "Booking slot was not found.");
        }

        var hasReservation = await _reservations
            .Find(reservation =>
                reservation.SlotId == id &&
                (reservation.Status == ReservationStatuses.Pending ||
                 reservation.Status == ReservationStatuses.Approved))
            .AnyAsync();

        if (hasReservation)
        {
            return (false, "This slot cannot be removed because it has an active reservation.");
        }

        slot.IsActive = false;
        slot.Status = BookingSlotStatuses.Unavailable;
        slot.UpdatedAt = DateTime.UtcNow;

        await _slots.ReplaceOneAsync(
            existingSlot => existingSlot.Id == id,
            slot);

        return (true, null);
    }

    private static bool IsValidStatus(string status)
    {
        return status == BookingSlotStatuses.Available ||
               status == BookingSlotStatuses.Reserved ||
               status == BookingSlotStatuses.Unavailable ||
               status == BookingSlotStatuses.Completed;
    }
}