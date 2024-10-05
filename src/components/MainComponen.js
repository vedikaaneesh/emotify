import axios from "axios";
import SongCard from "./SongCard";
import * as faceapi from "face-api.js";
import WebcamModal from "./WebcamModal";
import { Bars } from "react-loader-spinner";
import { styled } from "@mui/material/styles";
import React, { useState, useEffect } from "react";
import { Button, Box, Paper, Grid, Typography } from "@mui/material";

var geolocation = require("geolocation");

const Item = styled(Paper)(({ theme }) => ({
  ...theme.typography.body2,
  textAlign: "center",
  color: theme.palette.text.secondary,
  borderRadius: "10px",
}));

// Example quotes mapped to emotions (you can extend this with more quotes)
const quotes = {
  Happy: [
    "Happiness is not something ready-made. It comes from your own actions.",
    "The purpose of our lives is to be happy.",
    "Happiness is a direction, not a place."
  ],
  Sad: [
    "Tears come from the heart and not from the brain.",
    "Every man has his secret sorrows which the world knows not.",
    "Sadness is but a wall between two gardens."
  ],
  Surprised: [
    "Surprise is the greatest gift which life can grant us.",
    "The unexpected is what makes life interesting.",
    "Sometimes you have to take a leap of faith."
  ],
  Fearful: [
    "The only thing we have to fear is fear itself.",
    "Do one thing every day that scares you.",
    "Fear is only as deep as the mind allows."
  ],
  Angry: [
    "For every minute you are angry you lose sixty seconds of happiness.",
    "Anger is a fuel that can take you anywhere.",
    "Holding onto anger is like drinking poison and expecting the other person to die."
  ],
  Disgusted: [
    "Disgust is the feeling of a disconnected mind and body.",
    "Disgust is the mother of morality.",
    "To be disgusted is to be human."
  ],
  Neutral: [
    "Sometimes, the most productive thing you can do is relax.",
    "Keep calm and carry on.",
    "Life is not about waiting for the storm to pass but learning to dance in the rain."
  ]
};

