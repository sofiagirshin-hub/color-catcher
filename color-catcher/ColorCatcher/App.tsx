/**
 * Color Catcher - A mobile game where players catch falling colored balls
 * @format
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanGestureHandler,
  State,
} from 'react-native';

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Game constants
const BALL_RADIUS = 25;
const BASKET_WIDTH = 100;
const BASKET_HEIGHT = 50;
const GAME_DURATION = 60; // 60 seconds
const MAX_MISSED_BALLS = 10; // Game ends after missing 10 target balls

// Ball colors
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Yellow', 'Purple'];

// Ball class to represent falling balls
class Ball {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  color: string;
  isTarget: boolean;

  constructor(id: number, x: number, color: string, isTarget: boolean) {
    this.id = id;
    this.x = new Animated.Value(x);
    this.y = new Animated.Value(-BALL_RADIUS * 2);
    this.color = color;
    this.isTarget = isTarget;
  }

  // Animate ball falling
  fall(speed: number) {
    Animated.timing(this.y, {
      toValue: SCREEN_HEIGHT + BALL_RADIUS * 2,
      duration: speed,
      useNativeDriver: true,
    }).start();
  }
}

// Main App component
export default function ColorCatcher() {
  // Game states
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [missedBalls, setMissedBalls] = useState(0);
  const [targetColor, setTargetColor] = useState('');
  const [targetColorName, setTargetColorName] = useState('');
  
  // Game elements
  const [balls, setBalls] = useState<Ball[]>([]);
  const basketPosition = useRef(new Animated.Value(SCREEN_WIDTH / 2 - BASKET_WIDTH / 2)).current;
  const ballIdCounter = useRef(0);
  const gameInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize target color
  useEffect(() => {
    setNewTargetColor();
  }, []);

  // Set a new target color
  const setNewTargetColor = () => {
    const randomIndex = Math.floor(Math.random() * COLORS.length);
    setTargetColor(COLORS[randomIndex]);
    setTargetColorName(COLOR_NAMES[randomIndex]);
  };

  // Start the game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setMissedBalls(0);
    setBalls([]);
    setNewTargetColor();
    
    // Start ball generation
    gameInterval.current = setInterval(() => {
      generateBall();
    }, 1000); // Generate a new ball every second
    
    // Start timer
    timerInterval.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Generate a new falling ball
  const generateBall = () => {
    const isTarget = Math.random() > 0.5; // 50% chance to be target color
    const color = isTarget ? targetColor : COLORS[Math.floor(Math.random() * COLORS.length)];
    const x = Math.random() * (SCREEN_WIDTH - BALL_RADIUS * 2);
    
    ballIdCounter.current += 1;
    const newBall = new Ball(ballIdCounter.current, x, color, isTarget);
    newBall.fall(5000); // Fall for 5 seconds
    
    setBalls(prev => [...prev, newBall]);
    
    // Remove ball after it falls off screen
    setTimeout(() => {
      setBalls(prev => prev.filter(ball => ball.id !== newBall.id));
      
      // If it was a target ball and wasn't caught, increment missed balls
      if (isTarget) {
        setMissedBalls(prev => {
          const newMissed = prev + 1;
          if (newMissed >= MAX_MISSED_BALLS) {
            endGame();
          }
          return newMissed;
        });
      }
    }, 5500);
  };

  // Handle basket movement via pan gesture
  const onPanGestureEvent = Animated.event(
    [{ nativeEvent: { absoluteX: basketPosition } }],
    { useNativeDriver: false }
  );

  // Handle pan gesture state change
  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { absoluteX } = event.nativeEvent;
      // Keep basket within screen bounds
      const boundedX = Math.max(0, Math.min(absoluteX - BASKET_WIDTH / 2, SCREEN_WIDTH - BASKET_WIDTH));
      basketPosition.setValue(boundedX);
    }
  };

  // Check collision between ball and basket
  const checkCollision = (ball: Ball) => {
    // Get basket position
    const basketX = basketPosition.__getValue();
    const basketY = SCREEN_HEIGHT - BASKET_HEIGHT - 50; // 50px from bottom
    
    // Get ball position
    const ballX = ball.x.__getValue();
    const ballY = ball.y.__getValue();
    
    // Simple collision detection
    return (
      ballX + BALL_RADIUS * 2 > basketX &&
      ballX < basketX + BASKET_WIDTH &&
      ballY + BALL_RADIUS * 2 > basketY &&
      ballY < basketY + BASKET_HEIGHT
    );
  };

  // Handle ball catching
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const interval = setInterval(() => {
      balls.forEach(ball => {
        if (checkCollision(ball)) {
          // Remove caught ball
          setBalls(prev => prev.filter(b => b.id !== ball.id));
          
          // Update score based on whether it was the target color
          if (ball.isTarget) {
            setScore(prev => prev + 10);
          } else {
            setScore(prev => Math.max(0, prev - 5)); // Don't go below 0
          }
        }
      });
    }, 100); // Check collisions 10 times per second
    
    return () => clearInterval(interval);
  }, [balls, gameState]);

  // End the game
  const endGame = () => {
    setGameState('gameOver');
    
    // Clear intervals
    if (gameInterval.current) {
      clearInterval(gameInterval.current);
      gameInterval.current = null;
    }
    
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
  };

  // Render start screen
  const renderStartScreen = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>Color Catcher</Text>
      <Text style={styles.instructions}>
        Catch balls of the target color ({targetColorName}) while avoiding others!
      </Text>
      <Text style={styles.instructions}>
        Game ends after {GAME_DURATION} seconds or missing {MAX_MISSED_BALLS} target balls.
      </Text>
      <Text style={styles.instructions}>
        Correct catch: +10 points {'\n'}
        Wrong catch: -5 points
      </Text>
      <TouchableOpacity style={styles.button} onPress={startGame}>
        <Text style={styles.buttonText}>PLAY</Text>
      </TouchableOpacity>
    </View>
  );

  // Render game screen
  const renderGameScreen = () => (
    <View style={styles.screen}>
      {/* Game UI */}
      <View style={styles.gameUI}>
        <Text style={styles.score}>Score: {score}</Text>
        <Text style={styles.timer}>Time: {timeLeft}s</Text>
        <Text style={styles.missed}>Missed: {missedBalls}/{MAX_MISSED_BALLS}</Text>
        <Text style={styles.target}>Target: {targetColorName}</Text>
      </View>
      
      {/* Falling balls */}
      {balls.map(ball => (
        <Animated.View
          key={ball.id}
          style={[
            styles.ball,
            {
              backgroundColor: ball.color,
              transform: [{ translateX: ball.x }, { translateY: ball.y }]
            }
          ]}
        />
      ))}
      
      {/* Player basket */}
      <PanGestureHandler
        onGestureEvent={onPanGestureEvent}
        onHandlerStateChange={onHandlerStateChange}>
        <Animated.View
          style={[
            styles.basket,
            {
              transform: [{ translateX: basketPosition }]
            }
          ]}
        />
      </PanGestureHandler>
    </View>
  );

  // Render game over screen
  const renderGameOverScreen = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>Game Over!</Text>
      <Text style={styles.finalScore}>Final Score: {score}</Text>
      <Text style={styles.gameStats}>
        Time survived: {GAME_DURATION - timeLeft} seconds {'\n'}
        Balls missed: {missedBalls}
      </Text>
      <TouchableOpacity style={styles.button} onPress={startGame}>
        <Text style={styles.buttonText}>PLAY AGAIN</Text>
      </TouchableOpacity>
    </View>
  );

  // Render appropriate screen based on game state
  return (
    <View style={styles.container}>
      {gameState === 'start' && renderStartScreen()}
      {gameState === 'playing' && renderGameScreen()}
      {gameState === 'gameOver' && renderGameOverScreen()}
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  instructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 15,
    color: '#666',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 30,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  gameUI: {
    position: 'absolute',
    top: 50,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    zIndex: 10,
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  timer: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  missed: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  target: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  ball: {
    position: 'absolute',
    width: BALL_RADIUS * 2,
    height: BALL_RADIUS * 2,
    borderRadius: BALL_RADIUS,
    zIndex: 1,
  },
  basket: {
    position: 'absolute',
    bottom: 50,
    width: BASKET_WIDTH,
    height: BASKET_HEIGHT,
    backgroundColor: '#8B4513',
    borderRadius: 10,
    zIndex: 5,
  },
  finalScore: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  gameStats: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
    lineHeight: 24,
  },
});