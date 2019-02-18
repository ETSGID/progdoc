/*si no existen elementos con campo name alguno de los que se pasa en el primer array
y si activado es true 
no se saca el mensaje, sino sí.
*/
//names debe ser un array
let confirmarSalirSinGuardar = function(names, activado) { 
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