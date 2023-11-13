//IMPORT NPM REQUIRED
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

//AUTENTICATION AND AUTHORITATION
// Generate and verify tokens JWT
const generateToken = (payload) => {
  const token = jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: '1h' });
  return token;
};

const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    return decoded;
  } catch (err) {
    return null;
  }
};
// Authoritation middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido' });
  }
  req.user = decoded;
  next();
};


//CREATE & CONFIG SERVER
const server = express();
server.use(cors());
server.use(express.json({ limit: '25mb' }));
server.set('view engine', 'ejs');

// SERVER PORT
const serverPort = 3110;
server.listen(serverPort, () =>
  console.log(`Server listening at http://localhost:${serverPort}`)
);

async function getConnection() {
  const connection = await mysql.createConnection({
    host: process.env.HOST,
    user: process.env.DBUSER,
    password: process.env.PASS,
    // database: process.env.DATABASE, /* Comentado para poder elegir bases de datos distintas en las querys */
  });
  await connection.connect();

  console.log(
    `Conexión establecida con la base de datos (identificador=${connection.threadId})`
  );
  return connection;
}

//Endpoint para escuchar peticiones de todas las recetas
server.get('/recetas', async (req, res) => {
  console.log('Haciendo petición a la base de datos');

  let queryAllRecipes = 'SELECT * FROM recetas_db.recetas';

  const connection = await getConnection();
  const [results] = await connection.query(queryAllRecipes);

  const numOfElements = results.length;

  res.json({
    success: true,
    info: { count: numOfElements }, // número de elementos
    results: results, // listado
  });
  connection.end();
});

//Endpoint para escuchar peticiones del detalle de una receta
server.get('/recetas/:id', authenticateToken, async (req, res) => {
  console.log('Haciendo petición a la base de datos');

  const paramsId = req.params.id;
  let status = 0;
  let response = {};

  const queryIdRecipe = `SELECT * FROM recetas_db.recetas WHERE id = ?;`;

  const connection = await getConnection();
  const [recipe] = await connection.query(queryIdRecipe, [paramsId]);
  connection.end();

  status = 200;
  response = {
    success: true,
    results: recipe[0],
  };
  if (recipe.length === 0) {
    status = 404;
    response = {
      success: false,
      error: 'Receta no encontrada',
    };
  }

  res.status(status).json(response);
});

//Endpoint para crear nuevas recetas
server.post('/recetas', async (req, res) => {
  console.log('Revisando datos recibidos');

  const body = req.body;

  let status = 0;
  let response = {};

  //Comprobar que se reciben bien los datos necesarios
  let missingNombre = !body.nombre || body.nombre === '';
  let missingIng = !body.ingredientes || body.ingredientes === '';
  let missingInst = !body.instrucciones || body.instrucciones === '';

  const msgError =
    'Los siguientes datos son obligatorios:' +
    (missingNombre ? ' nombre ' : '') +
    (missingIng ? ' ingredientes ' : '') +
    (missingInst ? ' instrucciones' : '');

  if (missingNombre || missingIng || missingInst) {
    status = 400;
    response = {
      success: false,
      error: msgError,
    };
  } else {
    console.log('Enviando datos a la base de datos');

    const insertRecipe =
      'INSERT INTO recetas (nombre, ingredientes, instrucciones) values (?, ?, ?);';

    try {
      const conn = await getConnection();
      const [resultRecipe] = await conn.query(insertRecipe, [
        body.nombre,
        body.ingredientes,
        body.instrucciones,
      ]);
      conn.end();
      status = 200;
      response = {
        success: true,
        id: resultRecipe.insertId,
      };
    } catch (error) {
      status = 500;
      response = {
        success: false,
        error: 'Error en el servidor',
      };
    }
  }

  res.status(status).json(response);
});

