const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS configuracion_centro (
    id SMALLINT PRIMARY KEY CHECK (id = 1),
    datos JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `
    CREATE TABLE IF NOT EXISTS pacientes (
      id_paciente SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      dni TEXT NOT NULL,
      telefono TEXT,
      email TEXT,
      fecha_nacimiento DATE,
      sexo TEXT,
      residencia TEXT,
      contacto_emergencia TEXT,
      fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    ALTER TABLE pacientes
      ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `,
  `
    ALTER TABLE pacientes
      ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
  `,
  `
    ALTER TABLE pacientes
      ADD COLUMN IF NOT EXISTS sexo TEXT;
  `,
  `
    ALTER TABLE pacientes
      ADD COLUMN IF NOT EXISTS residencia TEXT;
  `,
  `
    ALTER TABLE pacientes
      ADD COLUMN IF NOT EXISTS contacto_emergencia TEXT;
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS pacientes_dni_key ON pacientes(dni);
  `,
  `
    CREATE TABLE IF NOT EXISTS medicos (
      id_medico SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      especialidad TEXT NOT NULL,
      licencia TEXT
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS medicos_licencia_key
    ON medicos(licencia)
    WHERE licencia IS NOT NULL;
  `,
  `
    CREATE TABLE IF NOT EXISTS citas (
      id_cita SERIAL PRIMARY KEY,
      id_paciente INTEGER NOT NULL REFERENCES pacientes(id_paciente) ON DELETE RESTRICT,
      id_medico INTEGER NOT NULL REFERENCES medicos(id_medico) ON DELETE RESTRICT,
      fecha_hora TIMESTAMPTZ NOT NULL,
      motivo TEXT,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      triaje_notas TEXT,
      prioridad_clinica TEXT NOT NULL DEFAULT 'baja',
      puntaje_prioridad INTEGER NOT NULL DEFAULT 10,
      motivos_prioridad TEXT,
      hora_llegada TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      hora_inicio_atencion TIMESTAMPTZ,
      hora_fin_atencion TIMESTAMPTZ
    );
  `,
  `
    ALTER TABLE citas
      ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'pendiente';
  `,
  `
    ALTER TABLE citas
      ADD COLUMN IF NOT EXISTS triaje_notas TEXT;
  `,
  `
    ALTER TABLE citas
      ADD COLUMN IF NOT EXISTS prioridad_clinica TEXT NOT NULL DEFAULT 'baja';
  `,
  `
    ALTER TABLE citas
      ADD COLUMN IF NOT EXISTS puntaje_prioridad INTEGER NOT NULL DEFAULT 10;
  `,
  `
    ALTER TABLE citas
      ADD COLUMN IF NOT EXISTS motivos_prioridad TEXT;
  `,
  `
    ALTER TABLE citas
      ADD COLUMN IF NOT EXISTS hora_llegada TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `,
  `
    ALTER TABLE citas
      ADD COLUMN IF NOT EXISTS hora_inicio_atencion TIMESTAMPTZ;
  `,
  `
    ALTER TABLE citas
      ADD COLUMN IF NOT EXISTS hora_fin_atencion TIMESTAMPTZ;
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_citas_prioridad
    ON citas(estado, puntaje_prioridad DESC, fecha_hora ASC);
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS citas_medico_fecha_activa_key
    ON citas(id_medico, fecha_hora)
    WHERE estado NOT IN ('cancelada');
  `,
  `
    CREATE TABLE IF NOT EXISTS triajes (
      id_triaje SERIAL PRIMARY KEY,
      id_cita INTEGER NOT NULL UNIQUE REFERENCES citas(id_cita) ON DELETE CASCADE,
      id_paciente INTEGER NOT NULL REFERENCES pacientes(id_paciente) ON DELETE RESTRICT,
      fecha_triaje TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      motivo_consulta TEXT NOT NULL,
      historia_enfermedad_actual TEXT,
      antecedentes_relevantes TEXT,
      alergias_referidas TEXT,
      presion_arterial TEXT,
      frecuencia_cardiaca INTEGER,
      frecuencia_respiratoria INTEGER,
      temperatura NUMERIC(4,1),
      saturacion_oxigeno INTEGER,
      peso NUMERIC(6,2),
      observaciones TEXT,
      prioridad_clinica TEXT NOT NULL DEFAULT 'baja',
      puntaje_prioridad INTEGER NOT NULL DEFAULT 10,
      motivos_prioridad TEXT,
      estado_prioridad TEXT NOT NULL DEFAULT 'propuesto' CHECK (estado_prioridad IN ('propuesto', 'validado')),
      justificacion_cambio TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  
         `ALTER TABLE triajes ADD COLUMN IF NOT EXISTS estado_prioridad TEXT NOT NULL DEFAULT 'propuesto';`,
     `ALTER TABLE triajes ADD COLUMN IF NOT EXISTS justificacion_cambio TEXT;`,
  
  `
    CREATE INDEX IF NOT EXISTS idx_triajes_prioridad
    ON triajes(prioridad_clinica, puntaje_prioridad DESC);
  `,
  `
    CREATE TABLE IF NOT EXISTS visitas_medicas (
      id_visita SERIAL PRIMARY KEY,
      id_cita INTEGER UNIQUE REFERENCES citas(id_cita) ON DELETE SET NULL,
      id_paciente INTEGER NOT NULL REFERENCES pacientes(id_paciente) ON DELETE RESTRICT,
      id_medico INTEGER NOT NULL REFERENCES medicos(id_medico) ON DELETE RESTRICT,
      fecha_visita TIMESTAMPTZ NOT NULL,
      motivo TEXT NOT NULL,
      historia_enfermedad_actual TEXT,
      antecedentes_medicos TEXT,
      antecedentes_quirurgicos TEXT,
      antecedentes_alergicos TEXT,
      antecedentes_traumaticos TEXT,
      antecedentes_ginecologicos TEXT,
      examen_fisico TEXT,
      presion_arterial TEXT,
      frecuencia_cardiaca INTEGER,
      frecuencia_respiratoria INTEGER,
      temperatura NUMERIC(4,1),
      saturacion_oxigeno INTEGER,
      impresion_clinica TEXT,
      diagnostico TEXT NOT NULL,
      tratamiento TEXT,
      conducta TEXT,
      tipo_atencion TEXT,
      dieta TEXT,
      soluciones TEXT,
      ultrasonido TEXT,
      rayos_x TEXT,
      ordenes_especiales TEXT,
      diagnostico_egreso TEXT,
      fecha_egreso TIMESTAMPTZ,
      observaciones TEXT,
      costo_consulta NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS historia_enfermedad_actual TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS antecedentes_medicos TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS antecedentes_quirurgicos TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS antecedentes_alergicos TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS antecedentes_traumaticos TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS antecedentes_ginecologicos TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS examen_fisico TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS presion_arterial TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS frecuencia_cardiaca INTEGER;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS frecuencia_respiratoria INTEGER;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS temperatura NUMERIC(4,1);
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS saturacion_oxigeno INTEGER;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS impresion_clinica TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS conducta TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS tipo_atencion TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS dieta TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS soluciones TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS ultrasonido TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS rayos_x TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS ordenes_especiales TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS diagnostico_egreso TEXT;
  `,
  `
    ALTER TABLE visitas_medicas ADD COLUMN IF NOT EXISTS fecha_egreso TIMESTAMPTZ;
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_visitas_paciente ON visitas_medicas(id_paciente);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_visitas_medico ON visitas_medicas(id_medico);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_visitas_fecha ON visitas_medicas(fecha_visita);
  `,
  `
    CREATE TABLE IF NOT EXISTS ordenes_laboratorio (
      id_orden SERIAL PRIMARY KEY,
      id_paciente INTEGER NOT NULL REFERENCES pacientes(id_paciente) ON DELETE RESTRICT,
      id_cita INTEGER REFERENCES citas(id_cita) ON DELETE SET NULL,
      id_visita INTEGER REFERENCES visitas_medicas(id_visita) ON DELETE SET NULL,
      examen TEXT NOT NULL,
      prioridad TEXT NOT NULL DEFAULT 'normal',
      estado TEXT NOT NULL DEFAULT 'pendiente',
      costo NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_ordenes_laboratorio_paciente
    ON ordenes_laboratorio(id_paciente);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_ordenes_laboratorio_visita
    ON ordenes_laboratorio(id_visita);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_ordenes_laboratorio_cita
    ON ordenes_laboratorio(id_cita);
  `,
  `
    CREATE TABLE IF NOT EXISTS insumos_laboratorio (
      id_insumo SERIAL PRIMARY KEY,
      nombre TEXT NOT NULL,
      categoria TEXT NOT NULL DEFAULT 'Laboratorio',
      unidad TEXT NOT NULL DEFAULT 'unidad',
      stock INTEGER NOT NULL DEFAULT 0,
      stock_minimo INTEGER NOT NULL DEFAULT 0,
      fecha_vencimiento DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_insumos_laboratorio_stock
    ON insumos_laboratorio(stock, stock_minimo);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_insumos_laboratorio_vencimiento
    ON insumos_laboratorio(fecha_vencimiento);
  `,
  `
    CREATE TABLE IF NOT EXISTS resultados_laboratorio (
      id_resultado SERIAL PRIMARY KEY,
      id_orden INTEGER NOT NULL UNIQUE REFERENCES ordenes_laboratorio(id_orden) ON DELETE CASCADE,
      resultado TEXT NOT NULL,
      observaciones TEXT,
      fecha_resultado TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      validado_por TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS prescripciones (
      id_prescripcion SERIAL PRIMARY KEY,
      id_visita INTEGER NOT NULL REFERENCES visitas_medicas(id_visita) ON DELETE CASCADE,
      medicamento TEXT NOT NULL,
      dosis TEXT NOT NULL,
      frecuencia TEXT NOT NULL,
      duracion TEXT NOT NULL,
      instrucciones TEXT,
      costo NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_prescripciones_visita
    ON prescripciones(id_visita);
  `,
  `
    CREATE TABLE IF NOT EXISTS cargos_paciente (
      id_cargo SERIAL PRIMARY KEY,
      id_paciente INTEGER NOT NULL REFERENCES pacientes(id_paciente) ON DELETE RESTRICT,
      origen TEXT NOT NULL,
      referencia_tipo TEXT NOT NULL,
      referencia_id INTEGER NOT NULL,
      descripcion TEXT,
      subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
      total NUMERIC(10,2) NOT NULL DEFAULT 0,
      saldo NUMERIC(10,2) NOT NULL DEFAULT 0,
      estado_pago TEXT NOT NULL DEFAULT 'pendiente',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS cargos_paciente_referencia_tipo_referencia_id_key
    ON cargos_paciente(referencia_tipo, referencia_id);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_cargos_paciente_paciente
    ON cargos_paciente(id_paciente);
  `,
  `
    CREATE TABLE IF NOT EXISTS pagos (
      id_pago SERIAL PRIMARY KEY,
      id_paciente INTEGER NOT NULL REFERENCES pacientes(id_paciente) ON DELETE RESTRICT,
      id_cargo INTEGER NOT NULL REFERENCES cargos_paciente(id_cargo) ON DELETE CASCADE,
      monto NUMERIC(10,2) NOT NULL,
      fecha_pago TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      metodo TEXT NOT NULL,
      referencia TEXT,
      observaciones TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_pagos_paciente ON pagos(id_paciente);
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_pagos_cargo ON pagos(id_cargo);
  `,

   `
    CREATE TABLE IF NOT EXISTS usuarios (
      id_usuario   SERIAL PRIMARY KEY,
      nombre       TEXT NOT NULL,
      email        TEXT NOT NULL,
      password     TEXT NOT NULL,
      rol          TEXT NOT NULL DEFAULT 'recepcionista',
      id_medico    INTEGER REFERENCES medicos(id_medico) ON DELETE SET NULL,
      activo       BOOLEAN NOT NULL DEFAULT TRUE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_key ON usuarios(email);`,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS usuarios_id_medico_key
    ON usuarios(id_medico) WHERE id_medico IS NOT NULL;
  `,
  `
    CREATE TABLE IF NOT EXISTS movimientos_insumos_laboratorio (
      id_movimiento SERIAL PRIMARY KEY,
      id_insumo INTEGER NOT NULL REFERENCES insumos_laboratorio(id_insumo) ON DELETE CASCADE,
      tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
      cantidad INTEGER NOT NULL CHECK (cantidad > 0),
      motivo TEXT,
      id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_movimientos_insumos_insumo
    ON movimientos_insumos_laboratorio(id_insumo, created_at DESC);
  `,
  `
    CREATE TABLE IF NOT EXISTS eventos_auditoria (
      id_evento SERIAL PRIMARY KEY,
      id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
      accion TEXT NOT NULL,
      entidad TEXT NOT NULL,
      id_entidad TEXT,
      descripcion TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE INDEX IF NOT EXISTS idx_eventos_auditoria_created
    ON eventos_auditoria(created_at DESC);
  `,

  `CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    tipo TEXT NOT NULL CHECK (tipo IN ('inventario','farmacia')),
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    unidad TEXT NOT NULL,
    proveedor TEXT NOT NULL DEFAULT '',
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    minimo INTEGER NOT NULL DEFAULT 0 CHECK (minimo >= 0),
    precio NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio >= 0),
    vencimiento DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS movimientos_productos (
    id SERIAL PRIMARY KEY,
    id_producto INTEGER NOT NULL REFERENCES productos(id),
    cantidad INTEGER NOT NULL CHECK (cantidad <> 0),
    motivo TEXT NOT NULL,
    id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS documentos_paciente (
    id SERIAL PRIMARY KEY,
    id_paciente INTEGER NOT NULL REFERENCES pacientes(id_paciente) ON DELETE RESTRICT,
    nombre TEXT NOT NULL,
    descripcion TEXT NOT NULL DEFAULT '',
    tipo TEXT NOT NULL,
    contenido BYTEA NOT NULL,
    id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `ALTER TABLE prescripciones ADD COLUMN IF NOT EXISTS id_producto INTEGER REFERENCES productos(id) ON DELETE RESTRICT;`,
  `ALTER TABLE prescripciones ADD COLUMN IF NOT EXISTS cantidad INTEGER CHECK (cantidad > 0);`,
  `ALTER TABLE movimientos_productos ADD COLUMN IF NOT EXISTS id_prescripcion INTEGER REFERENCES prescripciones(id_prescripcion) ON DELETE SET NULL;`,
  `CREATE INDEX IF NOT EXISTS idx_movimientos_productos_prescripcion
    ON movimientos_productos(id_prescripcion) WHERE id_prescripcion IS NOT NULL;`,
  `CREATE TABLE IF NOT EXISTS atenciones_rapidas (
    id SERIAL PRIMARY KEY,
    solicitud UUID NOT NULL UNIQUE,
    nombre_temporal VARCHAR(160),
    motivo VARCHAR(2000) NOT NULL,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_atencion','finalizada')),
    id_paciente INTEGER REFERENCES pacientes(id_paciente) ON DELETE RESTRICT,
    iniciado_por INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    atendido_por INTEGER REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    actualizado_por INTEGER NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
];

SCHEMA_STATEMENTS.push(`CREATE TABLE IF NOT EXISTS notificaciones_correo (
  id UUID PRIMARY KEY,
  evento_clave TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('paciente_bienvenida','usuario_bienvenida','cita_confirmacion','cita_reprogramacion','estado_cuenta')),
  entidad_id INTEGER NOT NULL,
  destinatario VARCHAR(254) NOT NULL,
  mensaje JSONB NOT NULL,
  id_usuario INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','enviando','aceptado','fallido','desconocido')),
  proveedor_id TEXT,
  error_codigo TEXT,
  primer_intento TIMESTAMPTZ,
  ultimo_intento TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);
SCHEMA_STATEMENTS.push(`CREATE INDEX IF NOT EXISTS idx_notificaciones_correo_usuario ON notificaciones_correo(id_usuario,created_at DESC);`);

async function ensureSchema(pool) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const statement of SCHEMA_STATEMENTS) {
      await client.query(statement);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  ensureSchema,
};
