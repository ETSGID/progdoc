/**
 *jQuery File Tree Node.js Connector
 *https://www.abeautifulsite.net/jquery-file-tree
 *modificado por javier.conde.diaz@alumnos.upm.es
 *17 Feb 2020
 */

/* global PATH_PDF, CONTEXT */
const fs = require('fs');
const path = require('path');

// eslint-disable-next-line no-underscore-dangle
const _getDirList = (req, res) => {
  let dir = path.resolve(req.body.dir); // lo convierte ruta absoluta
  // evito que me accedan a zona restringida, solo se puede entrar a la carpeta acordada
  if (!dir.includes(PATH_PDF)) {
    dir = path.join(PATH_PDF, 'pdfs/');
  } else {
    dir = req.body.dir;
  }
  let r = '<ul class="jqueryFileTree" style="display: none;">';
  try {
    r = '<ul class="jqueryFileTree" style="display: none;">';
    let rDirectory = '';
    let rFiles = '';
    const files = fs.readdirSync(dir);
    files.forEach(f => {
      let ff = dir + f;

      const stats = fs.statSync(ff);
      if (stats.isDirectory()) {
        const plan = res.locals.planEstudios.find(obj => obj.codigo === f);
        if (plan) {
          plan.nombre = plan.nombre || plan.nombreCompleto;
          // eslint-disable-next-line no-param-reassign
          f = `${plan.nombre}(${f})`;
        }
        rDirectory += `<li class="directory collapsed"><a href="#" rel="${ff}/">${f}</a></li>`;
      } else {
        ff = ff.replace(PATH_PDF, CONTEXT);
        const e = f.split('.')[1];
        rFiles += `<li class="file ext_${e}"><a href="${ff}" rel="${ff}">${f}</a></li>`;
      }
    });
    r += rDirectory;
    r += rFiles;
    r += '</ul>';
  } catch (e) {
    console.error(e);
    r += 'No puede cargar el directorio';
    r += '</ul>';
  }
  res.send(r);
};

module.exports.getDirList = _getDirList;
