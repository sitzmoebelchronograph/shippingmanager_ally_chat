using System;
using Microsoft.Win32;

namespace ShippingManagerCoPilot.Installer.Logic
{
    /// <summary>
    /// Helper class for Windows Registry operations
    /// </summary>
    public static class RegistryHelper
    {
        private const string UninstallRegistryPath = @"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\ShippingManagerCoPilot";

        /// <summary>
        /// Registers the application in Windows Uninstall registry
        /// </summary>
        /// <param name="installPath">Installation directory path</param>
        /// <param name="version">Application version</param>
        public static void RegisterUninstallEntry(string installPath, string version)
        {
            try
            {
                using (var key = Registry.CurrentUser.CreateSubKey(UninstallRegistryPath))
                {
                    if (key == null)
                        throw new Exception("Failed to create registry key");

                    key.SetValue("DisplayName", "ShippingManager CoPilot");
                    key.SetValue("DisplayVersion", version);
                    key.SetValue("Publisher", "ShippingManager CoPilot");
                    key.SetValue("InstallLocation", installPath);
                    key.SetValue("UninstallString", $"\"{System.IO.Path.Combine(installPath, "Uninstaller", "Uninstall.exe")}\" /uninstall");
                    key.SetValue("DisplayIcon", System.IO.Path.Combine(installPath, "ShippingManagerCoPilot.exe"));
                    key.SetValue("NoModify", 1, RegistryValueKind.DWord);
                    key.SetValue("NoRepair", 1, RegistryValueKind.DWord);

                    // Estimate install size in KB (will be updated by actual size)
                    key.SetValue("EstimatedSize", 50000, RegistryValueKind.DWord); // ~50MB estimate
                }
            }
            catch (Exception ex)
            {
                throw new Exception($"Failed to register uninstall entry: {ex.Message}", ex);
            }
        }

        /// <summary>
        /// Removes the application from Windows Uninstall registry
        /// </summary>
        public static void RemoveUninstallEntry()
        {
            try
            {
                Registry.CurrentUser.DeleteSubKey(UninstallRegistryPath, false);
            }
            catch (Exception ex)
            {
                // Don't fail uninstall if registry cleanup fails
                System.Diagnostics.Debug.WriteLine($"Failed to remove registry entry: {ex.Message}");
            }
        }

        /// <summary>
        /// Checks if the application is already installed
        /// </summary>
        /// <returns>True if already installed, false otherwise</returns>
        public static bool IsInstalled()
        {
            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(UninstallRegistryPath))
                {
                    return key != null;
                }
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Gets the current installation path from registry
        /// </summary>
        /// <returns>Installation path or null if not found</returns>
        public static string GetInstallPath()
        {
            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(UninstallRegistryPath))
                {
                    return key?.GetValue("InstallLocation") as string;
                }
            }
            catch
            {
                return null;
            }
        }

        /// <summary>
        /// Gets the currently installed version from registry
        /// </summary>
        /// <returns>Version string or null if not found</returns>
        public static string GetInstalledVersion()
        {
            try
            {
                using (var key = Registry.CurrentUser.OpenSubKey(UninstallRegistryPath))
                {
                    return key?.GetValue("DisplayVersion") as string;
                }
            }
            catch
            {
                return null;
            }
        }
    }
}
