$ErrorActionPreference = "Stop"

$docsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$svgPath = Join-Path $docsDir "diagrama-objetos-centro-medico-bordes-negros.svg"
$pngPath = Join-Path $docsDir "diagrama-objetos-centro-medico-bordes-negros.png"

$objects = @(
  @{
    id = "paciente"; title = "pacienteJuan : Paciente"; x = 70; y = 70; w = 295; h = 145; fill = "#EAF7F2"; stroke = "#128466";
    attrs = @("id_paciente = 1", "nombre = Juan Perez", "dni = 10000001", "telefono = 55510001")
  },
  @{
    id = "medico"; title = "medicoMaria : Medico"; x = 455; y = 70; w = 315; h = 145; fill = "#EBF2FF"; stroke = "#2B6CB0";
    attrs = @("id_medico = 1", "nombre = Dra. Maria Gonzalez", "especialidad = Cardiologia", "licencia = MED-CAR-001")
  },
  @{
    id = "usuario"; title = "usuarioClinico : Usuario"; x = 860; y = 70; w = 300; h = 145; fill = "#F3EEFF"; stroke = "#7353BA";
    attrs = @("id_usuario = 1", "rol = medico", "activo = true", "id_medico = 1")
  },
  @{
    id = "cita"; title = "citaControl : Cita"; x = 235; y = 295; w = 330; h = 165; fill = "#FFF7E8"; stroke = "#B7791F";
    attrs = @("id_cita = 1", "motivo = Control de presion arterial", "estado = completada", "prioridad_clinica = media", "puntaje_prioridad = 34")
  },
  @{
    id = "triaje"; title = "triajeControl : Triaje"; x = 30; y = 555; w = 335; h = 170; fill = "#FFEDEE"; stroke = "#C53030";
    attrs = @("id_triaje = 1", "motivo_consulta = Control PA", "presion_arterial = en observacion", "prioridad_clinica = media", "puntaje_prioridad = 34")
  },
  @{
    id = "visita"; title = "visitaControl : VisitaMedica"; x = 450; y = 555; w = 380; h = 190; fill = "#ECFEFF"; stroke = "#0E7490";
    attrs = @("id_visita = 1", "diagnostico = Hipertension controlada", "tratamiento = Losartan + dieta", "costo_consulta = 350.00", "estado origen = cita completada")
  },
  @{
    id = "auditoria"; title = "eventoVisita : EventoAuditoria"; x = 905; y = 555; w = 320; h = 165; fill = "#F8F5EF"; stroke = "#8B5E34";
    attrs = @("id_evento = 1", "accion = CREATE", "entidad = visitas_medicas", "id_entidad = 1", "metadata = JSONB")
  },
  @{
    id = "orden"; title = "ordenQuimica : OrdenLaboratorio"; x = 40; y = 825; w = 355; h = 170; fill = "#EFFFF4"; stroke = "#2F855A";
    attrs = @("id_orden = 1", "examen = Quimica sanguinea", "prioridad = alta", "estado = validado", "costo = 420.00")
  },
  @{
    id = "resultado"; title = "resultadoQuimica : ResultadoLaboratorio"; x = 60; y = 1080; w = 335; h = 155; fill = "#F0FDFA"; stroke = "#0F766E";
    attrs = @("id_resultado = 1", "resultado = parametros en rango", "validado_por = Dra. Maria Gonzalez", "fecha_resultado = ahora")
  },
  @{
    id = "prescripcion"; title = "recetaLosartan : Prescripcion"; x = 485; y = 825; w = 340; h = 170; fill = "#FFF1F8"; stroke = "#B83280";
    attrs = @("id_prescripcion = 1", "medicamento = Losartan", "dosis = 50 mg", "frecuencia = cada 24 horas", "costo = 180.00")
  },
  @{
    id = "cargo"; title = "cargoConsulta : CargoPaciente"; x = 915; y = 825; w = 330; h = 170; fill = "#F7FAFC"; stroke = "#4A5568";
    attrs = @("id_cargo = 1", "origen = consulta", "referencia_tipo = visita", "total = 350.00", "estado_pago = pagado")
  },
  @{
    id = "pago"; title = "pagoConsulta : Pago"; x = 930; y = 1080; w = 315; h = 155; fill = "#EEFDF3"; stroke = "#276749";
    attrs = @("id_pago = 1", "monto = 350.00", "metodo = Efectivo", "referencia = PAGO-CONS-001")
  },
  @{
    id = "insumo"; title = "reactivoGlucosa : InsumoLaboratorio"; x = 465; y = 1080; w = 360; h = 155; fill = "#F4F8FF"; stroke = "#315A9B";
    attrs = @("id_insumo = 2", "nombre = Reactivo de glucosa", "stock = 8", "stock_minimo = 20", "alerta = stock bajo")
  },
  @{
    id = "movimiento"; title = "entradaReactivo : MovimientoInsumo"; x = 465; y = 1295; w = 360; h = 145; fill = "#FBF8E9"; stroke = "#9A6B12";
    attrs = @("id_movimiento = 1", "tipo = entrada", "cantidad = 8", "motivo = Carga inicial")
  }
)

