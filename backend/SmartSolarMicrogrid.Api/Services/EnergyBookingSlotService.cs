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

   /* public async Task<IReadOnlyList<EnergyBookingSlotResponse>>
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
    }*/
    public async Task<IReadOnlyList<MicrogridNodeResponse>> GetActiveNodesAsync()
    {
        var nodes = await _nodes
            .Find(node => node.IsActive)
            .SortBy(node => node.Name)
            .ToListAsync();

        var result = new List<MicrogridNodeResponse>();

        foreach (var node in nodes)
        {
            var availableSlots = await _slots.CountDocumentsAsync(
                slot =>
                    slot.StationId == node.Id &&
                    slot.IsActive &&
                    slot.Status == SlotStatus.Available
            );

            result.Add(new MicrogridNodeResponse
            {
                Id = node.Id,
                Name = node.Name,
                Latitude = node.Latitude,
                Longitude = node.Longitude,
                CapacityKw = node.CapacityKw,
                AvailableSlots = (int)availableSlots
            });
        }

        return result;
    }

    private async Task UpdateAvailableBatterySlotsAsync(string stationId)
{
    var availableSlots = await _slots.CountDocumentsAsync(
        slot =>
            slot.StationId == stationId &&
            slot.IsActive &&
            slot.Status == SlotStatus.Available
    );

    var update = Builders<MicrogridNode>.Update
        .Set(node => node.AvailableBatterySlots, (int)availableSlots);

    await _nodes.UpdateOneAsync(
        node => node.Id == stationId,
        update
    );
}

}