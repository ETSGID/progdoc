const moment = require ('moment')
exports.primerasMayusc = function (texto) {
    const re = /(^|[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?:([a-záéíóúüñ])|([A-ZÁÉÍÓÚÜÑ]))|([A-ZÁÉÍÓÚÜÑ]+)/gu;
    return texto.replace(re,
        (m, caracterPrevio, minuscInicial, mayuscInicial, mayuscIntermedias) => {
            const locale = ['es', 'gl', 'ca', 'pt', 'en'];
            if (mayuscIntermedias)
                return mayuscIntermedias.toLocaleLowerCase(locale);
            return caracterPrevio
                + (minuscInicial ? minuscInicial.toLocaleUpperCase(locale) : mayuscInicial);
        }
    );
}
/* ordena los planes por acrónimo o si no tiene por nombre descendete
un plan es un objeto {codigo:"09AQ",nombre:"MUIT", nombreCompleto:"Master en ..."}
nombre puede ser null
*/
exports.sortPlanes = function(a,b){
    let aNombre = a.nombre === null ? a.codigo : a.nombre;
    let bNombre = b.nombre === null ? b.codigo : b.nombre;
    if (aNombre < bNombre)
        return 1;
    if (aNombre > bNombre)
        return -1;
    return 0;
}

/* ordena los departamentos por codigo ascendente
un plan es un objeto {codigo:"D520",nombre:"Departaento...."}
*/
exports.sortDepartamentos = function (a, b) {
    if (a.codigo < b.codigo)
        return -1;
    if (a.codigo > b.codigo)
        return 1;
    return 0;
}

/*ordena los roles por departamentos*/
exports.sortRolesporDepartamento = function (a,b){
    if (a.DepartamentoCodigo < b.DepartamentoCodigo)
        return -1;
    if (a.DepartamentoCodigo > b.DepartamentoCodigo)
        return 1;
    return 0;
}

/* ordena los profesores por nombreCorregido ascendente
un profesor tendrá entre sus atributos {nombreCorregido: "apellido apellido, nombre" ...}
*/
exports.sortProfesorCorregido = function (a, b) {
    if (a.nombreCorregido < b.nombreCorregido)
        return -1;
    if (a.nombreCorregido > b.nombreCorregido)
        return 1;
    return 0;
}




/* ordena las asignaturas por curos y después acronimo o nombre si no la tienen ascendente
un profesor tendrá entre sus atributos {nombreCorregido: "apellido apellido, nombre" ...}
*/
exports.sortAsignaturasCursoNombre = function (a, b) {
    let aNombre = a.acronimo === null ? a.nombre : a.acronimo;
    let bNombre = b.acronimo === null ? b.nombre : b.acronimo;
    if (a.curso > b.curso)
        return 1;
    if (a.curso < b.curso)
        return -1;
    if (aNombre > bNombre)
        return 1;
    if (aNombre < bNombre)
        return -1;
    return 0
}
/* ordena las asignaturas por codigo
*/
exports.sortAsignaturasCodigo = function (a, b) {
    if (a.codigo > b.codigo)
        return 1;
    if (a.codigo < b.codigo)
        return -1;
    return 0
}


exports.isEmpty = function (obj) {
    let hasOwnProperty = Object.prototype.hasOwnProperty;
    // null and undefined are "empty"
    if (obj == null) return true;

    // Assume if it has a length property with a non-zero value
    // that that property is correct.
    if (obj.length > 0) return false;
    if (obj.length === 0) return true;

    // If it isn't an object at this point
    // it is empty, but it can't be anything *but* empty
    // Is it empty?  Depends on your application.
    if (typeof obj !== "object") return true;

    // Otherwise, does it have any properties of its own?
    // Note that this doesn't handle
    // toString and valueOf enumeration bugs in IE < 9
    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
}

//convierte de formato 4,5 a 4.5 el separador de decimales en números
exports.convertCommaToPointDecimal = function(n) {
    n = n.replace(/\./g, '').replace(',', '.');
    return n;
}

//convierte de YYYY-MM-DD a DD/MM/YYYY
formatFecha = function (fecha){
    try{
        return (fecha.split("-")[2] + "/" + fecha.split("-")[1] + "/" + fecha.split("-")[0])
    }catch(error){
        return null
    }
        
}

exports.formatFecha


//le pasas una fecha y te devuelve el dia más proximo de dentro de un año que caiga
//el mismo dia de la semana
exports.addYear = function (fechaActual) {
    fechaActual = formatFecha(fechaActual)
    try{
        let actual = moment(fechaActual, 'DD/MM/YYYY');
        let siguiente = actual.clone().add(1, 'year');
        let a = actual.day() - siguiente.day()
        temp = [a, a - 7, 7 - a]
        let index = 0;
        let value = temp[0];
        for (var i = 1; i < temp.length; i++) {
            if (Math.abs(temp[i]) < Math.abs(value)) {
                value = temp[i];
                index = i;
            }
        }
        siguiente = siguiente.add(temp[index], 'day')
        return siguiente
    }catch(error){
        return null;
    }
       
}

