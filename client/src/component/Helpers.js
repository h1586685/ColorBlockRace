import io from 'socket.io-client';
import { useState, useEffect } from 'react';

export const socket = io();

export function setText(id, text) {
  document.getElementById(id).textContent = text;
}

export const windowResolution = {
  getWidth: () => window.innerWidth,
  getHeight: () => window.innerHeight,
  getResolution: () => ({ width: window.innerWidth, height: window.innerHeight }),
  useResolution: () => {
    const [resolution, setResolution] = useState(windowResolution.getResolution());

    useEffect(() => {
      const handleResize = () => {
        setResolution(windowResolution.getResolution());
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, []);

    return resolution;
  }
};

const helper = {
  setText
};

export default helper;
