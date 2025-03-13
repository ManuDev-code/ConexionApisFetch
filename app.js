// URLs de la API
const URL_BASE = 'https://pokeapi.co/api/v2';
const URL_POKEMON = `${URL_BASE}/pokemon`;
const URL_ESPECIES = `${URL_BASE}/pokemon-species`;

// Variables de estado
let paginaActual = 1;
let pokemonesPorPagina = 10;
let todosPokemons = [];
let pokemonsFiltrados = [];
let filtroTipoActivo = null;
let tiposPokemons = [];

// Mapeo de tipos en inglés a español
const tiposTraduccion = {
    'normal': 'normal',
    'fire': 'fuego',
    'water': 'agua',
    'electric': 'electrico',
    'grass': 'planta',
    'ice': 'hielo',
    'fighting': 'lucha',
    'poison': 'veneno',
    'ground': 'tierra',
    'flying': 'volador',
    'psychic': 'psiquico',
    'bug': 'bicho',
    'rock': 'roca',
    'ghost': 'fantasma',
    'dragon': 'dragon',
    'dark': 'siniestro',
    'steel': 'acero',
    'fairy': 'hada'
};

// Elementos del DOM
const inputBusqueda = document.getElementById('input-busqueda');
const btnBuscar = document.getElementById('btn-buscar');
const filtrosTipo = document.getElementById('filtros-tipo');
const gridPokemon = document.getElementById('grid-pokemon');
const detallePokemon = document.getElementById('detalle-pokemon');
const btnAnterior = document.getElementById('btn-anterior');
const btnSiguiente = document.getElementById('btn-siguiente');
const infoPagina = document.getElementById('info-pagina');

// Inicializar la aplicación
async function iniciarApp() {
    try {
        // Obtener todos los tipos de Pokémon
        const respuestaTipos = await fetch(`${URL_BASE}/type`);
        const datosTipos = await respuestaTipos.json();
        tiposPokemons = datosTipos.results.map(tipo => tipo.name);
        
        // Crear botones de filtro por tipo
        crearFiltrosTipo();
        
        // Obtener lista inicial de Pokémon
        await obtenerPokemons();
        
        // Mostrar primera página de Pokémon
        mostrarPokemons();
    } catch (error) {
        console.error('Error al inicializar la aplicación:', error);
        gridPokemon.innerHTML = '<p class="error">Error al cargar los datos de Pokémon. Por favor, intenta de nuevo más tarde.</p>';
    }
}

// Crear botones de filtro por tipo
function crearFiltrosTipo() {
    tiposPokemons.forEach(tipo => {
        if (tipo !== 'unknown' && tipo !== 'shadow') {
            const tipoEspanol = tiposTraduccion[tipo] || tipo;
            const boton = document.createElement('button');
            boton.textContent = tipoEspanol;
            boton.classList.add('btn-tipo', tipoEspanol);
            boton.addEventListener('click', () => filtrarPorTipo(tipo, tipoEspanol));
            filtrosTipo.appendChild(boton);
        }
    });
}

// Filtrar Pokémon por tipo
async function filtrarPorTipo(tipo, tipoEspanol) {
    try {
        // Alternar estado activo
        if (filtroTipoActivo === tipo) {
            // Si se hace clic en el filtro activo, quitar el filtro
            filtroTipoActivo = null;
            document.querySelectorAll('.btn-tipo').forEach(btn => btn.classList.remove('activo'));
            pokemonsFiltrados = [...todosPokemons];
        } else {
            // Establecer nuevo filtro activo
            filtroTipoActivo = tipo;
            document.querySelectorAll('.btn-tipo').forEach(btn => {
                btn.classList.remove('activo');
                if (btn.textContent === tipoEspanol) {
                    btn.classList.add('activo');
                }
            });
            
            // Obtener Pokémon de este tipo
            const respuesta = await fetch(`${URL_BASE}/type/${tipo}`);
            const datos = await respuesta.json();
            
            // Extraer nombres de Pokémon y filtrar todosPokemons
            const pokemonsTipo = datos.pokemon.map(p => p.pokemon.name);
            pokemonsFiltrados = todosPokemons.filter(p => pokemonsTipo.includes(p.name));
        }
        
        // Volver a la primera página y mostrar
        paginaActual = 1;
        actualizarControlesPaginacion();
        mostrarPokemons();
    } catch (error) {
        console.error('Error al filtrar por tipo:', error);
    }
}

// Obtener datos básicos de todos los Pokémon
async function obtenerPokemons() {
    try {
        // Obtener los primeros 151 Pokémon (primera generación)
        const respuesta = await fetch(`${URL_POKEMON}?limit=151`);
        const datos = await respuesta.json();
        
        todosPokemons = datos.results;
        pokemonsFiltrados = [...todosPokemons];
        
        actualizarControlesPaginacion();
    } catch (error) {
        console.error('Error al obtener la lista de Pokémon:', error);
        throw error;
    }
}