function MainComponent() {
  const [loader, setShowLoader] = useState(false);
  const [randomSongs, setRandomSongs] = useState([]); // Store multiple random songs
  const [webcamModal, setWebcamModal] = useState(false);
  const [emotion, setEmotion] = useState();
  const [weather, setWeather] = useState();
  const [location, setLocation] = useState();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [currentQuote, setCurrentQuote] = useState(""); // State to hold the current quote

  // Function to map emotion to background colors
  const getBackgroundColor = (mood) => {
    switch (mood) {
      case "Happy":
        return "linear-gradient(135deg, #fceabb 0%, #f8b500 100%)"; // Yellow gradient
      case "Sad":
        return "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)"; // Blue gradient
      case "Surprised":
        return "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"; // Orange gradient
      case "Fearful":
        return "linear-gradient(135deg, #cbbacc 0%, #2580b3 100%)"; // Purple gradient
      case "Angry":
        return "linear-gradient(135deg, #ff0844 0%, #ffb199 100%)"; // Red gradient
      case "Disgusted":
        return "linear-gradient(135deg, #76b852 0%, #8dc26f 100%)"; // Green gradient
      case "Neutral":
        return "linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)"; // Gray gradient
      default:
        return "linear-gradient(135deg, #000000 0%, #434343 100%)"; // Black gradient
    }
  };

  // Change background color based on emotion
  useEffect(() => {
    if (emotion) {
      document.body.style.background = getBackgroundColor(emotion);
      announceEmotion(emotion); // Announce the mood change
      setCurrentQuote(getRandomQuote(emotion)); // Set a quote when the emotion changes
    }
  }, [emotion]);

  // Function to get a random quote based on the current mood
  const getRandomQuote = (mood) => {
    const quotesArray = quotes[mood];
    if (quotesArray) {
      const randomIndex = Math.floor(Math.random() * quotesArray.length);
      return quotesArray[randomIndex];
    }
    return ""; // Return an empty string if no quotes found
  };

  // Function to announce the mood change
  const announceEmotion = (mood) => {
    const msg = new SpeechSynthesisUtterance(`Playing ${mood} songs.`);
    msg.lang = "en-US";
    window.speechSynthesis.speak(msg);
  };

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + "/models";

      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]).then(() => setModelsLoaded(true));
    };
    !modelsLoaded && loadModels();

    !location &&
      geolocation.getCurrentPosition(function (err, position) {
        if (err) throw err;
        setLocation(position.coords.latitude + "," + position.coords.longitude);
      });

    location &&
      axios
        .get(
          `https://api.weatherapi.com/v1/current.json?key=779f7722bee9427d83a144540240510&q=${location}&aqi=no`
        )
        .then((response) => {
          setWeather(response.data.current.condition.text);
        });
  }, [location]);

  useEffect(() => {
    emotion && recommendSongs(emotion);
  }, [emotion]);

  // Function to recommend random songs based on mood
  const recommendSongs = (mood) => {
    setEmotion(mood);
    setShowLoader(true);
    setRandomSongs([]); // Reset random songs before fetching new ones
    if (!weather) {
      alert("Detecting weather...");
      return;
    }

    const options = {
      method: "GET",
      url: "https://shazam.p.rapidapi.com/search",
      params: {
        term: mood + " " + weather,
        locale: "en-US",
        offset: "0",
        limit: "20", // Fetch up to 20 songs
      },
      headers: {
        "x-rapidapi-host": "shazam.p.rapidapi.com",
        "x-rapidapi-key": "44b764df58msh170e4bc525f49e3p1e5000jsn922e3d663dd4",
      },
    };

    axios
      .request(options)
      .then(function (response) {
        const songs = response.data.tracks.hits;
        if (songs.length > 0) {
          // Pick 3 to 5 random songs from the fetched list
          const randomCount = Math.floor(Math.random() * 3) + 3; // Random number between 3 and 5
          const randomSelectedSongs = [];
          const songIndexes = new Set();

          while (songIndexes.size < randomCount) {
            const randomIndex = Math.floor(Math.random() * songs.length);
            if (!songIndexes.has(randomIndex)) {
              randomSelectedSongs.push(songs[randomIndex]);
              songIndexes.add(randomIndex);
            }
          }

          // Set the selected random songs
          setShowLoader(false);
          setRandomSongs(randomSelectedSongs);
        } else {
          setShowLoader(false);
          alert("No songs found!");
        }
      })
      .catch(function (error) {
        setShowLoader(false);
        console.error(error);
      });
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h1 style={{ color: "white" }}>Mood Music</h1>

      <div
        style={{
          gap: "15px",
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          marginBottom: "30px",
        }}
      >
        {[
          { emotion: "Happy", emoji: "😀" },
          { emotion: "Sad", emoji: "😔" },
          { emotion: "Surprised", emoji: "😲" },
          { emotion: "Fearful", emoji: "😨" },
          { emotion: "Angry", emoji: "😠" },
          { emotion: "Disgusted", emoji: "🤢" },
          { emotion: "Neutral", emoji: "😶" },
        ].map((item, index) => (
          <div key={index}>
            <div>
              <Button
                style={{ fontSize: "40px" }}
                onClick={() => recommendSongs(item.emotion)}
              >
                {item.emoji}
              </Button>
            </div>
            <div style={{ color: "lightblue" }}>{item.emotion}</div>
          </div>
        ))}
      </div>

      <Button variant="contained" onClick={() => setWebcamModal(true)}>
        Play my mood!
      </Button>

      {webcamModal ? (
        <WebcamModal
          webcamModal={webcamModal}
          closeWebcamModal={() => setWebcamModal(false)}
          setEmotion={setEmotion}
          modelsLoaded={modelsLoaded}
        />
      ) : (
        <></>
      )}

      <div style={{ marginTop: "20px" }}>
        {emotion ? (
          <div style={{ color: "white" }}>Mood : {emotion}</div>
        ) : (
          <></>
        )}
        {weather ? (
          <div style={{ color: "white" }}>Weather : {weather}</div>
        ) : (
          <></>
        )}
        {loader ? (
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              marginTop: "50px",
            }}
          >
            <Bars
              height="80"
              width="80"
              color="#fff"
              ariaLabel="bars-loading"
              visible={true}
            />
          </div>
        ) : randomSongs.length > 0 ? (
          <Box sx={{ marginTop: "10px", padding: "20px" }}>
            <Grid
              container
              spacing={3}
              style={{ display: "flex", justifyContent: "center" }}
            >
              {randomSongs.map((song, index) => (
                <Grid item xs={4} md={2} key={index}>
                  <Item>
                    <SongCard song={song} />
                  </Item>
                </Grid>
              ))}
            </Grid>
            <Typography variant="h6" style={{ color: "white", marginTop: "20px" }}>
              {currentQuote} {/* Displaying the current quote */}
            </Typography>
          </Box>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
}

export default MainComponent;
