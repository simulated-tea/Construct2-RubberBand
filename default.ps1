task Deploy {
    Copy-Item 'rubberband' 'C:\Program Files (x86)\Steam\SteamApps\common\Construct2\Construct2-Win64\exporters\html5\behaviors' -Recurse -Force
}
