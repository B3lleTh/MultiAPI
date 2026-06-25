import { firebaseConfig } from "./config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

let currentMovie = "";
let map;
let marker;

function initMap() {
  map = L.map("map").setView([20, 0], 2);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);
}

window.onload = () => {
  initMap();
};

window.searchMovie = async () => {
  const title = document.getElementById("movieInput").value.trim();

  if (!title) return;

  currentMovie = title;

  try {
    const response = await fetch(`/movie/${encodeURIComponent(title)}`);
    const movie = await response.json();

    if (movie.Response === "False") {
      alert("Película no encontrada");
      return;
    }

    document.getElementById("movie").innerHTML = `
      <img
        src="${
          movie.Poster !== "N/A"
            ? movie.Poster
            : "https://via.placeholder.com/300x450?text=No+Poster"
        }"
        alt="${movie.Title}"
      >

      <h2>${movie.Title}</h2>

      <p><strong>Año:</strong> ${movie.Year}</p>
      <p><strong>País:</strong> ${movie.Country}</p>
      <p><strong>IMDb:</strong> ${movie.imdbRating}</p>
      <p>${movie.Plot}</p>
    `;

    if (marker) {
      map.removeLayer(marker);
      marker = null;
    }

    if (
      movie.coords &&
      typeof movie.coords.lat === "number" &&
      typeof movie.coords.lng === "number"
    ) {
      map.setView([movie.coords.lat, movie.coords.lng], 5);

      marker = L.marker([
        movie.coords.lat,
        movie.coords.lng,
      ]).addTo(map);

      marker.bindPopup(
        `<b>${movie.Title}</b><br>${movie.Country}`
      );
    } else {
      console.log(
        "No se encontraron coordenadas para esta película."
      );

      map.setView([20, 0], 2);
    }

    const ytResponse = await fetch(
      `/youtube/${encodeURIComponent(title)}`
    );

    const ytData = await ytResponse.json();

    const trailer = document.getElementById("trailer");

    if (
      ytData.items &&
      ytData.items.length > 0 &&
      ytData.items[0].id &&
      ytData.items[0].id.videoId
    ) {
      trailer.src =
        `https://www.youtube.com/embed/${ytData.items[0].id.videoId}`;
    } else {
      trailer.src = "";
    }
  } catch (error) {
    console.error(error);
    alert("Error cargando película");
  }
};

window.saveFavorite = async () => {
  const comment = document
    .getElementById("comment")
    .value
    .trim();

  if (!currentMovie) {
    alert("Busca una película primero");
    return;
  }

  try {
    await addDoc(collection(db, "favoritos"), {
      pelicula: currentMovie,
      comentario: comment,
      fecha: new Date().toISOString(),
    });

    alert("Guardado en Firebase");

    document.getElementById("comment").value = "";
  } catch (error) {
    console.error(error);
    alert("Error guardando favorito");
  }
};