# Guía de integración — Auth JWT

## 1. Instalar dependencias

```bash
cd backend
npm install bcryptjs jsonwebtoken
```

---

## 2. Agregar variables al .env

```env
JWT_SECRET=una_clave_secreta_muy_larga_y_segura_cambiar_esto
JWT_EXPIRES_IN=8h
```

> ⚠️ JWT_SECRET debe ser una cadena larga y aleatoria. Nunca la subas a GitHub.

---

## 3. Copiar los archivos al proyecto

| Archivo                          | Destino en tu proyecto                        |
|----------------------------------|-----------------------------------------------|
| `auth.middleware.js`             | `backend/src/middlewares/auth.middleware.js`  |
| `auth.service.js`                | `backend/src/modules/auth/auth.service.js`    |
| `auth.routes.js`                 | `backend/src/modules/auth/auth.routes.js`     |
| `create-admin.js`                | `backend/scripts/create-admin.js`             |

---

## 4. Agregar la tabla usuarios al schema.js

Abre `backend/schema.js` y agrega estos 3 statements al array `SCHEMA_STATEMENTS`
**al final, antes del cierre `]`**:

```js
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
```

---

## 5. Registrar la ruta en app.js

Abre `backend/src/app.js` y agrega:

```js
// Al inicio, junto con los demás require de rutas:
const authRoutes = require("./modules/auth/auth.routes");

// Antes de las otras rutas (es pública):
app.use("/api/auth", authRoutes);
```

---

## 6. Proteger las rutas existentes

En cada archivo de rutas, importa el middleware y aplícalo:

```js
const { requireAuth, requireRole } = require("../../middlewares/auth.middleware");

// Ejemplo — cualquier usuario autenticado:
router.get("/", requireAuth, async (req, res) => { ... });

// Ejemplo — solo admin:
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => { ... });
```

### Tabla de permisos recomendada:

| Recurso              | GET        | POST             | PUT              | DELETE           |
|----------------------|------------|------------------|------------------|------------------|
| /api/pacientes       | Auth       | Auth             | Auth             | Admin            |
| /api/medicos         | Auth       | Admin            | Admin            | Admin            |
| /api/citas           | Auth       | Auth             | Auth             | Admin            |
| /api/visitas         | Auth       | Médico / Admin   | Médico / Admin   | Admin            |
| /api/laboratorio     | Auth       | Auth             | Auth             | Admin            |
| /api/prescripciones  | Auth       | Médico / Admin   | Médico / Admin   | Admin            |
| /api/cargos          | Auth       | —                | —                | —                |
| /api/pagos           | Auth       | Recepcionista / Admin | —           | —                |

---

## 7. Crear el primer admin

```bash
node scripts/create-admin.js
```

Esto crea el usuario:
- Email: `admin@centromedico.com`
- Password: `Admin1234!`

> Cambia la contraseña inmediatamente después del primer login.

---

## 8. Probar el login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@centromedico.com","password":"Admin1234!"}'
```

Respuesta esperada:
```json
{
  "token": "eyJhbGci...",
  "usuario": {
    "id_usuario": 1,
    "nombre": "Administrador",
    "email": "admin@centromedico.com",
    "rol": "admin"
  }
}
```

---

## 9. Usar el token en el frontend

```js
// Al hacer login, guarda el token:
localStorage.setItem("token", data.token);

// En cada request al backend, envíalo en el header:
const response = await fetch("/api/pacientes", {
  headers: {
    "Authorization": `Bearer ${localStorage.getItem("token")}`
  }
});
```

---

## Flujo completo

```
Usuario ingresa email + password
        ↓
POST /api/auth/login
        ↓
Backend verifica credenciales con bcrypt
        ↓
Devuelve JWT firmado (válido 8h)
        ↓
Frontend guarda token en localStorage
        ↓
Cada request incluye: Authorization: Bearer <token>
        ↓
Middleware auth.middleware.js verifica y decodifica el token
        ↓
req.usuario queda disponible en todos los handlers
```
