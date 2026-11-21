Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
strCurrentDir = objFSO.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = strCurrentDir
' Chay an cua so CMD (tham so 0)
WshShell.Run "cmd /c node agent.js", 0, False
