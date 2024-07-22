const BASE_URL = "https://pokeapi.co/api/v2/pokemon";
const SPECIES_URL = "https://pokeapi.co/api/v2/pokemon-species";
let allePokemonIds = []; // Array zur Speicherung der IDs aller Pokémon
let allePokemon = []; // Array zur Speicherung der Daten aller Pokémon
let aktuellerPokemonIndex = null; // Aktueller Index des angezeigten Pokémon
let offset = 0; // Paginierungs-Offset zum Abrufen von Pokémon in Chargen
const limit = 20; // Anzahl der Pokémon, die pro API-Aufruf abgerufen werden

// Funktion zum Abrufen aller Pokémon-IDs
async function fetchAllPokemonIds() {
    let nextUrl = `${BASE_URL}?limit=151`; // Begrenzung auf nur Kanto-Pokémon (erste 151)
    while (nextUrl) {
        const response = await fetch(nextUrl);
        const data = await response.json();
        allePokemonIds = allePokemonIds.concat(data.results.map(pokemon => pokemon.url.split('/').slice(-2, -1)[0]));
        allePokemon = allePokemon.concat(data.results); // Speichere alle Pokémon-Daten
        nextUrl = data.next;
    }
}

// Funktion zum Rendern aller Pokémon
async function renderPokemonAll(reset = false) {
    showSpinner();
    if (reset) offset = 0;
    try { const response = await fetch(`${BASE_URL}?limit=${limit}&offset=${offset}`);
          const data = await response.json();
          const pokemonListe = data.results.filter(pokemon => isInKanto(pokemon.url));
          const karten = document.getElementById('content');
          if (reset) karten.innerHTML = '';
          for (const pokemon of pokemonListe) {
            const pokemonDetails = await (await fetch(pokemon.url)).json();
            karten.innerHTML += renderCard(pokemonDetails, pokemonDetails.types[0].type.name);
        }
             offset += limit;
        } catch (error) {
        console.error('Fehler beim Abrufen von Pokémon:', error);
        } finally {
        hideSpinner();
        }
}

// Hilfsfunktion um zu überprüfen, ob ein Pokémon zur Kanto-Region gehört
function isInKanto(url) {
    const pokemonId = parseInt(url.split('/').slice(-2, -1)[0]);
    return pokemonId >= 1 && pokemonId <= 151;
}

// Funktion zum Öffnen einer Pokémon-Karte nach ID
async function openPokemonCardById(pokemonId) {
    aktuellerPokemonIndex = allePokemonIds.indexOf(pokemonId.toString()); // Findet den Index der Pokémon-ID in der Liste aller Pokémon-IDs
    if (aktuellerPokemonIndex === -1) return console.error(`Pokémon mit der ID ${pokemonId} wurde nicht in allePokemonIds gefunden.`); // Gibt eine Fehlermeldung aus, wenn die Pokémon-ID nicht gefunden wurde
    let getCompressedData = key => JSON.parse(LZString.decompress(localStorage.getItem(key)) || 'null'); // Definiert eine Funktion zum Abrufen und Dekomprimieren von Daten aus dem lokalen Speicher
    let [pokemonDetails, speciesDetails, evolutions] = ['pokemon_', 'species_', 'evolutions_'].map(key => getCompressedData(key + pokemonId)); // Ruft die komprimierten Daten für das Pokémon, die Spezies und die Evolution aus dem lokalen Speicher ab
    if (!pokemonDetails || !speciesDetails || !evolutions) { // Überprüft, ob die Daten im lokalen Speicher fehlen
        [pokemonDetails, speciesDetails] = await Promise.all([fetch(`${BASE_URL}/${pokemonId}`).then(r => r.json()), fetch(`${SPECIES_URL}/${pokemonId}`).then(r => r.json())]); // Ruft die Pokémon- und Spezies-Daten von den URLs ab
        evolutions = await getEvolutions((await fetch(speciesDetails.evolution_chain.url).then(r => r.json())).chain); // Ruft die Evolutionsdaten von der Evolutionsketten-URL ab
        ['pokemon_', 'species_', 'evolutions_'].forEach((key, i) => localStorage.setItem(key + pokemonId, LZString.compress(JSON.stringify([pokemonDetails, speciesDetails, evolutions][i])))); // Speichert die abgerufenen Daten komprimiert im lokalen Speicher
    }
    document.getElementById('FullSize').innerHTML = fullSizeCard(pokemonDetails, pokemonDetails.types[0].type.name, evolutions); // Aktualisiert den Inhalt des FullSize-Elements mit der vollständigen Pokémon-Karte
    addArrowEventListeners(); // Fügt Event-Listener für Pfeiltasten hinzu
    updateArrowVisibility(); // Aktualisiert die Sichtbarkeit der Pfeiltasten
    remove(); // Entfernt eventuelle überflüssige Elemente (spezifische Funktion, Bedeutung nicht klar ohne weiteren Kontext)
    closeFullSize(); // Schließt das FullSize-Element (spezifische Funktion, Bedeutung nicht klar ohne weiteren Kontext)
    closeFullSize2(); // Schließt ein weiteres FullSize-Element (spezifische Funktion, Bedeutung nicht klar ohne weiteren Kontext)
}

