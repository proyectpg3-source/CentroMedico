$ErrorActionPreference = "Stop"

$docsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$svgPath = Join-Path $docsDir "DO-01-diagrama-objetos-sistema.svg"
$pngPath = Join-Path $docsDir "DO-01-diagrama-objetos-sistema.png"

$objects = @(
  @{
    id = "Paciente"; title = "paciente01 : Paciente"; x = 70; y = 105; w = 310; h = 135;
    attrs = @("idPaciente = 001", "nombre = Paciente registrado", "estado = Activo")
  },
  @{
    id = "Atencion"; title = "atencion01 : Atencion"; x = 475; y = 105; w = 330; h = 155;
    attrs = @("idAtencion = 001", "motivoConsulta = Registrado", "estado = En atencion", "fecha = Fecha actual")
  },
  @{
    id = "Evaluacion"; title = "evaluacion01 : EvaluacionInicial"; x = 910; y = 105; w = 390; h = 155;
    attrs = @("idEvaluacion = 001", "signosVitales = Registrados", "observaciones = Registradas", "estado = Completa")
  },
  @{
    id = "Prioridad"; title = "prioridad01 : Prioridad"; x = 880; y = 390; w = 330; h = 155;
    attrs = @("idPrioridad = 001", "nivel = Asignado", "origen = Sistema", "estado = Vigente")
  },
  @{
    id = "Cola"; title = "cola01 : ColaAtencion"; x = 1375; y = 390; w = 300; h = 135;
    attrs = @("idCola = 001", "posicion = Asignada", "estado = En espera")
  },
  @{
    id = "Historia"; title = "historia01 : HistoriaClinica"; x = 70; y = 680; w = 330; h = 135;
    attrs = @("idHistoria = 001", "paciente = paciente01", "estado = Actualizada")
  },
  @{
    id = "Consulta"; title = "consulta01 : ConsultaMedica"; x = 475; y = 680; w = 365; h = 155;
    attrs = @("idConsulta = 001", "impresionClinica = Registrada", "tratamiento = Registrado", "estado = Finalizada")
  },
  @{
    id = "Estudio"; title = "estudio01 : EstudioClinico"; x = 960; y = 680; w = 345; h = 155;
    attrs = @("idEstudio = 001", "tipo = Solicitado", "resultado = Pendiente / registrado", "estado = Vigente")
  }
)

$links = @(
  @{ from = "Paciente"; to = "Atencion"; label = "posee"; labelX = 445; labelY = 213 },
  @{ from = "Atencion"; to = "Evaluacion"; label = "incluye"; labelX = 875; labelY = 213 },
  @{ from = "Evaluacion"; to = "Prioridad"; label = "origina"; labelX = 1120; labelY = 350 },
  @{ from = "Prioridad"; to = "Cola"; label = "determina posicion"; labelX = 1294; labelY = 467 },
  @{ from = "Paciente"; to = "Historia"; label = "mantiene"; labelX = 255; labelY = 500 },
  @{ from = "Atencion"; to = "Consulta"; label = "genera"; labelX = 650; labelY = 495 },
  @{ from = "Consulta"; to = "Historia"; label = "actualiza"; labelX = 445; labelY = 760 },
  @{ from = "Consulta"; to = "Estudio"; label = "puede solicitar"; labelX = 925; labelY = 760 }
)

function Escape-Xml([string]$text) {
  return [System.Security.SecurityElement]::Escape($text)
}

function Center($obj) {
  return @{
    x = [double]$obj.x + ([double]$obj.w / 2.0)
    y = [double]$obj.y + ([double]$obj.h / 2.0)
  }
}

function Svg-Object($obj) {
  $x = $obj.x
  $y = $obj.y
  $w = $obj.w
  $h = $obj.h
  $title = Escape-Xml $obj.title
  $rows = New-Object System.Collections.Generic.List[string]
  $rows.Add("<g id=""$($obj.id)"">")
  $rows.Add("  <rect x=""$x"" y=""$y"" width=""$w"" height=""$h"" rx=""0"" fill=""#ffffff"" stroke=""#000000"" stroke-width=""2.2""/>")
  $rows.Add("  <line x1=""$x"" y1=""$($y + 38)"" x2=""$($x + $w)"" y2=""$($y + 38)"" stroke=""#000000"" stroke-width=""1.8""/>")
  $rows.Add("  <text x=""$($x + 14)"" y=""$($y + 25)"" class=""object-title"">$title</text>")
  for ($i = 0; $i -lt $obj.attrs.Count; $i++) {
    $attr = Escape-Xml $obj.attrs[$i]
    $rows.Add("  <text x=""$($x + 14)"" y=""$($y + 62 + ($i * 24))"" class=""object-attr"">$attr</text>")
  }
  $rows.Add("</g>")
  return ($rows -join "`n")
}

function Svg-LinkLine($link, $map) {
  $from = $map[$link.from]
  $to = $map[$link.to]
  $a = Center $from
  $b = Center $to
  return @"
<g class="link">
  <line x1="$($a.x)" y1="$($a.y)" x2="$($b.x)" y2="$($b.y)" stroke="#000000" stroke-width="2"/>
</g>
"@
}

