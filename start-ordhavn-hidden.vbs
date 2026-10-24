Option Explicit

Dim shell, fileSystem, projectDirectory, launcher, command
Set shell = CreateObject("WScript.Shell")
Set fileSystem = CreateObject("Scripting.FileSystemObject")

projectDirectory = fileSystem.GetParentFolderName(WScript.ScriptFullName)
launcher = fileSystem.BuildPath(projectDirectory, "start-ordhavn-background.ps1")

If Not fileSystem.FileExists(launcher) Then
  MsgBox "Ordhavn background launcher was not found:" & vbCrLf & launcher, vbCritical, "Ordhavn"
  WScript.Quit 1
End If

command = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File """ & launcher & """"
shell.Run command, 0, False
