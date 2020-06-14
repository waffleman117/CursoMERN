const express = require('express');
const request = require('request');
const config = require('config');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const Profile = require('../../models/Profile');
const User = require('../../models/User');

// @route   GET api/profile/me  <-- solo 1, si fuera api/profile serian TODOS los perfiles a obtener
// @desc    obtener el perfil del usuario actual
// @access  Private (Si se necesita token autorizada)
router.get('/me', auth, async (req, res) => {
  //<-- lleva /me porque ese es el endpoint que buscamos
  try {
    //get user by id = req.user.id
    const profile = await Profile.findOne({
      user: req.user.id,
    }).populate('user', ['name', 'avatar']);

    if (!profile) {
      //si no existe perfil para el usuario actual
      return res
        .status(400) //bad request
        .json({ msg: 'No existe un perfil para este usuario' });
    }

    //Si si existe el perfil, entonces responder con el perfil del usuario
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor'); // 500 = server error
  }
});
// @route   POST api/profile
// @desc    agregar el perfil del usuario actual a los perfiles registrados
// @access  Private (Se necesita token autorizada)
//como usaremos doble middleware (auth y check) los ponemos entre corchetes [auth, [check bla bla ]], () =>
router.post(
  '/',
  [
    auth,
    [
      check('status', 'Status es requerido').not().isEmpty(),
      check('skills', 'Skills es requerido').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    //destructurar los campos del body
    const {
      company,
      website,
      location,
      bio,
      status,
      githubusername,
      skills,
      youtube,
      facebook,
      twitter,
      instagram,
      linkedin,
    } = req.body;

    //Contruir objeto de perfil
    const profileFields = {};
    profileFields.user = req.user.id;
    if (company) profileFields.company = company;
    if (website) profileFields.website = website;
    if (location) profileFields.location = location;
    if (bio) profileFields.bio = bio;
    if (status) profileFields.status = status;
    if (githubusername) profileFields.githubusername = githubusername;
    if (skills) {
      //las skills (string) separadas por ',' sin importar los espacios las convertimos en un arreglo
      profileFields.skills = skills.split(',').map((skill) => skill.trim());
    }

    //Construir objeto de las redes sociales del perfil, creamos el campo 'social' como objeto vacio y agregamos lo necesario
    profileFields.social = {};
    if (twitter) profileFields.social.twitter = twitter;
    if (facebook) profileFields.social.facebook = facebook;
    if (linkedin) profileFields.social.linkedin = linkedin;
    if (instagram) profileFields.social.instagram = instagram;

    try {
      let profile = await Profile.findOne({ user: req.user.id }); //req.user.id viene del token
      if (profile) {
        //si existe el perfil lo actualizamos (UPDATE)
        profile = await Profile.findOneAndUpdate(
          { user: req.user.id },
          { $set: profileFields },
          { new: true }
        );
        return res.json(profile);
      }
      //si no, entonces lo creamos
      profile = new Profile(profileFields);
      //lo guardamos
      await profile.save();
      //lo mandamos como respuesta al servidor
      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: 'Error del servidor unu' });
    }
  }
);

// @route   GET api/profile
// @desc    obtener todos los perfiles
// @access  Public (No necesita token autorizada)
router.get('/', async (req, res) => {
  try {
    const profiles = await Profile.find().populate('user', ['name', 'avatar']); //from user collection bring name and avatar
    res.json(profiles);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor :c');
  }
});

// @route   GET api/profile/user/:user_id <- ":" significa placeholder
// @desc    obtener perfil en base a id
// @access  Public (No necesita token autorizada)
router.get('/user/:user_id', async (req, res) => {
  try {
    const profile = await Profile.findOne({
      user: req.params.user_id,
    }).populate('user', ['name', 'avatar']); //from user collection bring name and avatar

    if (!profile)
      return res
        .status(400)
        .json({ msg: 'No existe un perfil para este usuario :(' });

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      //si el error se debe a que el :user_id no es un id con formato valido
      return res.status(400).json({ msg: 'Perfil no encontrado' });
    }
    res.status(500).send('Error del servidor :c');
  }
});

