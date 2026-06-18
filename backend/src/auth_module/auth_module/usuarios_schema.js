// Agrega este bloque al array SCHEMA_STATEMENTS en tu schema.js existente
// Pégalo ANTES del último statement de cierre

/*
  Tabla: usuarios
  Roles disponibles: admin, medico, recepcionista
  
  - Un médico puede tener un usuario asociado (id_medico)
  - Un admin/recepcionista no tiene id_medico
*/

const USUARIOS_SCHEMA = [
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
  `
    CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_key ON usuarios(email);
  `,
  `
    CREATE UNIQUE INDEX IF NOT EXISTS usuarios_id_medico_key
    ON usuarios(id_medico)
    WHERE id_medico IS NOT NULL;
  `,
];

// INSTRUCCIONES DE INTEGRACIÓN:
// En tu schema.js, agrega estos 3 statements al array SCHEMA_STATEMENTS
// justo antes del cierre del array (antes del último `]`)