// Event-Listener für die Pfeile zum Navigieren durch die Pokémon
function addArrowEventListeners() {
    document.getElementById('leftArrow').addEventListener('click', () => navigatePokemon('prev'));
    document.getElementById('rightArrow').addEventListener('click', () => navigatePokemon('next'));
    document.getElementById('left').addEventListener('click', () => navigatePokemon('prev'));
    document.getElementById('right').addEventListener('click', () => navigatePokemon('next'));
}

// Funktion zum Navigieren durch die Pokémon
function navigatePokemon(direction) {
    if (direction === 'next' && aktuellerPokemonIndex < allePokemonIds.length - 1) {
        aktuellerPokemonIndex++;
    } else if (direction === 'prev' && aktuellerPokemonIndex > 0) {
        aktuellerPokemonIndex--;
    }
    openPokemonCardById(allePokemonIds[aktuellerPokemonIndex]);
}

// Funktion zum Abrufen der Evolutionskette eines Pokémon
async function getEvolutions(chain) {
    let evolutions = []; // Array zur Speicherung der Evolutionsdetails
    let currentChain = chain; // Aktuelle Kette initialisieren
    while (currentChain) { // Schleife durch die Evolutionskette
        let speciesName = currentChain.species.name; // Name der aktuellen Spezies
        let speciesResponse = await fetch(`${BASE_URL}/${speciesName}`); // Abrufen der Speziesdetails
        let speciesDetails = await speciesResponse.json(); // JSON-Antwort parsen
        evolutions.push(speciesDetails); // Details zur Evolution hinzufügen
        currentChain = currentChain.evolves_to[0]; // Zur nächsten Evolutionsstufe wechseln
    }
    return evolutions; // Evolutionsdetails zurückgeben
}

// Funktion zur Aktualisierung der Sichtbarkeit der Navigationspfeile
function updateArrowVisibility() {
    const leftArrow = document.getElementById('leftArrow');
    const rightArrow = document.getElementById('rightArrow');
    const leftArrowContainer = document.getElementById('leftArrowContainer');
    if (aktuellerPokemonIndex === 0) {
        leftArrow.classList.add('hidden');
    } else {
        leftArrow.classList.remove('hidden');
    }
    if (aktuellerPokemonIndex === allePokemonIds.length - 1) {
        rightArrow.style.display = 'none';
    } else {
        rightArrow.style.display = 'block';
    }
}

