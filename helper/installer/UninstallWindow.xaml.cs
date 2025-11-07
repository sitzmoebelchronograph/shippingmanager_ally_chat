using System.Windows;
using ShippingManagerCoPilot.Installer.Pages.Uninstall;

namespace ShippingManagerCoPilot.Installer
{
    public partial class UninstallWindow : Window
    {
        public UninstallWindow()
        {
            InitializeComponent();

            // Navigate to confirmation page
            MainFrame.Navigate(new UninstallConfirmPage(this));
        }

        public void NavigateToPage(object page)
        {
            MainFrame.Navigate(page);
        }
    }
}