function Svg-LinkLabel($link) {
  $label = Escape-Xml $link.label
  $labelX = $link.labelX
  $labelY = $link.labelY
  return @"
<g class="link-label-group">
  <text x="$labelX" y="$labelY" class="link-label">$label</text>
</g>
"@
}

$objectMap = @{}
foreach ($object in $objects) {
  $objectMap[$object.id] = $object
}

$svgLinkLines = ($links | ForEach-Object { Svg-LinkLine $_ $objectMap }) -join "`n"
$svgObjects = ($objects | ForEach-Object { Svg-Object $_ }) -join "`n"
$svgLinkLabels = ($links | ForEach-Object { Svg-LinkLabel $_ }) -join "`n"

$svg = @"
<svg xmlns="http://www.w3.org/2000/svg" width="1740" height="920" viewBox="0 0 1740 920">
  <rect width="1740" height="920" fill="#ffffff"/>
  <style>
    .title {
      font: 700 30px Arial, Helvetica, sans-serif;
      fill: #000000;
    }
    .object-title {
      font: 700 16px Arial, Helvetica, sans-serif;
      fill: #000000;
      text-decoration: underline;
    }
    .object-attr {
      font: 14px Consolas, "Courier New", monospace;
      fill: #000000;
    }
    .link-label {
      font: 700 13px Arial, Helvetica, sans-serif;
      fill: #000000;
      text-anchor: middle;
      dominant-baseline: middle;
      paint-order: stroke;
      stroke: #ffffff;
      stroke-width: 5px;
      stroke-linejoin: round;
    }
  </style>

  <text x="70" y="50" class="title">DO-01 - Diagrama de objetos del sistema</text>

  $svgLinkLines

  $svgObjects

  $svgLinkLabels
</svg>
"@

Set-Content -LiteralPath $svgPath -Value $svg -Encoding UTF8

Add-Type -AssemblyName System.Drawing

$scale = 2
$width = 1740 * $scale
$height = 920 * $scale
$bitmap = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::White)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.ScaleTransform($scale, $scale)

$fontTitle = New-Object System.Drawing.Font("Arial", 22, [System.Drawing.FontStyle]::Bold)
$fontObjectTitle = New-Object System.Drawing.Font("Arial", 11.5, [System.Drawing.FontStyle]::Bold)
$fontAttr = New-Object System.Drawing.Font("Consolas", 10.3, [System.Drawing.FontStyle]::Regular)
$fontLink = New-Object System.Drawing.Font("Arial", 9.5, [System.Drawing.FontStyle]::Bold)

$black = [System.Drawing.Color]::Black
$white = [System.Drawing.Color]::White
$textBrush = New-Object System.Drawing.SolidBrush($black)
$whiteBrush = New-Object System.Drawing.SolidBrush($white)
$pen = New-Object System.Drawing.Pen($black, 2)
$thinPen = New-Object System.Drawing.Pen($black, 1.5)

$graphics.DrawString("DO-01 - Diagrama de objetos del sistema", $fontTitle, $textBrush, 70, 18)

foreach ($link in $links) {
  $from = $objectMap[$link.from]
  $to = $objectMap[$link.to]
  $a = Center $from
  $b = Center $to
  $graphics.DrawLine($pen, [single]$a.x, [single]$a.y, [single]$b.x, [single]$b.y)
}

foreach ($object in $objects) {
  $graphics.FillRectangle($whiteBrush, $object.x, $object.y, $object.w, $object.h)
  $graphics.DrawRectangle($pen, $object.x, $object.y, $object.w, $object.h)
  $graphics.DrawLine($thinPen, $object.x, $object.y + 38, $object.x + $object.w, $object.y + 38)
  $graphics.DrawString($object.title, $fontObjectTitle, $textBrush, $object.x + 12, $object.y + 12)
  $titleSize = $graphics.MeasureString($object.title, $fontObjectTitle)
  $graphics.DrawLine($thinPen, $object.x + 12, $object.y + 31, $object.x + 12 + $titleSize.Width, $object.y + 31)
  for ($i = 0; $i -lt $object.attrs.Count; $i++) {
    $graphics.DrawString($object.attrs[$i], $fontAttr, $textBrush, $object.x + 14, $object.y + 52 + ($i * 24))
  }
}

foreach ($link in $links) {
  $midX = [single]$link.labelX
  $midY = [single]$link.labelY
  $labelSize = $graphics.MeasureString($link.label, $fontLink)
  $graphics.FillRectangle($whiteBrush, $midX - ($labelSize.Width / 2) - 5, $midY - 2, $labelSize.Width + 10, $labelSize.Height + 3)
  $graphics.DrawString($link.label, $fontLink, $textBrush, $midX - ($labelSize.Width / 2), $midY)
}

$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()
$fontTitle.Dispose()
$fontObjectTitle.Dispose()
$fontAttr.Dispose()
$fontLink.Dispose()
$textBrush.Dispose()
$whiteBrush.Dispose()
$pen.Dispose()
$thinPen.Dispose()

Write-Host "PUML: $(Join-Path $docsDir 'DO-01-diagrama-objetos-sistema.puml')"
Write-Host "SVG: $svgPath"
Write-Host "PNG: $pngPath"
