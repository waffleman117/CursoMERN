const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator');

//importar el modelo de la estructura del usuario
const User = require('../../models/User');

// @route   POST api/users
// @desc    Registrar usuario
// @access  Public (no se necesita token autorizada)

//Definimos el manejo de POST hacia /api/users
router.post(
  '/',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 }),
  ],
  async (req, res) => {
    console.log(req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    //Destructuramos request.body para no repetirlo tanto
    const { name, email, password } = req.body;
    try {
      //Verificar si el usuario existe
      let user = await User.findOne({ email: email });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists :O' }] });
      }
      //GET users gravatar, s: size 200, r: rating 'pg' evitar avatars explicitos,
      //d: default 'mm' es un placeholder, o '404' para mostrar un error
      const avatar = normalize(
        gravatar.url(email, {
          s: '200',
          r: 'pg',
          d: 'mm',
        }),
        { forceHttps: true }
      );
      //Obtenemos los datos del usuario antes de guardarlos en la base de datos
      user = new User({
        name,
        email,
        avatar,
        password,
      });

      //Encriptar constraseña
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      //una vez encriptada la contraseña, guardamos el usuario en el servidor
      await user.save();
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