// Mostrar Pokémon para la página actual
async function mostrarPokemons() {
    gridPokemon.innerHTML = '<div class="cargando">Cargando Pokémon...</div>';
    
    try {
        const indiceInicio = (paginaActual - 1) * pokemonesPorPagina;
        const indiceFin = indiceInicio + pokemonesPorPagina;
        const pokemonsPaginaActual = pokemonsFiltrados.slice(indiceInicio, indiceFin);
        
        // Limpiar el grid
        gridPokemon.innerHTML = '';
        
        // Si no hay Pokémon que coincidan con el filtro
        if (pokemonsPaginaActual.length === 0) {
            gridPokemon.innerHTML = '<p class="sin-resultados">No se encontraron Pokémon que coincidan con tu criterio.</p>';
            return;
        }
        
        // Obtener y mostrar cada Pokémon
        const promesasPokemons = pokemonsPaginaActual.map(pokemon => obtenerDetallesPokemon(pokemon.url));
        const detallesPokemons = await Promise.all(promesasPokemons);
        
        detallesPokemons.forEach(pokemon => {
            const tarjeta = crearTarjetaPokemon(pokemon);
            gridPokemon.appendChild(tarjeta);
        });
    } catch (error) {
        console.error('Error al mostrar Pokémon:', error);
        gridPokemon.innerHTML = '<p class="error">Error al cargar los datos de Pokémon. Por favor, intenta de nuevo más tarde.</p>';
    }
}

// Obtener información detallada de un solo Pokémon
async function obtenerDetallesPokemon(url) {
    try {
        const respuesta = await fetch(url);
        const datosPokemon = await respuesta.json();
        
        // Obtener datos de especie para la descripción
        const respuestaEspecie = await fetch(datosPokemon.species.url);
        const datosEspecie = await respuestaEspecie.json();
        
        // Buscar texto de descripción en español
        let descripcion = 'No hay descripción disponible.';
        const entradaEspanol = datosEspecie.flavor_text_entries.find(
            entrada => entrada.language.name === 'es'
        );
        
        if (entradaEspanol) {
            descripcion = entradaEspanol.flavor_text.replace(/\f/g, ' ');
        } else {
            // Si no hay descripción en español, usar la inglesa
            const entradaIngles = datosEspecie.flavor_text_entries.find(
                entrada => entrada.language.name === 'en'
            );
            if (entradaIngles) {
                descripcion = entradaIngles.flavor_text.replace(/\f/g, ' ');
            }
        }
        
        // Combinar los datos
        return {
            id: datosPokemon.id,
            nombre: datosPokemon.name,
            imagen: datosPokemon.sprites.other['official-artwork'].front_default || datosPokemon.sprites.front_default,
            tipos: datosPokemon.types.map(tipo => ({
                nombre: tipo.type.name,
                nombreEspanol: tiposTraduccion[tipo.type.name] || tipo.type.name
            })),
            habilidades: datosPokemon.abilities.map(habilidad => ({
                nombre: habilidad.ability.name,
                es_oculta: habilidad.is_hidden
            })),
            estadisticas: datosPokemon.stats.map(stat => {
                let nombreEspanol;
                switch (stat.stat.name) {
                    case 'hp': nombreEspanol = 'PS'; break;
                    case 'attack': nombreEspanol = 'Ataque'; break;
                    case 'defense': nombreEspanol = 'Defensa'; break;
                    case 'special-attack': nombreEspanol = 'Ataque Especial'; break;
                    case 'special-defense': nombreEspanol = 'Defensa Especial'; break;
                    case 'speed': nombreEspanol = 'Velocidad'; break;
                    default: nombreEspanol = stat.stat.name;
                }
                return {
                    nombre: nombreEspanol,
                    valor: stat.base_stat
                };
            }),
            altura: datosPokemon.height / 10, // Convertir a metros
            peso: datosPokemon.weight / 10, // Convertir a kg
            descripcion: descripcion
        };
    } catch (error) {
        console.error(`Error al obtener detalles del Pokémon en ${url}:`, error);
        throw error;
    }
}

// Crear un elemento de tarjeta de Pokémon
function crearTarjetaPokemon(pokemon) {
    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-pokemon');
    tarjeta.addEventListener('click', () => mostrarDetallePokemon(pokemon));
    
    const tiposHTML = pokemon.tipos.map(tipo => 
        `<span class="tipo ${tipo.nombreEspanol}">${tipo.nombreEspanol}</span>`
    ).join(' ');
    
    tarjeta.innerHTML = `
        <img src="${pokemon.imagen}" alt="${pokemon.nombre}">
        <div class="info-tarjeta">
            <h2>${pokemon.nombre}</h2>
            <div class="tipos">${tiposHTML}</div>
            <p>${pokemon.descripcion.substring(0, 100)}...</p>
        </div>
    `;
    
    return tarjeta;
}

