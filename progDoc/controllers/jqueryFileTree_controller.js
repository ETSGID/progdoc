/**
*	jQuery File Tree Node.js Connector
*	https://www.abeautifulsite.net/jquery-file-tree
*	modificado pro javier.conde.diaz@alumnos.upm.es
*	21 May 2014
*/
let fs = require('fs');
const normalize = require('normalize-path');
let path = require('path');
let pathPDF = require('../app').pathPDF;

let _getDirList = function(req, res) {
	let dir = path.resolve(req.body.dir); //lo convierte ruta absoluta
	//evito que me accedan a zona restringida, solo se puede entrar a la carpeta acordada
	if(!dir.includes(normalize(pathPDF))){
		dir = path.join(normalize(pathPDF), 'pdfs/')
	}else{
		dir = req.body.dir;
	}
	let r = '<ul class="jqueryFileTree" style="display: none;">';
   	try {
       	r = '<ul class="jqueryFileTree" style="display: none;">';
		let files = fs.readdirSync(dir);
		files.forEach(function(f){
			let ff = dir + f;

			let stats = fs.statSync(ff)
            if (stats.isDirectory()) { 
				let plan = res.locals.planEstudios.find(obj => {return obj.codigo === f})
				if (plan){
					plan.nombre = plan.nombre || plan.nombreCompleto;
					f = `${plan.nombre}(${f})`;
				}
                r += '<li class="directory collapsed"><a href="#" rel="' + ff  + '/">' + f + '</a></li>';
            } else {
				ff = ff.replace(normalize(pathPDF), normalize(res.locals.contextPath));
				let e = f.split('.')[1];
             	r += '<li class="file ext_' + e + '"><a href="' + ff +'" rel="'+ ff + '">' + f + '</a></li>';
            }
		});
		r += '</ul>';
	} catch(e) {
		console.log(e)
		r += 'No puede cargar el directorio';
		r += '</ul>';
	}
	res.send(r)
}

module.exports.getDirList = _getDirList;