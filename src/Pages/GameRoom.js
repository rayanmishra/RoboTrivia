import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Link, useParams } from 'react-router-dom';

import { ref, set, get } from 'firebase/database';
import { db } from '../firebase-config';
import CountdownTimer from '../Components/CountdownTimer';
import '../App.css';

const GameRoom = ({ category, difficulty, type }) => {
  // Array to hold quiz questions
  const [questions, setQuestions] = useState([]);
  // Index for the current question

  const [currentQuestion, setCurrentQuestion] = useState(0);
  // Score of the game
  const [score, setScore] = useState(0);
  // Loading status
  const [loading, setLoading] = useState(true);
  // Error message
  const [error, setError] = useState('');
  // Status of the quiz

  const [quizCompleted, setQuizCompleted] = useState(false);
  // State to control timer reset
  const [resetTimer, setResetTimer] = useState(null);
  // Grabs the game id from the URL
  const { gameId } = useParams();

  // Effect hook to fetch data on initial render and on changes to category, difficulty, type

  useEffect(() => {
    fetchData(category, difficulty, type);
  }, [category, difficulty, type]);

  // function to handle moving to the next question when the countdown timer expires

  const handleExpire = useCallback(() => {
    // Move to the next question when timer expires
    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestion(nextQuestion);
    } else {
      setQuizCompleted(true);
    }
  }, [currentQuestion, questions.length]);

  // Handler for resetting the timer
  const handleReset = useCallback((resetFunction) => {
    setResetTimer(() => resetFunction);
  }, []);

  // Handler for when an answer is selected
  const handleAnswer = (answer) => {
    if (quizCompleted) {
      // Don't update the score if the quiz is completed
      return;
    }

    const currentQuestionObj = questions[currentQuestion];

    if (answer === currentQuestionObj.correct_answer) {
      // Increase score if answer is correct
      setScore(score + 1);
    }

    // Clear timer and move to the next question immediately
    if (resetTimer) {
      resetTimer();
    }

    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestion(nextQuestion);
    } else {
      // Quiz completed
      setQuizCompleted(true);
    }
  };

  // Function to fetch data for the game
  const fetchData = (category, difficulty, type) => {
    // Reference to the game session data in Firebase
    const gameSessionRef = ref(db, `gameSessions/${gameId}/questions`);
    // Tries to Fetch the data from Firebase, if it exists then use it otherwise make API call and then save it
    get(gameSessionRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setQuestions(data);
          setLoading(false);
        } else {
          // If the data does not exist in Firebase make the API call
          axios
            .get(
              `https://opentdb.com/api.php?amount=10&category=${category}&difficulty=${difficulty}&type=${type}`
            )
            .then((response) => {
              const questionsWithUniqueIds = response.data.results.map(
                (question) => ({ ...question, id: uuidv4() })
              );
              // Save the data in Firebase
              set(gameSessionRef, questionsWithUniqueIds)
                .then(() => {
                  // Set the local state with the fetched data
                  setQuestions(questionsWithUniqueIds);
                  setLoading(false);
                })
                .catch((error) => {
                  setError(
                    'Failed to save questions to Firebase. Please try again later.'
                  );
                  setLoading(false);
                });
            })
            .catch((error) => {
              setError('Failed to fetch questions. Please try again later.');
              setLoading(false);
            });
        }
      })
      .catch((error) => {
        setError('Failed to fetch data from Firebase. Please try again later.');
        setLoading(false);
      });
  };

  // Rendering based on different states
  if (loading) {
    return <div>{/* Loading... icon (react spinners package)*/}</div>;
  }
  // Rendering based on different states
  if (error) {
    return (
      <div>
        {error}
        <button onClick={() => fetchData(category, difficulty, type)}>
          Retry
        </button>
      </div>
    );
  }
  // Rendering based on different states
  if (questions.length === 0) {
    return <p>Loading...</p>;
  }

  const currentQuestionObj = questions[currentQuestion];
  const options = [
    ...currentQuestionObj.incorrect_answers,
    currentQuestionObj.correct_answer,
  ];
  //Its going to shuffle options.We can call the sort() method, which accepts a function that returns a value between -0.5 and 0.5:
  options.sort(() => Math.random() - 0.5);

  return (
    <div>
      <div className="quizInfo">
        <p>Score: {score}/10</p>
        <h3>{questions[currentQuestion].category}</h3>
        <CountdownTimer
          key={currentQuestion}
          initialCount={15}
          onExpire={handleExpire}
          onReset={handleReset}
        />
      </div>
      <div className="questionFromAPI">
        <h3>Question {currentQuestion + 1}</h3>
        <p dangerouslySetInnerHTML={{ __html: currentQuestionObj.question }} />
        <ul>
          {options.map((option) => {
            const optionId = uuidv4();
            return (
              <li key={optionId} onClick={() => handleAnswer(option)}>
                {option}
              </li>
            );
          })}
        </ul>
      </div>
        {currentQuestion === questions.length - 1 ? (
          <Link to={`/gameroom/${gameId}/result`}>View Score!</Link>
        ) : null}
        <Link to="/">Quit Game</Link>
    </div>
  );
};

export default GameRoom;