$links = @(
  @{ from = "paciente"; to = "cita"; label = "agenda"; color = "#4A5568" },
  @{ from = "medico"; to = "cita"; label = "atiende"; color = "#4A5568" },
  @{ from = "usuario"; to = "medico"; label = "perfil clinico"; color = "#7353BA" },
  @{ from = "cita"; to = "triaje"; label = "tiene"; color = "#C53030" },
  @{ from = "cita"; to = "visita"; label = "genera"; color = "#0E7490" },
  @{ from = "usuario"; to = "auditoria"; label = "registra"; color = "#8B5E34" },
  @{ from = "visita"; to = "auditoria"; label = "queda auditada"; color = "#8B5E34" },
  @{ from = "visita"; to = "orden"; label = "solicita"; color = "#2F855A" },
  @{ from = "orden"; to = "resultado"; label = "produce"; color = "#0F766E" },
  @{ from = "visita"; to = "prescripcion"; label = "indica"; color = "#B83280" },
  @{ from = "visita"; to = "cargo"; label = "cobra"; color = "#4A5568" },
  @{ from = "cargo"; to = "pago"; label = "liquida"; color = "#276749" },
  @{ from = "orden"; to = "insumo"; label = "usa control de stock"; color = "#315A9B" },
  @{ from = "insumo"; to = "movimiento"; label = "historial"; color = "#9A6B12" }
)

foreach ($object in $objects) {
  $object.fill = "#FFFFFF"
  $object.stroke = "#000000"
}

foreach ($link in $links) {
  $link.color = "#000000"
}

function Center($obj) {
  return @{
    x = [double]$obj.x + ([double]$obj.w / 2.0)
    y = [double]$obj.y + ([double]$obj.h / 2.0)
  }
}

function Escape-Xml([string]$text) {
  return [System.Security.SecurityElement]::Escape($text)
}

function Svg-Object($obj) {
  $x = $obj.x
  $y = $obj.y
  $w = $obj.w
  $h = $obj.h
  $title = Escape-Xml $obj.title
  $rows = New-Object System.Collections.Generic.List[string]
  $rows.Add("<g id=""$($obj.id)"">")
  $rows.Add("  <rect x=""$x"" y=""$y"" width=""$w"" height=""$h"" rx=""8"" fill=""$($obj.fill)"" fill-opacity=""1"" stroke=""$($obj.stroke)"" stroke-width=""2.4""/>")
  $rows.Add("  <line x1=""$x"" y1=""$($y + 38)"" x2=""$($x + $w)"" y2=""$($y + 38)"" stroke=""$($obj.stroke)"" stroke-width=""1.5"" opacity=""0.72""/>")
  $rows.Add("  <text x=""$($x + 14)"" y=""$($y + 25)"" class=""object-title"">$title</text>")
  for ($i = 0; $i -lt $obj.attrs.Count; $i++) {
    $attr = Escape-Xml $obj.attrs[$i]
    $rows.Add("  <text x=""$($x + 14)"" y=""$($y + 62 + ($i * 22))"" class=""object-attr"">$attr</text>")
  }
  $rows.Add("</g>")
  return ($rows -join "`n")
}

function Svg-Link($link, $map) {
  $from = $map[$link.from]
  $to = $map[$link.to]
  $a = Center $from
  $b = Center $to
  $labelX = [Math]::Round(($a.x + $b.x) / 2.0, 1)
  $labelY = [Math]::Round(($a.y + $b.y) / 2.0 - 8, 1)
  $label = Escape-Xml $link.label
  return @"
<g class="link">
  <line x1="$($a.x)" y1="$($a.y)" x2="$($b.x)" y2="$($b.y)" stroke="$($link.color)" stroke-width="2.2" stroke-opacity="1" marker-end="url(#arrow)"/>
  <text x="$labelX" y="$labelY" class="link-label">$label</text>
</g>
"@
}

$objectMap = @{}
foreach ($object in $objects) {
  $objectMap[$object.id] = $object
}

$svgLinks = ($links | ForEach-Object { Svg-Link $_ $objectMap }) -join "`n"
$svgObjects = ($objects | ForEach-Object { Svg-Object $_ }) -join "`n"

$svg = @"
<svg xmlns="http://www.w3.org/2000/svg" width="1320" height="1500" viewBox="0 0 1320 1500">
  <defs>
    <marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L9,3 z" fill="#000000" fill-opacity="1"/>
    </marker>
    <style>
      .title {
        font: 700 34px Arial, Helvetica, sans-serif;
        fill: #111827;
      }
      .subtitle {
        font: 500 18px Arial, Helvetica, sans-serif;
        fill: #374151;
      }
      .object-title {
        font: 700 17px Arial, Helvetica, sans-serif;
        fill: #111827;
        text-decoration: underline;
      }
      .object-attr {
        font: 14px Consolas, "Courier New", monospace;
        fill: #1F2937;
      }
      .link-label {
        font: 700 13px Arial, Helvetica, sans-serif;
        fill: #111827;
        paint-order: stroke;
        stroke: rgba(255, 255, 255, 0.84);
        stroke-width: 5px;
        stroke-linejoin: round;
      }
    </style>
  </defs>

  <rect width="1320" height="1500" fill="#ffffff"/>

  <text x="70" y="38" class="title">Diagrama de objetos - Centro Medico La Aurora</text>
  <text x="70" y="62" class="subtitle">Instancias de ejemplo del flujo clinico, laboratorio, cobros, inventario y auditoria.</text>

  $svgLinks

  $svgObjects