// Mostrar vista detallada de un solo Pokémon
function mostrarDetallePokemon(pokemon) {
    // Ocultar el grid y mostrar la vista detallada
    gridPokemon.classList.add('oculto');
    detallePokemon.classList.remove('oculto');
    
    // Crear la lista de habilidades
    const listaHabilidades = pokemon.habilidades.map(habilidad => 
        `<li>${habilidad.nombre}${habilidad.es_oculta ? ' (Oculta)' : ''}</li>`
    ).join('');
    
    // Crear la visualización de tipos
    const visualizacionTipos = pokemon.tipos.map(tipo => 
        `<span class="tipo ${tipo.nombreEspanol}">${tipo.nombreEspanol}</span>`
    ).join('');
    
    // Crear la visualización de estadísticas
    const visualizacionEstadisticas = pokemon.estadisticas.map(stat => 
        `<div class="stat">
            <span class="stat-name">${stat.nombre}:</span>
            <span class="stat-value">${stat.valor}</span>
        </div>`
    ).join('');
    
    // Establecer el contenido detallado
    detallePokemon.innerHTML = `
        <button id="btn-volver" class="back-btn">← Volver a la Lista</button>
        <img src="${pokemon.imagen}" alt="${pokemon.nombre}">
        <h2>${pokemon.nombre}</h2>
        <div class="tipos">${visualizacionTipos}</div>
        <p class="descripcion">${pokemon.descripcion}</p>
        <div class="pokemon-info">
            <p><strong>Altura:</strong> ${pokemon.altura} m</p>
            <p><strong>Peso:</strong> ${pokemon.peso} kg</p>
        </div>
        <div class="habilidades">
            <h3>Habilidades</h3>
            <ul>${listaHabilidades}</ul>
        </div>
        <div class="stats">
            <h3>Estadísticas Base</h3>
            ${visualizacionEstadisticas}
        </div>
    `;
    
    // Añadir event listener al botón de volver
    document.getElementById('btn-volver').addEventListener('click', () => {
        detallePokemon.classList.add('oculto');
        gridPokemon.classList.remove('oculto');
    });
}

// Buscar un Pokémon por nombre
async function buscarPokemon() {
    const terminoBusqueda = inputBusqueda.value.trim().toLowerCase();
    
    if (!terminoBusqueda) {
        return;
    }
    
    try {
        // Mostrar estado de carga
        gridPokemon.classList.add('oculto');
        detallePokemon.innerHTML = '<div class="cargando">Buscando Pokémon...</div>';
        detallePokemon.classList.remove('oculto');
        
        // Obtener el Pokémon
        const respuesta = await fetch(`${URL_POKEMON}/${terminoBusqueda}`);
        
        if (!respuesta.ok) {
            throw new Error('Pokémon no encontrado');
        }
        
        const datosPokemon = await respuesta.json();
        const url = `${URL_POKEMON}/${datosPokemon.id}`;
        const pokemon = await obtenerDetallesPokemon(url);
        
        // Mostrar el detalle del Pokémon
        mostrarDetallePokemon(pokemon);
    } catch (error) {
        console.error('Error al buscar Pokémon:', error);
        detallePokemon.innerHTML = `
            <div class="error">
                <p>Pokémon "${terminoBusqueda}" no encontrado.</p>
                <button id="btn-volver" class="back-btn">Volver a la Lista</button>
            </div>
        `;
        
        document.getElementById('btn-volver').addEventListener('click', () => {
            detallePokemon.classList.add('oculto');
            gridPokemon.classList.remove('oculto');
        });
    }
}

// Actualizar controles de paginación basados en el estado actual
function actualizarControlesPaginacion() {
    const totalPaginas = Math.ceil(pokemonsFiltrados.length / pokemonesPorPagina);
    infoPagina.textContent = `Página ${paginaActual} de ${totalPaginas}`;
    
    btnAnterior.disabled = paginaActual === 1;
    btnSiguiente.disabled = paginaActual === totalPaginas;
}

// Event Listeners
btnBuscar.addEventListener('click', buscarPokemon);
inputBusqueda.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        buscarPokemon();
    }
});

btnAnterior.addEventListener('click', () => {
    if (paginaActual > 1) {
        paginaActual--;
        actualizarControlesPaginacion();
        mostrarPokemons();
    }
});

btnSiguiente.addEventListener('click', () => {
    const totalPaginas = Math.ceil(pokemonsFiltrados.length / pokemonesPorPagina);
    if (paginaActual < totalPaginas) {
        paginaActual++;
        actualizarControlesPaginacion();
        mostrarPokemons();
    }
});

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', iniciarApp);