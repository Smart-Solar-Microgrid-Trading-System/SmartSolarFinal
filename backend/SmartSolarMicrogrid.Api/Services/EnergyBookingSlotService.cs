using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public sealed class EnergyBookingSlotService
{
    private readonly IMongoCollection<EnergyBookingSlot> _slots;
    private readonly IMongoCollection<MicrogridNode> _nodes;

    public EnergyBookingSlotService(IMongoDatabase database)
    {
        _slots = database.GetCollection<EnergyBookingSlot>("EnergyBookingSlots");
        _nodes = database.GetCollection<MicrogridNode>("MicrogridNodes");
    }

    public async Task<IReadOnlyList<EnergyBookingSlotResponse>>
        GetSlotsAsync(string stationId)
    {
        var slots = await _slots
            .Find(slot => slot.StationId == stationId)
            .SortBy(slot => slot.StartTime)
            .ToListAsync();

        return slots.Select(slot => new EnergyBookingSlotResponse
        {
            Id = slot.Id,
            StationId = slot.StationId,
            StartTime = slot.StartTime,
            EndTime = slot.EndTime,
            Status = slot.Status,
            IsActive = slot.IsActive
        }).ToList();
    }
   

}