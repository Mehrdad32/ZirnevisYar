//Copyright 2018 - By Mehrdad32 [www.Mehrdad32.ir]
//If you want to use my source code, Please refer me in your work :)

using System;
using System.Text;
using System.Windows;
using System.Windows.Input;
using System.IO;
using System.Linq;
using Microsoft.Win32;

namespace ZirnevisYar
{
    public partial class MainWindow : Window
    {
        private string[] _files;

        public MainWindow()
        {
            InitializeComponent();
            var argsFromInput = Environment.GetCommandLineArgs();
            if (argsFromInput.Length <= 1) return;
            for(var index = 1; index >= argsFromInput.Length; index++)
            {
                _files[index - 1] = argsFromInput[index];
                DoWork();
            }
        }

        private void Label_MouseDown(object sender, MouseButtonEventArgs e)
        {
            System.Diagnostics.Process.Start("http://www.mehrdad32.ir/");
        }

        private void ChbTopMost_Unchecked(object sender, RoutedEventArgs e)
        {
            Topmost = false;
        }

        private void ChbTopMost_Checked(object sender, RoutedEventArgs e)
        {
            Topmost = true;
        } 

        private void ImgBox_Drop(object sender, DragEventArgs e)
        {
            try
            {
                if (!e.Data.GetDataPresent(DataFormats.FileDrop)) return;
                _files = (string[])e.Data.GetData(DataFormats.FileDrop);
                DoWork();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "خطای بازکردن فایل", MessageBoxButton.OK, MessageBoxImage.Error, MessageBoxResult.OK, MessageBoxOptions.RightAlign);
            }
        }

        private void ImgBox_MouseDown(object sender, MouseButtonEventArgs e)
        {
            try
            {
                var of = new OpenFileDialog
                    {Multiselect = true, Title = "انتخاب فایل زیرنویس", Filter = "Srt Files|*.srt"};
                of.ShowDialog();
                if (of.FileNames.Length <= 0) return;
                _files = of.FileNames;
                DoWork();
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.Message, "خطای درج فایل", MessageBoxButton.OK, MessageBoxImage.Error, MessageBoxResult.OK, MessageBoxOptions.RightAlign);
            }
        }

        private void DoWork()
        {
            foreach (var file in _files)
            {
                var fInfo = new FileInfo(file);
                var fileSize = fInfo.Length / 1024;

                if (Convert.ToInt32(fileSize) < 5000)
                {
                    var subDir = file.Substring(0, file.LastIndexOf(@"\", StringComparison.Ordinal));
                    var movieFile = "";
                    var movieName = "";

                    //Get movies 
                    var movieFiles = Directory.EnumerateFiles(subDir, "*.*", SearchOption.AllDirectories)
                        .Where(s => s.EndsWith(".mkv") || s.EndsWith(".mp4") || s.EndsWith(".avi"));

                    foreach (var mf in movieFiles)
                    {
                        movieFile = mf;
                    }

                    var subtitleName = file.Substring(file.LastIndexOf(@"\", StringComparison.Ordinal) + 1,
                        file.LastIndexOf(@".", StringComparison.Ordinal) -
                        file.LastIndexOf(@"\", StringComparison.Ordinal) - 1);

                    if (movieFile != "")
                        movieName = movieFile.Substring(movieFile.LastIndexOf(@"\", StringComparison.Ordinal) + 1,
                            movieFile.LastIndexOf(@".", StringComparison.Ordinal) -
                            movieFile.LastIndexOf(@"\", StringComparison.Ordinal) - 1);

                    //Temp Copy
                    if (File.Exists(string.Format(@"{0}\{1}_old.srt", subDir, subtitleName)))
                    {
                        if (ChbReplace.IsChecked != null && (bool)ChbReplace.IsChecked)
                        {
                            File.Delete(String.Format(@"{0}\{1}_old.srt", subDir, subtitleName));
                        }
                        else
                        {
                            MessageBox.Show("لطفا برای رفع مشکل گزینه نهایی یعنی جایگزینی فایل جدید را در نرم افزار فعال نمایید", "خطا در وجود نام مشابه فایل", MessageBoxButton.OK, MessageBoxImage.Error, MessageBoxResult.OK, MessageBoxOptions.RightAlign);
                            return;
                        }
                    }

                    File.Copy(file, string.Format(@"{0}\{1}_old.srt", subDir, subtitleName));

                    var doNotDeleteOriginal = false;
                    if (movieName != "" && movieName != subtitleName)
                    {
                        if (ChbRename.IsChecked != null && (bool)ChbRename.IsChecked)
                        {
                            if (File.Exists(string.Format(@"{0}\{1}.srt", subDir, movieName)))
                            {
                                if (ChbReplace.IsChecked != null && (bool)ChbReplace.IsChecked)
                                {
                                    File.Delete(String.Format(@"{0}\{1}.srt", subDir, movieName));
                                }
                                else
                                {
                                    MessageBox.Show("لطفا برای رفع مشکل گزینه نهایی یعنی جایگزینی فایل جدید را در نرم افزار فعال نمایید", "خطا در وجود نام مشابه فایل", MessageBoxButton.OK, MessageBoxImage.Error, MessageBoxResult.OK, MessageBoxOptions.RightAlign);
                                    return;
                                }
                            }

                            File.Copy(file, string.Format(@"{0}\{1}.srt", subDir, movieName));
                        }
                    }
                    else
                    {
                        doNotDeleteOriginal = true;
                    }

                    if (movieName == "")
                        movieName = subtitleName + "_Edited";

                    //Convert encoding:
                    var inStream = new StreamReader(string.Format(@"{0}\{1}_old.srt", subDir, subtitleName), Encoding.GetEncoding("windows-1256"));
                    var outStream = new StreamWriter(string.Format(@"{0}\{1}.srt", subDir, movieName), false, Encoding.GetEncoding("utf-8"));

                    var chBuffer = new char[4096];
                    int iCount;

                    while ((iCount = inStream.Read(chBuffer, 0, 4096)) > 0)
                    {
                        outStream.Write(chBuffer, 0, iCount);
                    }

                    inStream.Close();
                    outStream.Close();

                    //Deleted if want
                    if (ChbReplace.IsChecked != null && !(bool) ChbReplace.IsChecked) continue;
                    File.Delete(string.Format(@"{0}\{1}_old.srt", subDir, subtitleName));
                    if (!doNotDeleteOriginal)
                        File.Delete(file);
                }
                else
                {
                    MessageBox.Show(string.Format("فایلی که به نرم افزار اضافه کرده اید حجم بالایی دارد و احتمال می رود شما فایل زیرنویس درستی با نام زیر را به اشتباه وارد نموده‌اید\n\r\n\r{0}\n\r\n\rدر صورت وجود مشکلی در این رابطه با سازنده نرم افزار در تماس باشید", file), "خطای درج فایل", MessageBoxButton.OK, MessageBoxImage.Error, MessageBoxResult.OK, MessageBoxOptions.RightAlign);
                }
            }
        }
    }
}
