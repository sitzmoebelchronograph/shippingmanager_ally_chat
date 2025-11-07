using System.Diagnostics;
using System.Reflection;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Navigation;

namespace ShippingManagerCoPilot.Installer.Pages
{
    public partial class WelcomePage : Page
    {
        private readonly MainWindow _mainWindow;

        public WelcomePage(MainWindow mainWindow)
        {
            InitializeComponent();
            _mainWindow = mainWindow;

            // Display version from assembly (full version string)
            var version = Assembly.GetExecutingAssembly().GetName().Version;
            VersionText.Text = $"Version {version}";
        }

        private void NextButton_Click(object sender, RoutedEventArgs e)
        {
            _mainWindow.NavigateToPage(new PathSelectionPage(_mainWindow));
        }

        private void CancelButton_Click(object sender, RoutedEventArgs e)
        {
            Application.Current.Shutdown();
        }

        private void Hyperlink_RequestNavigate(object sender, RequestNavigateEventArgs e)
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = e.Uri.AbsoluteUri,
                UseShellExecute = true
            });
            e.Handled = true;
        }
    }
}
