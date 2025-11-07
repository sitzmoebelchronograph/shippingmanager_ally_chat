using System;
using System.Linq;
using System.Windows;

namespace BrowserLogin
{
    /// <summary>
    /// Application entry point with CLI argument parsing
    /// </summary>
    public partial class App : Application
    {
        private void Application_Startup(object sender, StartupEventArgs e)
        {
            // Parse command line arguments
            string url = "https://shippingmanager.cc";
            int timeoutSeconds = 300; // 5 minutes default

            for (int i = 0; i < e.Args.Length; i++)
            {
                switch (e.Args[i].ToLower())
                {
                    case "--url":
                    case "-u":
                        if (i + 1 < e.Args.Length)
                        {
                            url = e.Args[i + 1];
                            i++;
                        }
                        break;

                    case "--timeout":
                    case "-t":
                        if (i + 1 < e.Args.Length && int.TryParse(e.Args[i + 1], out int timeout))
                        {
                            timeoutSeconds = timeout;
                            i++;
                        }
                        break;

                    case "--help":
                    case "-h":
                        ShowHelp();
                        Shutdown(0);
                        return;
                }
            }

            // Validate URL
            if (!Uri.TryCreate(url, UriKind.Absolute, out Uri? uri) ||
                (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
            {
                Console.Error.WriteLine($"ERROR: Invalid URL: {url}");
                Shutdown(3);
                return;
            }

            // Show browser login window
            var loginWindow = new BrowserLoginWindow(url, timeoutSeconds);
            loginWindow.Show();
        }

        private void ShowHelp()
        {
            Console.WriteLine("BrowserLogin.exe - WebView2 Browser Login Helper");
            Console.WriteLine();
            Console.WriteLine("Usage:");
            Console.WriteLine("  BrowserLogin.exe [options]");
            Console.WriteLine();
            Console.WriteLine("Options:");
            Console.WriteLine("  --url, -u <url>           Target URL (default: https://shippingmanager.cc)");
            Console.WriteLine("  --timeout, -t <seconds>   Timeout in seconds (default: 300)");
            Console.WriteLine("  --help, -h                Show this help message");
            Console.WriteLine();
            Console.WriteLine("Output:");
            Console.WriteLine("  Prints session cookie to stdout on success");
            Console.WriteLine();
            Console.WriteLine("Exit Codes:");
            Console.WriteLine("  0 - Success (cookie found and validated)");
            Console.WriteLine("  1 - Timeout (no valid cookie found within timeout)");
            Console.WriteLine("  2 - Cancelled (user closed window)");
            Console.WriteLine("  3 - Error (invalid arguments or WebView2 error)");
            Console.WriteLine();
            Console.WriteLine("Example:");
            Console.WriteLine("  BrowserLogin.exe --url https://shippingmanager.cc --timeout 300");
        }
    }
}
