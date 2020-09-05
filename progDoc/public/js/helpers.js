//Funciones genericas

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

// Cambiar programacion docente
function cambiarPD(selected){
    let pAcronimo = selected;
    let search = parseQueryString();
    delete search.pdID;
    search.planID = pAcronimo;
    search.foco = true;
    let url = parseStringQuery(search);
    window.location.replace(url);
    
}

// Cambiar departamento
function cambiarDepart(selected){
    let depart = selected;
    let search = parseQueryString();
    search.departamentoID = depart;
    let url = parseStringQuery(search);
    window.location.replace(url);
}

// Mostrar o ocultar un div
MostrarOcultar = function(id){
    let div = document.getElementById(id);
    let buttonSpan = document.getElementById('button_'+id)
    let clases = div.className.split(" ");
    let oculto = clases.find(function (obj) { return obj === 'hidden'});
    //si oculto mostrarlo
    if (oculto){
            div.className = "";
            for (let i =0; i<clases.length; i++){
                if (clases[i] !== 'hidden'){
                    div.className += " " +clases[i]
                }    
            }
            buttonSpan.className = "glyphicon glyphicon-chevron-up"
    }
    //ocultarlo
    else{
        div.className += " hidden"
        buttonSpan.className = "glyphicon glyphicon-chevron-down"
    }
}

/*si existen elementos con en el html con campo 'name' coincidente con
lo que se pasa en el primer array
y si activado es true 
se muestra el mensaje, sino no.
*/
//names debe ser un array
confirmarSalirSinGuardar = function(names, activado) { 
    let areElements = false;
    names.forEach(function (name) {
       let element = document.getElementsByName(name);
       /**miro si hay algun elemento que case con eso, en caso afirmativo
        es que existe algo nuevo que no se ha guardado
        **/
        if (element.length > 0){
           areElements = true;
       }
    })
    if (areElements && activado){
        return "Es posible que los cambios aplicados no se guarden"
    }else{
        return null;
    }
};

/*si los elementos pasados en arrays alguno no está vacíos 
y si activado es true 
se muestra el mensaje, sino no.
*/
//elements debe ser un array de arrays
confirmarSalirSinGuardarArrays = function(elements, activado) { 
    let areElements = false;
    elements.forEach(function (element) {
        /**miro si hay algun elemento que case con eso, en caso afirmativo
        es que existe algo nuevo que no se ha guardado
        **/
       if (element.length > 0){
           areElements = true;
       }
    })
    if (areElements && activado){
        return "Es posible que los cambios aplicados no se guarden"
    }else{
        return null;
    }
};

// Actualizar barra menu
function actualizarMenu(){
    let menu = document.getElementsByName("menu");
    menu.forEach(function(element,index){
      if (element.value === ""){
        return
      }else{
        if (element.value.split("_")[0] === "drop"){
          let el = document.getElementById(element.value)
          el.className += " active";
          $(el).find('i').toggleClass('glyphicon-chevron-down').toggleClass('glyphicon-chevron-up');
          let dropdownContent = el.nextElementSibling;
          if (dropdownContent.style.display === "block") {
            dropdownContent.style.display = "none";
          } else {
            dropdownContent.style.display = "block";
          }
        }if (element.value.split("_")[0] === "element"){
          let el = document.getElementById(element.value)
          el.className += " activeMenu";
        }
    
      }
      });
    }
    
// Actualizar select generales    
function actualizarSelectyBarra() {
    let selectPlan = document.getElementById('selectPlan')
    if (selectPlan){
        let selectPlanValue = document.getElementById('plan').value
        document.getElementById('selectPlan').value = selectPlanValue;
    }
    let departamento = document.getElementById('departamento');
    let selectDepartamento = document.getElementById('selectDepartamento');
    if(departamento && selectDepartamento){
        let selectDepartamentoValue = departamento.value;
        document.getElementById('selectDepartamento').value = selectDepartamentoValue;
    }
    let submenu = document.getElementById('submenu').value;
    if (submenu){
        document.getElementById(submenu).style.display = "block";
        document.getElementById(submenu).className += " active";
    }
    let subsubmenu = document.getElementById('subsubmenu').value;
    if (subsubmenu){
        document.getElementById('subsubmenu_'+subsubmenu).className += " active";
    }
    
}