// @route   DELETE api/profile
// @desc    borrar perfil, usuario y posts
// @access  Privado (Necesita token autorizada)
router.delete('/', auth, async (req, res) => {
  try {
    //@todo - remove users posts (remover posts del usuario en el futuro)
    //Remove profile
    await Profile.findOneAndRemove({ user: req.user.id });
    //Remove user
    await User.findOneAndRemove({ _id: req.user.id });
    res.json({ msg: 'Usuario removido exitosamente u.u' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor :c');
  }
});

// @route   PUT api/profile/experience
// @desc    Agregar experience al perfil
// @access  Private (Necesita token autorizada)
router.put(
  '/experience',
  [
    auth,
    [
      check('title', 'Se requiere un titulo').not().isEmpty(),
      check('company', 'Se requiere una compania').not().isEmpty(),
      check('from', 'Se requiere una fecha de inicio').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(500).json({ errors: errors.array() });
    }
    const {
      title,
      company,
      location,
      from,
      to,
      current,
      description,
    } = req.body;

    const newExp = {
      title,
      company,
      location,
      from,
      to,
      current,
      description,
    };

    try {
      //get profile by user id
      const profile = await Profile.findOne({ user: req.user.id });
      profile.experience.unshift(newExp);

      profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Error del servidor :c');
    }
  }
);

// @route   DELETE api/profile/experience/:exp_id
// @desc    Eliminar experiencia del perfil actual
// @access  Private (Necesita token autorizada)
router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    //get profile by user id
    const profile = await Profile.findOne({ user: req.user.id });
    //Get remove index (obtener el indice del elemento a borrar)
    const removeIndex = profile.experience
      .map((item) => item.id)
      .indexOf(req.params.exp_id);
    //removemos el elemento usando splice y regresamos el arreglo actualizado
    profile.experience.splice(removeIndex, 1);
    //guardamos los cambios en la db
    await profile.save();
    //mandamos el perfil como respuesta
    res.json(profile);
  } catch (error) {
    console.error(err.message);
    res.status(500).send('Error del servidor :c');
  }
});

// @route   PUT api/profile/education
// @desc    Agregar education al perfil
// @access  Private (Necesita token autorizada)
router.put(
  '/education',
  [
    auth,
    [
      check('school', 'Se requiere una escuela').not().isEmpty(),
      check('degree', 'Se requiere un posgrado').not().isEmpty(),
      check('fieldofstudy', 'Se requiere un campo de estudio').not().isEmpty(),
      check('from', 'Se requiere una fecha de inicio').not().isEmpty(),
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(500).json({ errors: errors.array() });
    }
    const {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    } = req.body;

    const newEdu = {
      school,
      degree,
      fieldofstudy,
      from,
      to,
      current,
      description,
    };

    try {
      //get profile by user id
      const profile = await Profile.findOne({ user: req.user.id });
      profile.education.unshift(newEdu);

      profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Error del servidor :c');
    }
  }
);

// @route   DELETE api/profile/education/:edu_id
// @desc    Eliminar experiencia del perfil actual
// @access  Private (Necesita token autorizada)
router.delete('/education/:edu_id', auth, async (req, res) => {
  try {
    //get profile by user id
    const profile = await Profile.findOne({ user: req.user.id });
    //Get remove index (obtener el indice del elemento a borrar)
    const removeIndex = profile.education
      .map((item) => item.id)
      .indexOf(req.params.edu_id);
    //removemos el elemento usando splice y regresamos el arreglo actualizado
    profile.education.splice(removeIndex, 1);
    //guardamos los cambios en la db
    await profile.save();
    //mandamos el perfil como respuesta
    res.json(profile);
  } catch (error) {
    console.error(err.message);
    res.status(500).send('Error del servidor :c');
  }
});

// @route   GET api/profile/github/:username
// @desc    get user repos from github
// @access  Public (No necesita token porque cualquiera puede ver un perfil)
router.get('/github/:username', async (req, res) => {
  try {
    const options = {
      uri: encodeURI(
        `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc`
      ),
      method: 'GET',
      headers: {
        'user-agent': 'node.js',
        Authorization: `token ${config.get('githubToken')}`,
      },
    };

    request(options, (error, response, body) => {
      if (error) console.error(error);

      if (response.status !== 200) {
        res.status(404).json({ msg: 'No se encontro el perfil de github' });
      }
      //body es un simple string asi que usamos JSON.parse para que se envie como un objeto con el string dentro
      res.json(JSON.parse(body));
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error del servidor :c');
  }
});

module.exports = router;
