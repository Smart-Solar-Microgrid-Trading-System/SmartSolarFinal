using MongoDB.Driver;
using SmartSolarMicrogrid.Api.Models;
using SmartSolarMicrogrid.Api.Models.Dtos;

namespace SmartSolarMicrogrid.Api.Services;

public sealed class MicrogridNodeService
{
    private readonly IMongoCollection<MicrogridNode> _nodes;
    private readonly IMongoCollection<Reservation> _reservations;

    public MicrogridNodeService(IMongoDatabase database)
    {
        _nodes = database.GetCollection<MicrogridNode>("MicrogridNodes");
        _reservations = database.GetCollection<Reservation>("Reservations");
    }

    public async Task<List<MicrogridNodeResponse>> GetAllNodesAsync()
    {
        var nodes = await _nodes.Find(_ => true).SortBy(node => node.Name).ToListAsync();

        return nodes.Select(MapToResponse).ToList();
    }

    public async Task<List<MicrogridNodeResponse>> GetActiveNodesAsync()
    {
        var nodes = await _nodes.Find(node => node.IsActive).SortBy(node => node.Name).ToListAsync();

        //return nodes.Select(MapToResponse).ToList();

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

    public async Task<MicrogridNodeResponse?> GetNodeByIdAsync(string id)
    {
        var node = await _nodes .Find(x => x.Id == id).FirstOrDefaultAsync();

        return node == null ? null : MapToResponse(node);
    }

    public async Task<MicrogridNodeResponse> CreateNodeAsync( CreateMicrogridNodeRequest request)
    {
        ValidateRequest(
            request.Name,
            request.Address,
            request.Latitude,
            request.Longitude,
            request.CapacityKw);

        var now = DateTime.UtcNow;

        var node = new MicrogridNode
        {
            Id = Guid.NewGuid().ToString(),
            Name = request.Name.Trim(),
            Address = request.Address.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            CapacityKw = request.CapacityKw,
            AvailableBatterySlots = 0,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now
        };

        await _nodes.InsertOneAsync(node);

        return MapToResponse(node);
    }

    public async Task<MicrogridNodeResponse?> UpdateNodeAsync(string id, UpdateMicrogridNodeRequest request)
    {
        ValidateRequest( request.Name, request.Address,request.Latitude,request.Longitude,request.CapacityKw);

        var existingNode = await _nodes .Find(x => x.Id == id && x.IsActive) .FirstOrDefaultAsync();
        //check if the node exists 
        if (existingNode == null) { return null; }

        existingNode.Name = request.Name.Trim();
        existingNode.Address = request.Address.Trim();
        existingNode.Latitude = request.Latitude;
        existingNode.Longitude = request.Longitude;
        existingNode.CapacityKw = request.CapacityKw;
        existingNode.UpdatedAt = DateTime.UtcNow;

        await _nodes.ReplaceOneAsync( x => x.Id == id,  existingNode);

        return MapToResponse(existingNode);
    }

    public async Task<bool> DeactivateNodeAsync(string id)
    {
        // Check that the node exists and is active
        var node = await _nodes
            .Find(n => n.Id == id && n.IsActive)
            .FirstOrDefaultAsync();

        if (node == null)
        {
            throw new InvalidOperationException(
                "Microgrid node was not found or is already inactive.");
        }

        //Check for active reservations
        var hasActiveReservations = await _reservations
            .Find(r =>
                r.MicrogridNodeId == id &&
                r.Status == ReservationStatuses.Approved)
            .AnyAsync();

        // Block deactivation if reservations exist
        if (hasActiveReservations)
        {
            throw new InvalidOperationException(
                "This node cannot be deactivated because it has active energy reservations.");
        }

        //Deactivate the node
        var update = Builders<MicrogridNode>.Update
            .Set(x => x.IsActive, false)
            .Set(x => x.UpdatedAt, DateTime.UtcNow);

        var result = await _nodes.UpdateOneAsync(
            x => x.Id == id && x.IsActive,
            update);

        return result.ModifiedCount > 0;
    }

    private static MicrogridNodeResponse MapToResponse(MicrogridNode node)
    {
        return new MicrogridNodeResponse
        {
            Id = node.Id,
            Name = node.Name,
            Address = node.Address,
            Latitude = node.Latitude,
            Longitude = node.Longitude,
           CapacityKw = node.CapacityKw,
            AvailableBatterySlots = node.AvailableBatterySlots,
            IsActive = node.IsActive,
            CreatedAt = node.CreatedAt,
            UpdatedAt = node.UpdatedAt
        };
    }

    private static void ValidateRequest( string name, string address, double latitude, double longitude, decimal capacityKw)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException( "Node name is required.");
        }

        if (string.IsNullOrWhiteSpace(address))
        {
            throw new ArgumentException( "Node address is required.");
        }

        if (latitude < -90 || latitude > 90)
        {
            throw new ArgumentException("Latitude must be between -90 and 90.");
        }

        if (longitude < -180 || longitude > 180)
        {
            throw new ArgumentException("Longitude must be between -180 and 180.");
        }

        if (capacityKw <= 0)
        {
            throw new ArgumentException( "Capacity must be greater than zero.");
        }
    }
}