using System.Windows;
using ShippingManagerCoPilot.Installer.Pages;

namespace ShippingManagerCoPilot.Installer
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();

            // Navigate to Welcome page
            MainFrame.Navigate(new WelcomePage(this));
        }

        public void NavigateToPage(object page)
        {
            MainFrame.Navigate(page);
        }
    }
}
