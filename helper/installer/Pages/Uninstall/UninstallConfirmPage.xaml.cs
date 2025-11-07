using System.Windows;
using System.Windows.Controls;
using ShippingManagerCoPilot.Installer.Logic;

namespace ShippingManagerCoPilot.Installer.Pages.Uninstall
{
    public partial class UninstallConfirmPage : Page
    {
        private readonly UninstallWindow _mainWindow;

        public UninstallConfirmPage(UninstallWindow mainWindow)
        {
            InitializeComponent();
            _mainWindow = mainWindow;

            // Get and display installation path
            var installPath = RegistryHelper.GetInstallPath();
            InstallPathText.Text = string.IsNullOrEmpty(installPath)
                ? "Installation not found"
                : installPath;
        }

        private void UninstallButton_Click(object sender, RoutedEventArgs e)
        {
            bool deletePersonalData = DeleteDataCheckbox.IsChecked == true;
            bool keepPersonalData = !deletePersonalData;
            _mainWindow.NavigateToPage(new UninstallProgressPage(_mainWindow, keepPersonalData));
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            Application.Current.Shutdown();
        }
    }
}
