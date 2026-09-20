namespace SmartSolarMicrogrid.Api.Models;

public static class AccountValidationRules
{
    // Sri Lankan legacy NIC (nine digits + V/X) or current NIC (twelve digits).
    public const string SriLankanNicPattern = @"^(\d{9}[VvXx]|\d{12})$";
    public const string UsernamePattern = @"^[A-Za-z0-9._-]{3,50}$";
    public const string PhonePattern = @"^\+?[0-9][0-9\s()\-]{6,19}$";
    public const int PasswordMinimumLength = 8;
    public const int PasswordMaximumLength = 72;
    public const int FullNameMaximumLength = 100;
    public const int EmailMaximumLength = 254;
}
