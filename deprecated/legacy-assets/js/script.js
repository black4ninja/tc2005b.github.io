function hola() {
    alert("hola");
}

document.getElementById("semana").onclick = hola;


function cambia_texto() {
    let element = document.getElementById("semana");

    element.innerHTML = "Bienvenidos al semestre agosto-diciembre 2020";

    element.style.fontSize = "Large";
}

function recupera_texto() {
    let element = document.getElementById("semana");

    element.innerHTML = "Calendario de actividades";

    element.style.fontSize = "Normal";
}

let semana = document.getElementById("semana");

semana.onmouseover = cambia_texto;

semana.onmouseout = recupera_texto;