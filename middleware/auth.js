const jwt = require('jsonwebtoken');
const config = require('config');

// request, response, next
module.exports = function (req, res, next) {
  //Get token from header
  const token = req.header('x-auth-token');

  //Checar si no hay token
  if (!token) {
    return res
      .status(401)
      .json({ msg: 'No tienes token carnal, no puedo dejarte pasar' }); //401 = 'Acceso No autorizado'
  }
  //Verificar token
  try {
    const decoded = jwt.verify(token, config.get('jwtSecret'));
    //decoded contiene datos del user en su payload
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token invalida u.u' });
  }
};
