const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// RUTA PARA PELÍCULAS Y COORDENADAS AUTOMÁTICAS
app.get("/movie/:title", async (req, res) => {
  try {
    // Obtener datos de la película desde OMDb
    const omdbResponse = await axios.get(
      `https://www.omdbapi.com/?apikey=${process.env.OMDB_KEY}&t=${encodeURIComponent(req.params.title)}`,
    );

    const movieData = omdbResponse.data;

    // Si OMDb no encuentra la película, salimos de inmediato
    if (movieData.Response === "False") {
      return res.json(movieData);
    }

    let coords = null;

    // Si la película tiene un país buscamos sus coordenadas
    if (movieData.Country) {
      // Tomamos solo el primer país (ej: "United States, Canada" -> "United States")
      const primaryLocation = movieData.Country.split(",")[0].trim();

      try {
        // Consultamos a OpenStreetMap (La neta Google me pedia pago para cierta info y no me complique)
        const geoResponse = await axios.get(
          `https://nominatim.openstreetmap.org/search`,
          {
            params: {
              q: primaryLocation,
              format: "json",
              limit: 1,
            },
            headers: {
              // Identificador para que OSM no bloquee la peticion
              "User-Agent": "MovieExplorerApp/1.0",
            },
          },
        );

        // extraemos sus coordenadas
        if (geoResponse.data && geoResponse.data.length > 0) {
          coords = {
            lat: parseFloat(geoResponse.data[0].lat),
            lng: parseFloat(geoResponse.data[0].lon),
          };
          console.log(
            `Coordenadas encontradas para [${primaryLocation}]:`,
            coords,
          );
        } else {
          console.log(
            `No se encontraron coordenadas para el país: ${primaryLocation}`,
          );
        }
      } catch (geoError) {
        console.error(
          "Error buscando coordenadas en OpenStreetMap:",
          geoError.message,
        );
      }
    }

    // Enviamos la respuesta final al frontend
    res.json({
      ...movieData,
      coords: coords,
    });
  } catch (error) {
    console.error("Error crítico en /movie:", error.message);
    res.status(500).json({ error: "Error obteniendo película" });
  }
});

// RUTA PARA EL TRAILER DE YOUTUBE
app.get("/youtube/:title", async (req, res) => {
  try {
    const response = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          part: "snippet",
          maxResults: 1,
          q: `${req.params.title} official trailer`,
          key: process.env.YOUTUBE_KEY,
          type: "video",
        },
      },
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error crítico en /youtube:", error.message);
    res.status(500).json({ error: "Error YouTube" });
  }
});

// INICIAR SERVIDOR
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running in http://localhost:${PORT}`);
});