</svg>
"@

Set-Content -LiteralPath $svgPath -Value $svg -Encoding UTF8

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$scale = 2
$width = 1320 * $scale
$height = 1500 * $scale
$bitmap = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.Clear([System.Drawing.Color]::White)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
$graphics.ScaleTransform($scale, $scale)

$fontTitle = New-Object System.Drawing.Font("Arial", 24, [System.Drawing.FontStyle]::Bold)
$fontSubtitle = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Regular)
$fontObjectTitle = New-Object System.Drawing.Font("Arial", 11.5, [System.Drawing.FontStyle]::Bold)
$fontAttr = New-Object System.Drawing.Font("Consolas", 10.2, [System.Drawing.FontStyle]::Regular)
$fontLink = New-Object System.Drawing.Font("Arial", 9, [System.Drawing.FontStyle]::Bold)

$textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 17, 24, 39))
$subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 55, 65, 81))

$graphics.DrawString("Diagrama de objetos - Centro Medico La Aurora", $fontTitle, $textBrush, 70, 14)
$graphics.DrawString("Instancias de ejemplo del flujo clinico, laboratorio, cobros, inventario y auditoria.", $fontSubtitle, $subBrush, 70, 50)

function Color-FromHex([string]$hex, [int]$alpha = 255) {
  $h = $hex.TrimStart("#")
  return [System.Drawing.Color]::FromArgb($alpha, [Convert]::ToInt32($h.Substring(0, 2), 16), [Convert]::ToInt32($h.Substring(2, 2), 16), [Convert]::ToInt32($h.Substring(4, 2), 16))
}

function Draw-Arrow($graphics, $x1, $y1, $x2, $y2, $color) {
  $pen = New-Object System.Drawing.Pen((Color-FromHex $color 255), 2)
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::ArrowAnchor
  $graphics.DrawLine($pen, [single]$x1, [single]$y1, [single]$x2, [single]$y2)
  $pen.Dispose()
}

foreach ($link in $links) {
  $from = $objectMap[$link.from]
  $to = $objectMap[$link.to]
  $a = Center $from
  $b = Center $to
  Draw-Arrow $graphics $a.x $a.y $b.x $b.y $link.color
  $midX = [single](($a.x + $b.x) / 2.0)
  $midY = [single](($a.y + $b.y) / 2.0 - 20)
  $labelSize = $graphics.MeasureString($link.label, $fontLink)
  $haloBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(216, 255, 255, 255))
  $graphics.FillRectangle($haloBrush, $midX - ($labelSize.Width / 2) - 4, $midY - 2, $labelSize.Width + 8, $labelSize.Height + 3)
  $haloBrush.Dispose()
  $linkBrush = New-Object System.Drawing.SolidBrush((Color-FromHex $link.color 255))
  $graphics.DrawString($link.label, $fontLink, $linkBrush, $midX - ($labelSize.Width / 2), $midY)
  $linkBrush.Dispose()
}

foreach ($object in $objects) {
  $rect = New-Object System.Drawing.RectangleF([single]$object.x, [single]$object.y, [single]$object.w, [single]$object.h)
  $fillBrush = New-Object System.Drawing.SolidBrush((Color-FromHex $object.fill 255))
  $strokePen = New-Object System.Drawing.Pen((Color-FromHex $object.stroke 255), 2.2)
  $graphics.FillRectangle($fillBrush, $rect)
  $graphics.DrawRectangle($strokePen, $object.x, $object.y, $object.w, $object.h)
  $graphics.DrawLine($strokePen, $object.x, $object.y + 38, $object.x + $object.w, $object.y + 38)
  $graphics.DrawString($object.title, $fontObjectTitle, $textBrush, $object.x + 12, $object.y + 12)
  $underlinePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 17, 24, 39), 1)
  $titleSize = $graphics.MeasureString($object.title, $fontObjectTitle)
  $graphics.DrawLine($underlinePen, $object.x + 12, $object.y + 31, $object.x + 12 + $titleSize.Width, $object.y + 31)
  for ($i = 0; $i -lt $object.attrs.Count; $i++) {
    $graphics.DrawString($object.attrs[$i], $fontAttr, $textBrush, $object.x + 14, $object.y + 51 + ($i * 22))
  }
  $underlinePen.Dispose()
  $fillBrush.Dispose()
  $strokePen.Dispose()
}

$bitmap.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$bitmap.Dispose()
$fontTitle.Dispose()
$fontSubtitle.Dispose()
$fontObjectTitle.Dispose()
$fontAttr.Dispose()
$fontLink.Dispose()
$textBrush.Dispose()
$subBrush.Dispose()

Write-Host "SVG: $svgPath"
Write-Host "PNG: $pngPath"
