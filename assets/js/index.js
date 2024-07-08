document.addEventListener('DOMContentLoaded', cargarTiposCambio);
const dropdownMonedas = document.querySelector('#currencyDropdown');
const botonConvertir = document.querySelector('.convert-btn');
const inputCLP = document.querySelector('#clpInput');
const resultadoConversion = document.querySelector('#conversionResult');
let graficoMoneda = null;

// Requerimiento 1: Obtener datos desde la API de mindicador.cl y manejar errores
async function cargarTiposCambio() {
    let datos;
    try {
        const respuesta = await fetch('https://mindicador.cl/api');
        datos = await respuesta.json();
    } catch (error) {
        const respuestaOffline = await fetch('mindicador.json');
        datos = await respuestaOffline.json();
        Swal.fire({
            title: "<strong>Error en API</strong>",
            icon: "info",
            html: `<b>Usando datos offline...</b>`
        });
    }
    poblarDropdownMonedas(datos);
}

// Requerimiento 3: Poblar el select con los tipos de moneda disponibles
function poblarDropdownMonedas(datos) {
    const datosFiltrados = Object.keys(datos)
        .filter(key => key !== 'version' && key !== 'autor' && key !== 'fecha')
        .map(key => ({
            codigo: datos[key].codigo,
            valor: datos[key].valor
        }));
    
    const codigosEspeciales = ["uf", "ivp", "ipc", "utm", "imacec", "tpm"];
    let opcionesHTML = '<option selected>Seleccione moneda</option>';
    datosFiltrados.forEach(indicador => {
        let codigoTransformado;
        if (codigosEspeciales.includes(indicador.codigo.toLowerCase())) {
            codigoTransformado = indicador.codigo.toUpperCase();
        } else {
            codigoTransformado = indicador.codigo.charAt(0).toUpperCase() + indicador.codigo.slice(1);
        }
        opcionesHTML += `<option value="${indicador.codigo}">${codigoTransformado}</option>`;
    });
    dropdownMonedas.innerHTML = opcionesHTML;
}

// Requerimiento 5: Obtener datos para graficar
async function obtenerDatosGrafico(codigoMoneda) {
    const respuesta = await fetch(`https://mindicador.cl/api/${codigoMoneda.toLowerCase()}`);
    const datos = await respuesta.json();
    return datos.serie.slice(0, 10).reverse();
}

// Requerimiento 5: Renderizar gráfico con los datos obtenidos
async function renderizarGrafico(codigoMoneda) {
    const datosGrafico = await obtenerDatosGrafico(codigoMoneda);
    const etiquetas = datosGrafico.map(item => item.fecha.substring(0, 10));
    const valores = datosGrafico.map(item => item.valor);

    const configuracion = {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [{
                label: codigoMoneda.charAt(0).toUpperCase() + codigoMoneda.slice(1),
                backgroundColor: 'red',
                data: valores
            }]
        }
    };

    const elementoGrafico = document.getElementById("conversionChart");
    if (graficoMoneda) {
        graficoMoneda.destroy();
    }
    elementoGrafico.style.backgroundColor = 'white';
    graficoMoneda = new Chart(elementoGrafico, configuracion);
}

// Requerimiento 2 y 4: Calcular y mostrar el resultado de la conversión en el DOM, manejar errores
async function convertirMoneda() {
    const monedaSeleccionada = dropdownMonedas.value;
    const montoCLP = parseFloat(inputCLP.value);
    if (isNaN(montoCLP) || montoCLP <= 0) {
        resultadoConversion.innerHTML = '<h2>Ingrese un monto válido</h2>';
        inputCLP.classList.add('error');
        return;
    } else {
        inputCLP.classList.remove('error');
    }

    try {
        const respuesta = await fetch(`https://mindicador.cl/api/${monedaSeleccionada.toLowerCase()}`);
        const datos = await respuesta.json();
        const tasaCambio = datos.serie[0].valor;
        const montoConvertido = (montoCLP / tasaCambio).toFixed(2);
        resultadoConversion.innerHTML = `<h2>Resultado: $${montoConvertido}</h2>`;
        renderizarGrafico(monedaSeleccionada);
    } catch (error) {
        console.error('Por favor, ingrese una moneda:', error);
        resultadoConversion.innerHTML = '<h2>Por favor, ingrese una moneda</h2>';
    }
}

botonConvertir.addEventListener('click', convertirMoneda);