// Such-Handler, um Pokémon bei Eingabe eines Buchstabens zu rendern
async function handleSearchInput(event) {
    const input = event.target.value.trim().toLowerCase(); // Holen des Eingabewerts und Umwandeln in Kleinbuchstaben
    const content = document.getElementById('content'); // Holen des Inhaltsbereichs, in dem die Pokémon-Karten angezeigt werden
    content.innerHTML = ''; // Leeren des Inhaltsbereichs
    try {
        if (input.length > 0) { // Überprüfen, ob es eine Eingabe gibt
            const gefiltertePokemon = allePokemon.filter(pokemon => pokemon.name.startsWith(input) && isInKanto(pokemon.url)); // Filtern der Pokémon, deren Name mit der Eingabe beginnt und die zur Kanto-Region gehören
            await renderFilteredPokemon(gefiltertePokemon, content); // Rendern der gefilterten Pokémon
        } else { // Wenn keine Eingabe vorhanden ist
            offset = 0; // Zurücksetzen des Paginierungs-Offsets
            await renderPokemonAll(true); // Rendern aller Pokémon von Anfang an
        }
        document.querySelector('.Btn-container').style.display = input.length > 0 ? 'none' : 'flex'; // Festlegen, ob die "Load More"-Schaltfläche angezeigt oder ausgeblendet wird
    } catch (error) {
        console.error('Fehler bei der Pokémon-Suche:', error); // Fehlerbehandlung und Protokollierung
    }
}

// Funktion zum Rendern der gefilterten Pokémon
async function renderFilteredPokemon(pokemonListe, content) {
    for (let pokemon of pokemonListe) {
        try {
            let pokemonDetailsResponse = await fetch(pokemon.url);
            let pokemonDetails = await pokemonDetailsResponse.json();
            let pokemonType = pokemonDetails.types[0].type.name;
            content.innerHTML += renderCard(pokemonDetails, pokemonType);
        } catch (error) {
            console.error('Fehler beim Abrufen von Pokémon-Details:', error);
        }
    }
}

// Event-Listener für das Eingabefeld
const searchInput = document.getElementById('pokemonNameInput');
if (searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
}

// Funktion zum Anzeigen der Suchergebnisse bei Klick auf die Such-Schaltfläche oder bei Eingabe von Enter
async function searchPokemon() {
    const input = document.getElementById('pokemonNameInput').value.trim().toLowerCase(); // Eingabewert holen und in Kleinbuchstaben umwandeln
    if (input.length > 0) { // Überprüfen, ob das Eingabefeld nicht leer ist
        try {
            let gefiltertePokemon = allePokemon.filter(pokemon => pokemon.name.startsWith(input) && isInKanto(pokemon.url)); // Pokémon filtern, deren Name mit der Eingabe beginnt und die zur Kanto-Region gehören
            const content = document.getElementById('content'); // Inhaltsbereich auswählen
            content.innerHTML = ''; // Inhaltsbereich leeren
            await renderFilteredPokemon(gefiltertePokemon, content); // Gefilterte Pokémon rendern
        } catch (error) {
            console.error('Fehler bei der Pokémon-Suche:', error); // Fehlerprotokollierung
        } 
    } else { // Wenn das Eingabefeld leer ist
        alert('Bitte geben Sie etwas ein'); // Alert anzeigen
    }
}

// Funktion zum Anzeigen des Lade-Symbols
function showSpinner() {
    document.querySelector('.loadingWrapper').style.display = 'flex';
}

// Funktion zum Verbergen des Lade-Symbols
function hideSpinner() {
    document.querySelector('.loadingWrapper').style.display = 'none';
}

// Funktion zum Schließen der Vollbild-Ansicht
function closeFullSize() {
    let close = document.querySelector('#next');
    close.addEventListener('click', (e) => {
        if (e.target == close) {
            document.querySelector('#FullSize').classList.add('d-none');
        }
    });
}

function closeFullSize2() {
    const closeButton = document.querySelector('#closeBtn');
    if (closeButton) {
        closeButton.addEventListener('click', (e) => {
            if (e.target == closeButton)
            document.querySelector('#FullSize').classList.add('d-none');
        });
    }
}
// Funktion zum Öffnen der Vollbild-Ansicht
function remove() {
    document.querySelector('#FullSize').classList.remove('d-none');
}

