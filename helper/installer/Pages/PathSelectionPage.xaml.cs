using System;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Navigation;
using Microsoft.Win32;
using ShippingManagerCoPilot.Installer.Logic;

namespace ShippingManagerCoPilot.Installer.Pages
{
    public partial class PathSelectionPage : Page
    {
        private readonly MainWindow _mainWindow;
        private Button _installButton;

        public PathSelectionPage(MainWindow mainWindow)
        {
            InitializeComponent();
            _mainWindow = mainWindow;

            // Check if already installed and navigate to update page
            if (RegistryHelper.IsInstalled())
            {
                var existingPath = RegistryHelper.GetInstallPath();
                var existingVersion = RegistryHelper.GetInstalledVersion() ?? "Unknown";

                // If registry entry exists but path is invalid, clean up registry and continue with fresh install
                if (string.IsNullOrWhiteSpace(existingPath) || !Directory.Exists(existingPath))
                {
                    // Corrupted registry entry - clean it up
                    RegistryHelper.RemoveUninstallEntry();
                }
                else
                {
                    // Valid existing installation - navigate to update confirmation page
                    Dispatcher.BeginInvoke(new Action(() =>
                    {
                        _mainWindow.NavigateToPage(new UpdateConfirmPage(_mainWindow, existingPath, existingVersion));
                    }));
                    return;
                }
            }

            // Hook up license checkbox change event
            LicenseCheckbox.Checked += LicenseCheckbox_Changed;
            LicenseCheckbox.Unchecked += LicenseCheckbox_Changed;

            // Find the install button after loading and disable it until license is accepted
            Loaded += (s, e) =>
            {
                _installButton = FindName("InstallButton") as Button;
                if (_installButton != null)
                {
                    _installButton.IsEnabled = false; // Disabled until license accepted
                }
            };

            // Initialize paths
            AppDataPath.Text = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "ShippingManagerCoPilot");

            ProgramFilesPath.Text = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles),
                "ShippingManagerCoPilot");
        }

        private void LicenseCheckbox_Changed(object sender, RoutedEventArgs e)
        {
            if (_installButton != null)
            {
                _installButton.IsEnabled = LicenseCheckbox.IsChecked == true;
            }
        }

        private void LicenseHyperlink_RequestNavigate(object sender, RequestNavigateEventArgs e)
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = e.Uri.AbsoluteUri,
                UseShellExecute = true
            });
            e.Handled = true;
        }

        private void InstallPathRadio_Changed(object sender, RoutedEventArgs e)
        {
            // Null check for initialization
            if (CustomRadio == null || CustomPath == null || BrowseButton == null)
                return;

            if (CustomRadio.IsChecked == true)
            {
                CustomPath.IsEnabled = true;
                BrowseButton.IsEnabled = true;
            }
            else
            {
                CustomPath.IsEnabled = false;
                BrowseButton.IsEnabled = false;
            }
        }

        private void BrowseButton_Click(object sender, RoutedEventArgs e)
        {
            var dialog = new OpenFileDialog
            {
                ValidateNames = false,
                CheckFileExists = false,
                CheckPathExists = true,
                FileName = "Select Folder"
            };

            if (dialog.ShowDialog() == true)
            {
                CustomPath.Text = Path.GetDirectoryName(dialog.FileName);
            }
        }

        private void BackButton_Click(object sender, RoutedEventArgs e)
        {
            _mainWindow.NavigateToPage(new WelcomePage(_mainWindow));
        }

        private void InstallButton_Click(object sender, RoutedEventArgs e)
        {
            // Determine selected install path
            string installPath = null;

            if (AppDataRadio?.IsChecked == true)
                installPath = AppDataPath?.Text;
            else if (ProgramFilesRadio?.IsChecked == true)
                installPath = ProgramFilesPath?.Text;
            else if (CustomRadio?.IsChecked == true)
                installPath = CustomPath?.Text;

            // Fallback to AppData if nothing selected (shouldn't happen but safety check)
            if (string.IsNullOrWhiteSpace(installPath))
            {
                installPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "ShippingManagerCoPilot");
            }

            // Navigate to install progress page
            _mainWindow.NavigateToPage(new InstallProgressPage(
                _mainWindow,
                installPath,
                DesktopShortcut?.IsChecked == true,
                StartMenuShortcut?.IsChecked == true
            ));
        }
    }
}
