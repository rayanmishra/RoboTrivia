import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import { ref, set, get } from 'firebase/database';
import { db } from '../firebase-config';
import '../App.css';

const GameRoom = ({ category, difficulty, type, gameId }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [counter, setCounter] = useState(15);

  console.log('game id:', gameId);

  useEffect(() => {
    fetchData(category, difficulty, type);
  }, [category, difficulty, type]);

  useEffect(() => {
    counter > 0 && setTimeout(() => setCounter(counter - 1), 1000);
  }, [counter]);

  const fetchData = (category, difficulty, type) => {
    // Reference to the game session data in Firebase
    const gameSessionRef = ref(db, `gameSessions/${gameId}/questions`);
    console.log(gameId);
    //Tries to Fetch the data from Firebase if it exist then use it otherwise make API call and then save it
    get(gameSessionRef)
      .then((snapshot) => {
        // .exists is a firebase method used to check the existence of data. it returns true or false.
        if (snapshot.exists()) {
          // If the data exists in Firebase, use it
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
                (question) => ({
                  ...question,
                  id: uuidv4(),
                })
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

  const handleAnswer = (answer) => {
    if (quizCompleted) {
      // Don't update the score if the quiz is completed
      return;
    }

    const currentQuestionObj = questions[currentQuestion];

    if (answer === currentQuestionObj.correct_answer) {
      setScore(score + 1);
    }

    const nextQuestion = currentQuestion + 1;
    if (nextQuestion < questions.length) {
      setCurrentQuestion(nextQuestion);
    } else {
      // Quiz completed
      // console.log('Quiz completed');
      setQuizCompleted(true);
    }
  };

  if (loading) {
    return <div>{/* Loading... icon (react spinners package)*/}</div>;
  }

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

  if (questions.length === 0) {
    return <p>Loading...</p>;
  }

  const currentQuestionObj = questions[currentQuestion];
  const options = [
    ...currentQuestionObj.incorrect_answers,
    currentQuestionObj.correct_answer,
  ];
  // Its going to shuffle options.We can call the sort() method, which accepts a function that returns a value between -0.5 and 0.5:
  // options.sort(() => Math.random() - 0.5);



  return (
    <div>
      <div className="quizInfo">
          <p>Score: {score}/10</p>
          <h3>{questions[currentQuestion].category}</h3>
          <p>Countdown: {counter}</p>
      </div>

      <div className="questionFromAPI">
      <h3>Question {currentQuestion + 1}</h3>
      <p dangerouslySetInnerHTML={{ __html: currentQuestionObj.question }} />
      <ul>
        {options.map((option) => {
          const optionId = uuidv4();
          // console.log(`Option: ${option}, ID: ${optionId}`);
          return (
            <li key={optionId} onClick={() => handleAnswer(option)}>
              {option}
            </li>
          );
        })}
      </ul>
      </div>
     
      {currentQuestion === questions.length - 1 ? (
        <Link to="/">Go to Home</Link>
      ) : null}
    </div>
  );
};

export default GameRoom;