// Funktion zum Initialisieren der Seite beim Laden
function initializePage() {
    fetchAllPokemonIds();
    handleWrapperTransition();
    addEventListeners();
    closeFullSize2()
}

function handleWrapperTransition() {
    const wrapper = document.querySelector(".wrapper"); // Wrapper-Element auswählen
    const content = document.getElementById("content"); // Inhaltsbereich auswählen
    setTimeout(() => { // Timeout für die Verzögerung von 3 Sekunden setzen
        wrapper.classList.add("wrapper--hidden"); // Klasse hinzufügen, um den Wrapper zu verstecken
        wrapper.addEventListener("transitionend", () => { // Event-Listener für das Ende der Transition hinzufügen
            document.body.removeChild(wrapper); // Wrapper aus dem DOM entfernen
            content.style.display = "flex"; // Inhaltsbereich anzeigen
        });
    }, 3000); // Verzögerung von 3000 Millisekunden (3 Sekunden)
}

function addEventListeners() {
    const searchInput = document.getElementById('pokemonNameInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearchInput);
    }
    const searchButton = document.querySelector('.button');
    if (searchButton) {
        searchButton.addEventListener('click', searchPokemon);
    }
    const loadMoreButton = document.getElementById('loadMoreButton');
    if (loadMoreButton) {
        loadMoreButton.addEventListener('click', () => renderPokemonAll(false));
    }
}

// Funktion zum Rendern einer Pokémon-Karte
function renderCard(pokemonDetails, pokemonType) {
    return `
        <div onclick="openPokemonCardById('${pokemonDetails.id}')" class="type ${pokemonType}">
            <div class="karten2">
                <h2>${pokemonDetails.id}# ${pokemonDetails.name}</h2>
                <p class="typeClass">${pokemonType}</p>
                <div class="cardRender ${pokemonType}">
                    <img class="img" src="${pokemonDetails.sprites.other.home.front_default}" alt="">
                </div>
            </div>
        </div>
    `;
}

// Funktion zum Rendern einer Vollbild-Pokémon-Karte
function fullSizeCard(pokemon, type, evolutions) {
    return `
       <div id="next" class="full-Container">
    <div id="leftArrowContainer">
        <img id="leftArrow" class="arrows" src="./img/left.webp" alt="Left Arrow">
    </div>
    <div class="containerFullScreen ${type}-gradient">
        <div>
            <img class="img1" src="${pokemon.sprites.other.home.front_default}" alt="${pokemon.name}">
        </div>
        <h3>${pokemon.name}</h3>
        <p>Type: ${type}</p>
        <div class="stats">
            <div class="stat">
                <span>HP</span>
                <div class="bar-container">
                    <div class="bar hp-bar" style="width: ${pokemon.stats[0].base_stat}%;">${pokemon.stats[0].base_stat}</div>
                </div>
            </div>
            <div class="stat">
                <span>Attack</span>
                <div class="bar-container">
                    <div class="bar attack-bar" style="width: ${pokemon.stats[1].base_stat}%;">${pokemon.stats[1].base_stat}</div>
                </div>
            </div>
            <div class="stat">
                <span>Defense</span>
                <div class="bar-container">
                    <div class="bar defense-bar" style="width: ${pokemon.stats[2].base_stat}%;">${pokemon.stats[2].base_stat}</div>
                </div>
            </div>
        </div>
        <h4>Evolutions:</h4>
        <div class="evolutions">
            ${evolutions.map(evo => `
            <div class="evolution">
                <img src="${evo.sprites.other.home.front_default}" alt="">
                <p>${evo.name}</p>
            </div>`).join('')}
        </div>
    </div>
    <img id="rightArrow" class="arrows" src="./img/right.webp" alt="Right Arrow">
</div>

<div class="arrow">
  <img id="left" src="./img/left.webp" alt="">
  <img id="closeBtn" class="close" src="./img/close.webp" alt="">
  <img id="right" src="./img/right.webp" alt="">
</div>

    `;
}

