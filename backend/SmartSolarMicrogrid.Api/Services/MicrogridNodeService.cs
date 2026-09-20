using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public sealed class MicrogridNodeService
{
    private readonly IMongoCollection<MicrogridNode> _nodes;

    public MicrogridNodeService(IMongoDatabase database)
    {
        _nodes = database.GetCollection<MicrogridNode>("MicrogridNodes");
    }

    public async Task<IReadOnlyList<MicrogridNodeResponse>> GetActiveNodesAsync()
    {
        var nodes = await _nodes.Find(node => node.IsActive).SortBy(node => node.Name).ToListAsync();
        return nodes.Select(node => new MicrogridNodeResponse
        {
            Id = node.Id,
            Name = node.Name,
            Latitude = node.Latitude,
            Longitude = node.Longitude,
            CapacityKw = node.CapacityKw,
            AvailableBatterySlots = node.AvailableBatterySlots
        }).ToList();
    }
}
