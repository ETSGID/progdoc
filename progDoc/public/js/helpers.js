/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
// Funciones genericas

function parseQueryString() {
  const str = window.location.search;
  const objURL = {};

  // eslint-disable-next-line func-names
  str.replace(new RegExp('([^?=&]+)(=([^&]*))?', 'g'), function(
    $0,
    $1,
    $2,
    $3
  ) {
    objURL[$1] = $3;
  });
  return objURL;
}

function parseStringQuery(obj) {
  return `?${Object.keys(obj)
    // eslint-disable-next-line func-names
    .reduce(function(a, k) {
      a.push(`${k}=${encodeURIComponent(obj[k])}`);
      return a;
    }, [])
    .join('&')}`;
}

// Cambiar programacion docente
function cambiarPD(selected) {
  const pAcronimo = selected;
  const search = parseQueryString();
  delete search.pdID;
  search.planID = pAcronimo;
  search.foco = true;
  const url = parseStringQuery(search);
  window.location.replace(url);
}

// Cambiar departamento
function cambiarDepart(selected) {
  const depart = selected;
  const search = parseQueryString();
  search.departamentoID = depart;
  const url = parseStringQuery(search);
  window.location.replace(url);
}

// Mostrar o ocultar un div
function MostrarOcultar(id) {
  const div = document.getElementById(id);
  const buttonSpan = document.getElementById(`button_${id}`);
  const clases = div.className.split(' ');
  // eslint-disable-next-line func-names
  const oculto = clases.find(function(obj) {
    return obj === 'hidden';
  });
  // si oculto mostrarlo
  if (oculto) {
    div.className = '';
    for (let i = 0; i < clases.length; i++) {
      if (clases[i] !== 'hidden') {
        div.className += ` ${clases[i]}`;
      }
    }
    buttonSpan.className = 'glyphicon glyphicon-chevron-up';
  }
  // ocultarlo
  else {
    div.className += ' hidden';
    buttonSpan.className = 'glyphicon glyphicon-chevron-down';
  }
}

/* si existen elementos con en el html con campo 'name' coincidente con
lo que se pasa en el primer array
y si activado es true 
se muestra el mensaje, sino no.
*/
// names debe ser un array
function confirmarSalirSinGuardar(names, activado) {
  let areElements = false;
  // eslint-disable-next-line func-names
  names.forEach(function(name) {
    const element = document.getElementsByName(name);
    /** miro si hay algun elemento que case con eso, en caso afirmativo
        es que existe algo nuevo que no se ha guardado
        * */
    if (element.length > 0) {
      areElements = true;
    }
  });
  if (areElements && activado) {
    return 'Es posible que los cambios aplicados no se guarden';
  }
  return null;
}

/* si los elementos pasados en arrays alguno no está vacíos 
y si activado es true 
se muestra el mensaje, sino no.
*/
// elements debe ser un array de arrays
function confirmarSalirSinGuardarArrays(elements, activado) {
  let areElements = false;
  // eslint-disable-next-line func-names
  elements.forEach(function(element) {
    /** miro si hay algun elemento que case con eso, en caso afirmativo
        es que existe algo nuevo que no se ha guardado
        * */
    if (element.length > 0) {
      areElements = true;
    }
  });
  if (areElements && activado) {
    return 'Es posible que los cambios aplicados no se guarden';
  }
  return null;
}

// Actualizar barra menu
function actualizarMenu() {
  const menu = document.getElementsByName('menu');
  // eslint-disable-next-line func-names
  menu.forEach(function(element, index) {
    if (element.value !== '') {
      if (element.value.split('_')[0] === 'drop') {
        const el = document.getElementById(element.value);
        el.className += ' active';
        $(el)
          .find('i')
          .toggleClass('glyphicon-chevron-down')
          .toggleClass('glyphicon-chevron-up');
        const dropdownContent = el.nextElementSibling;
        if (dropdownContent.style.display === 'block') {
          dropdownContent.style.display = 'none';
        } else {
          dropdownContent.style.display = 'block';
        }
      }
      if (element.value.split('_')[0] === 'element') {
        const el = document.getElementById(element.value);
        el.className += ' activeMenu';
      }
    }
  });
}

// Actualizar select generales
function actualizarSelectyBarra() {
  const selectPlan = document.getElementById('selectPlan');
  if (selectPlan) {
    const selectPlanValue = document.getElementById('plan').value;
    document.getElementById('selectPlan').value = selectPlanValue;
  }
  const departamento = document.getElementById('departamento');
  const selectDepartamento = document.getElementById('selectDepartamento');
  if (departamento && selectDepartamento) {
    const selectDepartamentoValue = departamento.value;
    document.getElementById(
      'selectDepartamento'
    ).value = selectDepartamentoValue;
  }
  const submenu = document.getElementById('submenu').value;
  if (submenu) {
    document.getElementById(submenu).style.display = 'block';
    document.getElementById(submenu).className += ' active';
  }
  const subsubmenu = document.getElementById('subsubmenu').value;
  if (subsubmenu && document.getElementById(`subsubmenu_${subsubmenu}`)) {
    document.getElementById(`subsubmenu_${subsubmenu}`).className += ' active';
  }
}
