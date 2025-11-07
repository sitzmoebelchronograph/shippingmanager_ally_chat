using System;
using System.Reflection;
using System.Windows;
using System.Windows.Controls;
using ShippingManagerCoPilot.Installer.Logic;

namespace ShippingManagerCoPilot.Installer.Pages
{
    public partial class UpdateConfirmPage : Page
    {
        private readonly MainWindow _mainWindow;
        private readonly string _installPath;

        public UpdateConfirmPage(MainWindow mainWindow, string existingPath, string existingVersion)
        {
            InitializeComponent();
            _mainWindow = mainWindow;
            _installPath = existingPath;

            // Display existing version
            ExistingVersionText.Text = $"Version {existingVersion}";

            // Display installation path
            InstallPathText.Text = existingPath;

            // Display new version from assembly (full version string)
            var version = Assembly.GetExecutingAssembly().GetName().Version;
            NewVersionText.Text = $"Version {version}";
        }

        private void UpdateButton_Click(object sender, RoutedEventArgs e)
        {
            // Navigate to install progress page in update mode
            _mainWindow.NavigateToPage(new InstallProgressPage(
                _mainWindow,
                _installPath,
                createDesktopShortcut: true,  // Keep existing shortcuts
                createStartMenuShortcut: true,
                isUpdate: true  // This is an update, not fresh install
            ));
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            Application.Current.Shutdown();
        }
    }
}
