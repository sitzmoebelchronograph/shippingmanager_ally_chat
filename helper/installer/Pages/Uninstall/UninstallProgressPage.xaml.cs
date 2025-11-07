using System;
using System.Threading.Tasks;
using System.Windows.Controls;
using System.Windows.Media;
using ShippingManagerCoPilot.Installer.Logic;

namespace ShippingManagerCoPilot.Installer.Pages.Uninstall
{
    public partial class UninstallProgressPage : Page
    {
        private readonly UninstallWindow _mainWindow;
        private readonly bool _keepPersonalData;

        public UninstallProgressPage(UninstallWindow mainWindow, bool keepPersonalData)
        {
            InitializeComponent();
            _mainWindow = mainWindow;
            _keepPersonalData = keepPersonalData;

            // Start uninstallation after page loads
            Loaded += async (s, e) => await StartUninstallation();
        }

        private async Task StartUninstallation()
        {
            try
            {
                var installPath = RegistryHelper.GetInstallPath();

                if (string.IsNullOrEmpty(installPath))
                {
                    throw new Exception("Installation not found.");
                }

                var uninstaller = new Logic.Uninstaller(installPath, _keepPersonalData);

                // Subscribe to progress events
                uninstaller.ProgressChanged += (percentage, message) =>
                {
                    Dispatcher.Invoke(() =>
                    {
                        ProgressBar.Value = percentage;
                        ProgressText.Text = $"{percentage}%";
                    });
                };

                uninstaller.StatusChanged += (status) =>
                {
                    Dispatcher.Invoke(() =>
                    {
                        StatusText.Text = status;
                    });
                };

                uninstaller.TaskCompleted += (taskNumber) =>
                {
                    Dispatcher.Invoke(() =>
                    {
                        var taskText = taskNumber switch
                        {
                            1 => Task1,
                            2 => Task2,
                            3 => Task3,
                            _ => null
                        };

                        if (taskText != null)
                        {
                            taskText.Text = taskText.Text.Replace("[  ]", "[✓]");
                            taskText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#4ade80"));
                        }
                    });
                };

                // Run uninstallation asynchronously
                await Task.Run(() => uninstaller.Uninstall());

                // Navigate to completion page
                Dispatcher.Invoke(() =>
                {
                    _mainWindow.NavigateToPage(new UninstallCompletePage(_mainWindow, _keepPersonalData, installPath));
                });
            }
            catch (Exception ex)
            {
                Dispatcher.Invoke(() =>
                {
                    StatusText.Text = "Uninstallation failed!";
                    StatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#f59e0b"));

                    System.Windows.MessageBox.Show(
                        $"Uninstallation failed:\n\n{ex.Message}",
                        "Uninstall Error",
                        System.Windows.MessageBoxButton.OK,
                        System.Windows.MessageBoxImage.Error);

                    System.Windows.Application.Current.Shutdown();
                });
            }
        }
    }
}