//Endpoint para modificar recetas
server.put('/recetas/:id', async (req, res) => {
  console.log('Revisando datos recibidos');
  const paramsId = req.params.id;
  const body = req.body;

  let status = 0;
  let response = {};

  //comprobar si están los 3 datos y si tienen contenido. Después comprobar si existe la receta en db, por último moddificar la receta:

  //Comprobar que se reciben bien los datos necesarios
  let missingNombre = !body.nombre || body.nombre === '';
  let missingIng = !body.ingredientes || body.ingredientes === '';
  let missingInst = !body.instrucciones || body.instrucciones === '';

  const msgError =
    'Los siguientes datos son obligatorios:' +
    (missingNombre ? ' nombre ' : '') +
    (missingIng ? ' ingredientes ' : '') +
    (missingInst ? ' instrucciones' : '');

  if (missingNombre || missingIng || missingInst) {
    status = 400;
    response = {
      success: false,
      error: msgError,
    };
  } else {
    //Comprobar si existe la receta en db
    console.log('Comprobando si existe receta');

    const queryIfRecipeExists = `SELECT * FROM recetas_db.recetas WHERE id = ${paramsId};`;

    const connection = await getConnection();
    const [previousRecipe] = await connection.query(queryIfRecipeExists);
    console.log(previousRecipe);

    //no existe:
    if (previousRecipe.length === 0) {
      status = 404;
      response = {
        success: false,
        error: 'Receta no encontrada',
      };
    }
    //sí existe: enviar datos para modificar
    else {
      console.log('Enviando datos a la base de datos');

      const queryToModifyRecipe =
        'UPDATE recetas SET nombre = ?, ingredientes = ?, instrucciones = ? WHERE (id = ?);';
      const [modifyRecipe] = await connection.query(queryToModifyRecipe, [
        body.nombre,
        body.ingredientes,
        body.instrucciones,
        paramsId,
      ]);

      //Obtener los nuevos datos para enviarlos en la respuesta
      const [recipeModified] = await connection.query(queryIfRecipeExists);

      status = 200;
      response = {
        success: true,
        'previous data': previousRecipe,
        'new data': recipeModified,
      };
    }

    connection.end();
  }

  res.status(status).json(response);
});

//Endpoint para eliminar una receta
server.delete('/recetas/:id', async (req, res) => {
  console.log('Haciendo petición a la base de datos');

  const paramsId = req.params.id;
  let status = 0;
  let response = {};

  const queryIdRecipe = 'SELECT * FROM recetas_db.recetas WHERE id = ?;';

  try {
    const connection = await getConnection();
    const [recipe] = await connection.query(queryIdRecipe, [paramsId]);
    if (recipe.length === 0) {
      status = 404;
      response = {
        success: false,
        error: 'Receta no encontrada',
      };
    } else {
      const queryDeleteRecipe =
        'DELETE FROM recetas_db.recetas WHERE (id = ?);';
      const [results] = await connection.query(queryDeleteRecipe, [paramsId]);
      status = 200;
      response = {
        success: true,
      };
    }
    connection.end();
  } catch (error) {
    console.error('Error al eliminar la receta:', error);
    status = 500;
    response = {
      success: false,
      error: 'Error interno del servidor',
    };
  }
  res.status(status).json(response);
});

//AUTENTICACIÓN
// SE RECOMIENDA USER EL 'secret_key' EN VARIABLE DE ENTORNO

// Generate and verify tokens JWT


