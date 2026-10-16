# build-dist.ps1 — Refresca dist/ con los archivos de producción de la v3.
# Sobrescribe index/css/js/assets; NO toca .htaccess / robots.txt / sitemap.xml.
# Uso: clic derecho → "Ejecutar con PowerShell", o:  powershell -File build-dist.ps1
$root = $PSScriptRoot
$dist = Join-Path $root 'dist'
New-Item -ItemType Directory -Path "$dist\css","$dist\js","$dist\assets" -Force | Out-Null
Copy-Item "$root\index.html"      "$dist\index.html"      -Force
Copy-Item "$root\css\styles.css"  "$dist\css\styles.css"  -Force
Copy-Item "$root\js\*.js"         "$dist\js\"             -Force
Copy-Item "$root\assets\*.jpg"    "$dist\assets\"         -Force
if (Test-Path "$root\assets\*.png") { Copy-Item "$root\assets\*.png" "$dist\assets\" -Force }
# Identidad y diseño (generadas por tools/build-design-assets.py)
if (Test-Path "$root\assets\diseno") {
  if (Test-Path "$dist\assets\diseno") { Remove-Item "$dist\assets\diseno" -Recurse -Force }
  Copy-Item "$root\assets\diseno" "$dist\assets\diseno" -Recurse -Force
}

# .htaccess / robots / sitemap: se crean solo si no existen (copiados de la v2)
$v2 = Join-Path (Split-Path $root -Parent) 'web-sinapstudio_v2\dist'
foreach ($f in '.htaccess', 'robots.txt') {   # sitemap: recién cuando haya dominio
  if (-not (Test-Path "$dist\$f") -and (Test-Path "$v2\$f")) { Copy-Item "$v2\$f" "$dist\$f" }
}

Write-Host "dist/ actualizado. dist/ al día (Hostinger o Vercel)." -ForegroundColor Green
