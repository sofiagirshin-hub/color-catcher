import React, { useState, useEffect, useRef } from 'react';
import './App.css';

// Get screen dimensions
const SCREEN_WIDTH = window.innerWidth;
const SCREEN_HEIGHT = window.innerHeight;

// Game constants
const BALL_RADIUS = 25;
const BASKET_WIDTH = 120;
const BASKET_HEIGHT = 60;
const GAME_DURATION = 60; // 60 seconds
const MAX_MISSED_BALLS = 10; // Game ends after missing 10 target balls

// Ball colors
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const COLOR_NAMES = ['Red', 'Blue', 'Green', 'Yellow', 'Purple'];

// Floating element class for dynamic background elements
class FloatingElement {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speedX: number;
  speedY: number;
  shape: 'circle' | 'square';

  constructor(id: number) {
    this.id = id;
    this.x = Math.random() * SCREEN_WIDTH;
    this.y = Math.random() * SCREEN_HEIGHT;
    this.size = Math.random() * 30 + 10;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.speedX = (Math.random() - 0.5) * 2;
    this.speedY = (Math.random() - 0.5) * 2;
    this.shape = Math.random() > 0.5 ? 'circle' : 'square';
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    // Bounce off edges
    if (this.x <= 0 || this.x >= SCREEN_WIDTH - this.size) {
      this.speedX *= -1;
    }
    if (this.y <= 0 || this.y >= SCREEN_HEIGHT - this.size) {
      this.speedY *= -1;
    }
  }
}

// Ball class to represent falling balls
class Ball {
  id: number;
  x: number;
  y: number;
  color: string;
  isTarget: boolean;