//  Registro de usuario (POST /registro)
server.post('/registro', async (req, res) => {
  const { nombre, email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);

  //comprobar primero si el email ya existe en db
  const queryCheckIfEmailIsInDb =
    'SELECT * FROM usuarios_db.usuarios WHERE email = ?;';

  try {
    const connection = await getConnection();
    const [user] = await connection.query(queryCheckIfEmailIsInDb, [email]);
    // Si ya existe devolver mensaje error
    if (user[0]) {
      connection.end();
      res.json({
        success: false,
        errorMessage: 'Este email ya está registrado',
      });
      return;
    }
    // Si no existe, crear token, añadir user a DB y devolver mensaje ok+token
    else {
      const queryAddUser =
        'INSERT INTO usuarios_db.usuarios (nombre,email,password) VALUES (?,?,?)';

      let infoForToken = {
        nombre: nombre,
        email: email,
        passwordHash: passwordHash,
      };
      jwt.sign(infoForToken, process.env.SECRET_KEY, async (err, token) => {
        if (err) {
          res.status(400).send({ msg: 'Error' });
        } else {
          try {
            const [newUser] = await connection.query(queryAddUser, [
              nombre,
              email,
              passwordHash,
            ]);
            connection.end();
            res.json({ success: true, token: token, id: newUser.insertId });
          } catch (error) {
            console.error(error);
            res.status(500).json({
              success: false,
              error: 'Error en el servidor aguas abajo',
            });
          }
        }
      });
    }
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, error: 'Error en el servidor aguas arriba' });
  }
});

//  Registro de usuario (POST /registro) (más sencillo y con validaciones)
server.post('/registrodos', async (req, res) => {
  const { nombre, email, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);

  //Comprobar que se reciben bien los datos necesarios
  let missingNombre = !nombre || nombre === '';
  let missingEmail = !email || email === '';
  let missingPass = !password || password === '';

  const msgError =
    'Los siguientes datos son obligatorios:' +
    (missingNombre ? ' nombre ' : '') +
    (missingEmail ? ' email ' : '') +
    (missingPass ? '  contraseña ' : '');

  if (missingNombre || missingEmail || missingPass) {
    res.status(400).json({
      success: false,
      error: msgError,
    });
    return;
  } else {
    //comprobar primero si el email ya existe en db
    const queryCheckIfEmailIsInDb =
      'SELECT * FROM usuarios_db.usuarios WHERE email = ?;';

    try {
      const connection = await getConnection();
      const [user] = await connection.query(queryCheckIfEmailIsInDb, [email]);
      // Si ya existe devolver mensaje error
      if (user[0]) {
        connection.end();
        res.json({
          success: false,
          error: 'Este email ya está registrado',
        });
      }
      // Si no existe, crear token, añadir user a DB y devolver mensaje ok+token
      else {
        const queryAddUser =
          'INSERT INTO usuarios_db.usuarios (nombre,email,password) VALUES (?,?,?)';

        let infoForToken = {
          nombre: nombre,
          email: email,
          passwordHash: passwordHash,
        };
        const token = generateToken(infoForToken);
        try {
          const [newUser] = await connection.query(queryAddUser, [
            nombre,
            email,
            passwordHash,
          ]);
          connection.end();
          res.json({ success: true, token: token, id: newUser.insertId });
        } catch (error) {
          console.error(error);
          res.status(500).json({
            success: false,
            error: 'Error en el servidor aguas abajo',
          });
        }
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        error: 'Error en el servidor aguas arriba',
      });
    }
  }
});

//Inicio de sesión (POST /login)
server.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const body = req.body;

  //Comprobar si user existe en db
  try {
    const querySearchUser =
      'SELECT * FROM usuarios_db.usuarios WHERE email = ?;';
    const connection = await getConnection();
    const [users] = await connection.query(querySearchUser, [email]);
    connection.end();
    const user = users[0];
    //Comprobar si hay user en db y si pass coincide (bcrypt.compare)
    const userAndPassOk = !user
      ? false
      : await bcrypt.compare(password, user.password);
    //No coinciden: dar respuesta json
    if (!userAndPassOk) {
      return res
        .status(401)
        .json({ success: false, errorMessage: 'Credenciales inválidas' });
    }
    //Sí coinciden: generar un token (con la info devuelta del db)
    const infoForToken = {
      username: user.email,
      id: user.id,
    };
    const token = generateToken(infoForToken);
    res.status(200).json({
      token,
      email: user.email,
      name: user.nombre,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: 'Error en el servidor aguas abajo',
    });
  }
});
