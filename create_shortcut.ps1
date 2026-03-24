$shell = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcut = $shell.CreateShortcut("$desktop\Chidipothu Hub.lnk")
$shortcut.TargetPath = "d:\4230\chidipothu-hub\run_chidipothu_hub.bat"
$shortcut.WorkingDirectory = "d:\4230\chidipothu-hub"
$shortcut.Save()
