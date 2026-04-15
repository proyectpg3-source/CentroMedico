require('dotenv').config();


const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors());
app.use(express.json());

function sanitizePaciente(body) {
  return {
    nombre: body.nombre?.trim(),
    dni: body.dni?.trim(),
    telefono: body.telefono?.trim() || null,
    email: body.email?.trim() || null,
  };
}

function validatePaciente(paciente, res) {
  if (!paciente.nombre || !paciente.dni) {
    res.status(400).json({ message: 'Nombre y DNI son obligatorios.' });
    return false;
  }

  return true;
}

function handleDatabaseError(error, res, fallbackMessage) {
  console.error(error);

  if (error.code === '23505') {
    return res.status(409).json({ message: 'Ya existe un paciente con ese DNI.' });
  }

  return res.status(500).json({ message: fallbackMessage });
}

app.get('/', (req, res) => {
  res.json({ message: 'Servidor del Centro Medico activo.' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/pacientes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pacientes ORDER BY id_paciente');
    res.json(result.rows);
  } catch (error) {
    handleDatabaseError(error, res, 'Error al obtener pacientes.');
  }
});

app.get('/api/pacientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM pacientes WHERE id_paciente = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Paciente no encontrado.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return handleDatabaseError(error, res, 'Error al obtener el paciente.');
  }
});

app.post('/api/pacientes', async (req, res) => {
  try {
    const paciente = sanitizePaciente(req.body);

    if (!validatePaciente(paciente, res)) {
      return;
    }

    const result = await pool.query(
      `INSERT INTO pacientes (nombre, dni, telefono, email, fecha_registro)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [paciente.nombre, paciente.dni, paciente.telefono, paciente.email]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    handleDatabaseError(error, res, 'Error al insertar paciente.');
  }
});

app.put('/api/pacientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const paciente = sanitizePaciente(req.body);

    if (!validatePaciente(paciente, res)) {
      return;
    }

    const result = await pool.query(
      `UPDATE pacientes
       SET nombre = $1,
           dni = $2,
           telefono = $3,
           email = $4
       WHERE id_paciente = $5
       RETURNING *`,
      [paciente.nombre, paciente.dni, paciente.telefono, paciente.email, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Paciente no encontrado.' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return handleDatabaseError(error, res, 'Error al actualizar paciente.');
  }
});

app.delete('/api/pacientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM pacientes WHERE id_paciente = $1 RETURNING id_paciente',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Paciente no encontrado.' });
    }

    return res.json({ message: 'Paciente eliminado correctamente.' });
  } catch (error) {
    return handleDatabaseError(error, res, 'Error al eliminar paciente.');
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