  constructor(id: number, x: number, color: string, isTarget: boolean) {
    this.id = id;
    this.x = x;
    this.y = -BALL_RADIUS * 2;
    this.color = color;
    this.isTarget = isTarget;
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
  const [floatingElements] = useState<FloatingElement[]>(() => 
    Array.from({ length: 15 }, (_, i) => new FloatingElement(i))
  );
  const [basketX, setBasketX] = useState(SCREEN_WIDTH / 2 - BASKET_WIDTH / 2);
  const ballIdCounter = useRef(0);
  const gameInterval = useRef<NodeJS.Timeout | null>(null);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const animationFrame = useRef<number | null>(null);
  const floatingAnimationRef = useRef<number | null>(null);
  const basketRef = useRef<HTMLDivElement>(null);
  const basketXRef = useRef(basketX); // Ref to track basket position in animation loop

  // Update basketXRef when basketX changes
  useEffect(() => {
    basketXRef.current = basketX;
  }, [basketX]);

  // Initialize target color only once when component mounts
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * COLORS.length);
    setTargetColor(COLORS[randomIndex]);
    setTargetColorName(COLOR_NAMES[randomIndex]);
  }, []);

  // Floating elements animation
  useEffect(() => {
    const animateFloatingElements = () => {
      // Update floating elements
      floatingElements.forEach(element => element.update());
      floatingAnimationRef.current = requestAnimationFrame(animateFloatingElements);
    };

    // Start floating elements animation
    floatingAnimationRef.current = requestAnimationFrame(animateFloatingElements);

    // Cleanup
    return () => {
      if (floatingAnimationRef.current) {
        cancelAnimationFrame(floatingAnimationRef.current);
      }
    };
  }, [floatingElements]);

  // Start the game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setMissedBalls(0);
    setBalls([]);
    const initialBasketX = SCREEN_WIDTH / 2 - BASKET_WIDTH / 2;
    setBasketX(initialBasketX);
    basketXRef.current = initialBasketX;
    // Don't reset target color here - it should remain the same as shown on start screen
    
    // Start ball generation
    if (gameInterval.current) clearInterval(gameInterval.current);
    gameInterval.current = setInterval(() => {
      generateBall();
    }, 1000); // Generate a new ball every second
    
    // Start timer
    if (timerInterval.current) clearInterval(timerInterval.current);
    timerInterval.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Start animation loop
    if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    animate();
  };

  // Animation loop
  const animate = () => {
    setBalls(prevBalls => {
      // Move balls down
      const updatedBalls = prevBalls.map(ball => {
        return { ...ball, y: ball.y + 5 };
      });
      
      // Check for collisions with basket during this animation frame
      const basketY = SCREEN_HEIGHT - BASKET_HEIGHT - 50; // 50px from bottom
      const currentBasketX = basketXRef.current;
      
      const ballsToRemove: number[] = [];
      updatedBalls.forEach(ball => {
        // Improved collision detection
        if (
          ball.y + BALL_RADIUS >= basketY && // Ball bottom touches or passes basket top
          ball.y <= basketY + BASKET_HEIGHT && // Ball top is above basket bottom
          ball.x + BALL_RADIUS * 2 >= currentBasketX && // Ball right touches or passes basket left
          ball.x <= currentBasketX + BASKET_WIDTH // Ball left is to the left of basket right
        ) {
          ballsToRemove.push(ball.id);
          
          // Update score based on whether it was the target color
          if (ball.isTarget) {
            setScore(prev => prev + 10);
          } else {
            setScore(prev => Math.max(0, prev - 5)); // Don't go below 0
          }
        }
      });
      
      // Remove balls that have fallen off screen or been caught
      const visibleBalls = updatedBalls.filter(ball => {
        // Check if ball was caught
        if (ballsToRemove.includes(ball.id)) {
          return false;
        }
        // Check if ball has fallen off screen
        return ball.y < SCREEN_HEIGHT + BALL_RADIUS * 2;
      });
      
      // Check for missed target balls
      const removedBalls = updatedBalls.filter(ball => 
        ball.y >= SCREEN_HEIGHT + BALL_RADIUS * 2 && !ballsToRemove.includes(ball.id)
      );
      removedBalls.forEach(ball => {
        if (ball.isTarget) {
          setMissedBalls(prev => {
            const newMissed = prev + 1;
            if (newMissed >= MAX_MISSED_BALLS) {
              endGame();
            }
            return newMissed;
          });
        }
      });
      
      return visibleBalls;
    });
    
    animationFrame.current = requestAnimationFrame(animate);
  };

  // Generate a new falling ball
  const generateBall = () => {
    const isTarget = Math.random() > 0.5; // 50% chance to be target color
    const color = isTarget ? targetColor : COLORS[Math.floor(Math.random() * COLORS.length)];
    const x = Math.random() * (SCREEN_WIDTH - BALL_RADIUS * 2);
    
    ballIdCounter.current += 1;
    const newBall = new Ball(ballIdCounter.current, x, color, isTarget);
    
    setBalls(prev => [...prev, newBall]);
  };

  // Handle mouse movement for basket control
  const handleMouseMove = (e: React.MouseEvent) => {
    if (gameState !== 'playing') return;
    
    const newX = e.clientX - BASKET_WIDTH / 2;
    const boundedX = Math.max(0, Math.min(newX, SCREEN_WIDTH - BASKET_WIDTH));
    setBasketX(boundedX);
  };

  // Handle touch movement for basket control
  const handleTouchMove = (e: React.TouchEvent) => {
    if (gameState !== 'playing') return;
    
    const newX = e.touches[0].clientX - BASKET_WIDTH / 2;
    const boundedX = Math.max(0, Math.min(newX, SCREEN_WIDTH - BASKET_WIDTH));
    setBasketX(boundedX);
  };

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
    
    if (animationFrame.current) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameInterval.current) clearInterval(gameInterval.current);
      if (timerInterval.current) clearInterval(timerInterval.current);
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
      if (floatingAnimationRef.current) cancelAnimationFrame(floatingAnimationRef.current);
    };
  }, []);

  // Render start screen
  const renderStartScreen = () => (
    <div className="screen">
      {/* Floating background elements */}
      {floatingElements.map(element => (
        <div
          key={`floating-${element.id}`}
          className={`floating-element ${element.shape}`}
          style={{
            left: element.x,
            top: element.y,
            width: element.size,
            height: element.size,
            backgroundColor: element.color,
          }}
        />
      ))}
      
      <h1 className="title">Color Catcher</h1>
      <p className="instructions">
        Catch balls of the target color ({targetColorName}) while avoiding others!
      </p>
      <p className="instructions">
        Game ends after {GAME_DURATION} seconds or missing {MAX_MISSED_BALLS} target balls.
      </p>
      <p className="instructions">
        Correct catch: +10 points <br />
        Wrong catch: -5 points
      </p>
      <button className="button" onClick={startGame}>
        PLAY
      </button>
    </div>
  );

  // Render game screen
  const renderGameScreen = () => (
    <div 
      className="screen"
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      {/* Game UI */}
      <div className="gameUI">
        <div className="score">Score: {score}</div>
        <div className="timer">Time: {timeLeft}s</div>
        <div className="missed">Missed: {missedBalls}/{MAX_MISSED_BALLS}</div>
        <div className="target">Target: {targetColorName}</div>
      </div>
      
      {/* Falling balls */}
      {balls.map(ball => (
        <div
          key={ball.id}
          className={`ball ${ball.isTarget ? 'target-ball' : ''}`}
          style={{
            backgroundColor: ball.color,
            left: ball.x,
            top: ball.y,
          }}
        />
      ))}
      
      {/* Player basket */}
      <div
        ref={basketRef}
        className="basket"
        style={{
          left: basketX,
        }}
      />
    </div>
  );

  // Render game over screen
  const renderGameOverScreen = () => (
    <div className="screen">
      {/* Floating background elements */}
      {floatingElements.map(element => (
        <div
          key={`floating-${element.id}`}
          className={`floating-element ${element.shape}`}
          style={{
            left: element.x,
            top: element.y,
            width: element.size,
            height: element.size,
            backgroundColor: element.color,
          }}
        />
      ))}
      
      <h1 className="title">Game Over!</h1>
      <p className="finalScore">Final Score: {score}</p>
      <p className="gameStats">
        Time survived: {GAME_DURATION - timeLeft} seconds <br />
        Balls missed: {missedBalls}
      </p>
      <button className="button" onClick={startGame}>
        PLAY AGAIN
      </button>
    </div>
  );

  // Render appropriate screen based on game state
  return (
    <div className="container">
      {gameState === 'start' && renderStartScreen()}
      {gameState === 'playing' && renderGameScreen()}
      {gameState === 'gameOver' && renderGameOverScreen()}
    </div>
  );
}