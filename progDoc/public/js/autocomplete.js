    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values
    ademas tiene un campo opcion para algunos menus especificos*/
function autocomplete(inp, obj, obj2, opcion) {
    var currentFocus;
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", function (e) {
        let a, b, i = this.value;
        let val = quitAcents(this.value)
        let values = this.value.split(" ")
        values.forEach(function (element, index){
            values[index] = quitAcents(element)
        })
        /*close any already open lists of autocompleted values*/
        closeAllLists();
        if (!val || this.value.length < 3) { return false; }
        currentFocus = -1;
        /*create a DIV element that will contain the items (values):*/
        a = document.createElement("DIV");
        a.setAttribute("id", this.id + "autocomplete-list");
        a.setAttribute("class", "autocomplete-items");
        /*append the DIV element as a child of the autocomplete container:*/
        this.parentNode.appendChild(a);
        /*for each item in the object...*/

        //otros profesores ...
        let otro= document.createElement("DIV");
        otro.innerHTML = "...OTRO";
        /*insert a input field that will hold the current obj item's value:*/
        /*execute a function when someone clicks on the item value (DIV element):*/
        otro.addEventListener("click", function (e) {
            $("#nuevoProfesorForm").modal();
        })
        a.appendChild(otro);

        for (i = 0; i < obj.length; i++) {
            let encontrado = true;
            for (k = 0; k < values.length; k++) {
                if (!obj2[i]['nombre'].toUpperCase().includes(values[k].toUpperCase())){
                    encontrado = false;
                }
            }
            if (encontrado) {
                /*create a DIV element for each matching element:*/
                let objeto = obj2[i]
                let nombre = obj[i]['nombre']
                let nombreCorregido = obj[i]['nombreCorregido']
                b = document.createElement("DIV");
                /*make the matching letters bold:*/
                b.innerHTML = obj[i]['nombre'];
                /*insert a input field that will hold the current obj item's value:*/
                b.innerHTML += "<input type='hidden' value='" + obj[i]['nombre'] + "'>";
                /*execute a function when someone clicks on the item value (DIV element):*/
                b.addEventListener("click", function (e) {
                    /*insert the value for the autocomplete text field:*/
                    inp.value = this.getElementsByTagName("input")[0].value;
                    inp.setAttribute("placeholder", nombre)
                    inp.setAttribute('value', nombre )
                    //En el caso de añadir un nuevo profesor
                    if(opcion && opcion === 'asignacionProfesores' ){
                        let parent = inp.parentNode;
                        let abuelo = parent.parentNode;
                        let grupo = abuelo.getAttribute('id').split("_")[2]
                        if(grupo === ""){
                            grupo = "No hay grupo"
                        }
                        let idList = inp.getAttribute('id');
                        abuelo.removeChild(parent);
                        inp.setAttribute("type", 'hidden')
                        let nuevoValor = "anadir_profesor_"+grupo+"_"+objeto['identificador']+"_"+objeto['correo'];
                        inp.setAttribute("name", "anadir")
                        inp.setAttribute("value", nuevoValor )
                        //creo div para despues quedarme con el elemento que contiene y poder utilizr innerHTML
                        let div = document.createElement('div');
                        div.innerHTML = '<li id="list_' + idList + '">' + nombreCorregido + '<button type="button" onclick="Eliminar2(' + idList +')">Eliminar</button></li>'
                        let nuevo = div.firstChild;
                        abuelo.appendChild(nuevo);
                        abuelo.appendChild(inp);

                    }
                    if (opcion && opcion === 'tribunales'){
                        let parent = inp.parentNode;
                        let abuelo = parent.parentNode;
                        let id = inp.getAttribute('id');
                        //con el [1] me quedo el id del tribunal
                        let tribunalId = id.split("_")[1]
                        //con el [2] me quedo con el puesto en el tribunal
                        let puesto = id.split("_")[2]
                        let nuevoValor = tribunalId+"_"+objeto['identificador']+"_"+puesto+"_"+objeto['correo'];
                        abuelo.removeChild(parent);
                        inp.setAttribute("name", "actualizar")
                        inp.setAttribute("type", "hidden");
                        inp.setAttribute("value", nuevoValor)
                        //creo div para despues quedarme con el elemento que contiene y poder utilizr innerHTML
                        let div = document.createElement('div');
                        div.innerHTML = '<p id="p_tribunal_'+tribunalId+'_'+puesto+'_provisional">'+nombreCorregido+'</p>'
                        let nuevo = div.firstChild;
                        abuelo.appendChild(nuevo);
                        abuelo.appendChild(inp);
                       
                    }
                    
                    /*close the list of autocompleted values,
                    (or any other open lists of autocompleted values:*/
                    closeAllLists();
                });
                a.appendChild(b);
            }
        }
    });
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function (e) {
        var x = document.getElementById(this.id + "autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (e.keyCode == 40) {
            /*If the arrow DOWN key is pressed,
            increase the currentFocus variable:*/
            currentFocus++;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.keyCode == 38) { //up
            /*If the arrow UP key is pressed,
            decrease the currentFocus variable:*/
            currentFocus--;
            /*and and make the current item more visible:*/
            addActive(x);
        } else if (e.keyCode == 13) {
            /*If the ENTER key is pressed, prevent the form from being submitted,*/
            e.preventDefault();
            if (currentFocus > -1) {
                /*and simulate a click on the "active" item:*/
                if (x) x[currentFocus].click();
            }
        }
    });
    function addActive(x) {
        /*a function to classify an item as "active":*/
        if (!x) return false;
        /*start by removing the "active" class on all items:*/
        removeActive(x);
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        /*add class "autocomplete-active":*/
        x[currentFocus].classList.add("autocomplete-active");
    }
    function removeActive(x) {
        /*a function to remove the "active" class from all autocomplete items:*/
        for (var i = 0; i < x.length; i++) {
            x[i].classList.remove("autocomplete-active");
        }
    }
    function closeAllLists(elmnt) {
        /*close all autocomplete lists in the document,
        except the one passed as an argument:*/
        var x = document.getElementsByClassName("autocomplete-items");
        for (var i = 0; i < x.length; i++) {
            if (elmnt != x[i] && elmnt != inp) {
                x[i].parentNode.removeChild(x[i]);
            }
        }
    }
    /*execute a function when someone clicks in the document:*/
   document.addEventListener("click", function (e) {
        closeAllLists(e.target);
    });
}

