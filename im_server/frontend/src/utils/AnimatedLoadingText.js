import React, { useState, useEffect } from 'react';

const AnimatedLoadingText = (content) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prevDots => {
        if (prevDots.length >= 3) return '';
        return prevDots + '.';
      });
    }, 500); // Change dot every 500ms

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-container">
      <span className="loading-text">
        Currently forming a group of agents for you
        <span className="loading-dots">{dots}</span>
      </span>
    </div>
  );
};

export default AnimatedLoadingText;