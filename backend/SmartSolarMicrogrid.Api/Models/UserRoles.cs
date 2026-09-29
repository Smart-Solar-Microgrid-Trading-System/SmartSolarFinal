/*
 * Student Name: Hirimuthugodage J.
 * Component: User and Prosumer Management with Role Based Authentication
 * File Name: UserRoles.cs
 * Description: Defines the supported user roles.
 */

namespace SmartSolarMicrogrid.Api.Models;

public static class UserRoles
{
    public const string Backoffice = "Backoffice";
    public const string GridOperator = "GridOperator";
    public const string Prosumer = "Prosumer";
}
