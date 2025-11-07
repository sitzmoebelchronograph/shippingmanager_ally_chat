using System;
using System.IO;
using System.Windows;
using System.Windows.Controls;

namespace ShippingManagerCoPilot.Installer.Pages.Uninstall
{
    public partial class UninstallCompletePage : Page
    {
        private readonly UninstallWindow _mainWindow;
        private readonly bool _keptPersonalData;
        private readonly string _installPath;

        public UninstallCompletePage(UninstallWindow mainWindow, bool keptPersonalData, string installPath)
        {
            InitializeComponent();
            _mainWindow = mainWindow;
            _keptPersonalData = keptPersonalData;
            _installPath = installPath;

            // Show personal data info if data was kept
            if (_keptPersonalData)
            {
                DataKeptInfo.Visibility = Visibility.Visible;
                var appDataPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "ShippingManagerCoPilot");
                DataPathText.Text = appDataPath;
            }
        }

        private void CloseButton_Click(object sender, RoutedEventArgs e)
        {
            // Schedule uninstaller deletion BEFORE closing the application
            // The batch script will wait 2 seconds after this app exits, then delete the uninstaller
            // If keepPersonalData=true, only Uninstall.exe is deleted (settings/data/logs/certs remain)
            // If keepPersonalData=false, entire installation folder is deleted
            Logic.Uninstaller.ScheduleUninstallerDeletion(_installPath, _keptPersonalData);

            // Now close the application - batch script will run after exit
            Application.Current.Shutdown();
        }
    }
}
