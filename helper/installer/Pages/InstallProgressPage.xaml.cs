using System;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using ShippingManagerCoPilot.Installer.Logic;

namespace ShippingManagerCoPilot.Installer.Pages
{
    public partial class InstallProgressPage : Page
    {
        private readonly MainWindow _mainWindow;
        private readonly string _installPath;
        private readonly bool _createDesktopShortcut;
        private readonly bool _createStartMenuShortcut;
        private readonly bool _isUpdate;

        public InstallProgressPage(MainWindow mainWindow, string installPath, bool createDesktopShortcut, bool createStartMenuShortcut, bool isUpdate = false)
        {
            InitializeComponent();
            _mainWindow = mainWindow;
            _installPath = installPath;
            _createDesktopShortcut = createDesktopShortcut;
            _createStartMenuShortcut = createStartMenuShortcut;
            _isUpdate = isUpdate;

            // Start installation asynchronously
            Loaded += async (s, e) => await StartInstallation();
        }

        private async Task StartInstallation()
        {
            try
            {
                var installer = new Logic.Installer(_installPath, _createDesktopShortcut, _createStartMenuShortcut, _isUpdate);

                // Hook up progress events
                installer.ProgressChanged += (progress, message) =>
                {
                    Dispatcher.Invoke(() =>
                    {
                        ProgressBar.Value = progress;
                        LogText.AppendText($"[✓] {message}\n");
                        LogText.ScrollToEnd();
                    });
                };

                installer.StatusChanged += (status) =>
                {
                    Dispatcher.Invoke(() =>
                    {
                        StatusText.Text = status;
                    });
                };

                // Run installation
                await Task.Run(() => installer.Install());

                // Installation complete - navigate to complete page
                Dispatcher.Invoke(() =>
                {
                    _mainWindow.NavigateToPage(new CompletePage(_mainWindow, _installPath));
                });
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"Installation failed:\n\n{ex.Message}",
                    "Installation Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error);

                Application.Current.Shutdown();
            }
        }
    }
}
