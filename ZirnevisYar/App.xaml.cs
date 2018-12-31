using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Windows;

namespace ZirnevisYar
{
    /// <summary>
    /// Interaction logic for App.xaml
    /// </summary>
    public partial class App : Application
    {
        public string[] Inputfiles { get; set; }

        protected override void OnStartup(StartupEventArgs e)
        {
            //try
            //{
            //    Inputfiles = e.Args;
            //}
            //catch { }
            //MessageBox.Show(files.Length.ToString());
        }
    }
}
