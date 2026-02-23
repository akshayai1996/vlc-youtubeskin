ManifestDPIAware true

!macro customInstall
  DetailPrint "Enforcing High DPI Absolute Sharpness..."
  
  ; Ensure we write to BOTH 64-bit and 32-bit Registry views for maximum compatibility
  SetRegView 64
  WriteRegStr HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\simple-yt-player.exe" "~ HIGHDPIAWARE"
  WriteRegStr HKLM "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\simple-yt-player.exe" "~ HIGHDPIAWARE"
  
  SetRegView 32
  WriteRegStr HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\simple-yt-player.exe" "~ HIGHDPIAWARE"
  WriteRegStr HKLM "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\simple-yt-player.exe" "~ HIGHDPIAWARE"
  WriteRegStr HKLM "SOFTWARE\Wow6432Node\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\simple-yt-player.exe" "~ HIGHDPIAWARE"

  ; Registry fixes are handled via SetRegView 64/32
!macroend

!macro customUnInstall
  SetRegView 64
  DeleteRegValue HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\simple-yt-player.exe"
  DeleteRegValue HKLM "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\simple-yt-player.exe"
  
  SetRegView 32
  DeleteRegValue HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\simple-yt-player.exe"
  DeleteRegValue HKLM "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\simple-yt-player.exe"
  DeleteRegValue HKLM "SOFTWARE\Wow6432Node\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\simple-yt-player.exe"
!macroend
