$file = 'd:\Rafi\Project\Aplikasi PWA ShiningSun Penjadwalan\src\components\features\admin\BirthdayTemplateManager.tsx'
$content = Get-Content $file
$newLines = @()
for($i = 0; $i -lt $content.Length; $i++) {
    # Skip lines 224-227 (index 223-226)
    if ($i -ge 223 -and $i -le 226) { continue }
    $newLines += $content[$i]
}
$newLines | Set-Content $file