function quitAcents(reemplaza) {
    let rExps = [
        { re: /[\xC0-\xC6]/g, ch: "A" },
        { re: /[\xE0-\xE6]/g, ch: "a" },
        { re: /[\xC8-\xCB]/g, ch: "E" },
        { re: /[\xE8-\xEB]/g, ch: "e" },
        { re: /[\xCC-\xCF]/g, ch: "I" },
        { re: /[\xEC-\xEF]/g, ch: "i" },
        { re: /[\xD2-\xD6]/g, ch: "O" },
        { re: /[\xF2-\xF6]/g, ch: "o" },
        { re: /[\xD9-\xDC]/g, ch: "U" },
        { re: /[\xF9-\xFC]/g, ch: "u" },
        { re: /[\x56]/g, ch: "B" },
        { re: /[\x76]/g, ch: "b" },
        //insensible a h
        { re: /[\x68]/g, ch: "" },
        { re: /[\x48]/g, ch: "" },
        { re: /[\xD1]/g, ch: "N" },
        { re: /[\xF1]/g, ch: "n" }
    ];

    let search;

    if (Array.isArray(reemplaza)) {
        search = [];
        reemplaza.forEach(function (value) {
            let nombre = value['nombre'];
            let identificador = value['identificador']
            rExps.forEach(function (v) {
                nombre = nombre.replace(v.re, v.ch);
            });
            nombre= nombre.trim();
            let p = {};
            p.nombre = nombre;
            p.identificador = identificador;
            search.push(p);
                
        })
    } else {
        search = reemplaza;
        rExps.forEach(function (v) {
            search = search.replace(v.re, v.ch);
            search = search.trim();
        });
    }
    return search;
    
};

