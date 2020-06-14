const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../../middleware/auth');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');

const User = require('../../models/User');

// @route   GET api/auth
// @desc    Test route
// @access  Public (no se necesita token autorizada)
router.get('/', auth, async (req, res) => {
  try {
    //si no quiero returnar la password puedo usar.select('-password')
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del Servidor unu');
  }
});

// @route   GET api/auth
// @desc    Autenticar usuario y obtener token
// @access  Public (no se requiere una token previa)

//Definimos el manejo de POST hacia /api/users
router.post(
  '/',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Se requiere una password').exists(),
  ],
  async (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    //Destructuramos request.body para no repetirlo tanto
    const { email, password } = req.body;

    try {
      //Verificar si el usuario existe
      let user = await User.findOne({ email });

      if (!user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Credenciales invalidas (usuario)' }] });
      }

      //Verificar si la contrasena ingresada coincide con una registrada para el mismo usuario que existe
      //password es la contrasena ingresada actualmente (texto) y user.password es la registrada en la base de datos (encriptada)
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'Credenciales invalidas (contrasena)' }] });
      }

      //Returnar jsonwebtoken (login token)
      //res.send('Usuario registrado!'); regresa solamente un string para confirmar que se registro
      const payload = {
        user: {
          id: user.id,
        },
      };
      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: 36000 }, //expiracion es opcional, 3600 = 1hr
        (err, token) => {
          //recibiremos o un error o un token
          if (err) throw err;
          res.json({ token }); //si recibimos el token lo mandaremos de regreso al cliente
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Error del servidor');
    }
  }
);

module.exports = router;
