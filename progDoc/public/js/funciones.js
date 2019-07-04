/*si no existen elementos con campo name alguno de los que se pasa en el primer array
y si activado es true 
no se saca el mensaje, sino sí.
*/
//names debe ser un array
confirmarSalirSinGuardar = function(names, activado) { 
    let contador = 0;
    names.forEach(function (name) {
       let elements = document.getElementsByName(name);
       /**miro si hay algun elemento que case con eso, en caso afirmativo
        es que existe algo nuevo que no se ha guardado
        **/
       contador += elements.length;
    })
    if (contador > 0 && activado){
        return "Es posible que los cambios aplicados no se guarden"
    }else{
        return null;
    }
};

parseQueryString = function () {

    let str = window.location.search;
    let objURL = {};

    str.replace(
        new RegExp("([^?=&]+)(=([^&]*))?", "g"),
        function ($0, $1, $2, $3) {
            objURL[$1] = $3;
        }
    );
    return objURL;
};


parseStringQuery = function (obj) {
    return '?' + Object.keys(obj).reduce(function (a, k) { a.push(k + '=' + encodeURIComponent(obj[k])); return a }, []).join('&')
}


//le añade un 0 a la hora y a los minutos si solo tienen un digito
function formatHora(input) {
    if (input.value.length === 1) {
        input.value = "0" + input.value;
    }
}
