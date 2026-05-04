import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const Cursor = () => {
  const cursorRef = useRef(null);
  const cursorFollowerRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const cursor = cursorRef.current;
    const cursorFollower = cursorFollowerRef.current;

    const moveCursor = (e) => {
      if (cursor && cursorFollower) {
        const x = e.clientX;
        const y = e.clientY;
        
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';

        setTimeout(() => {
          cursorFollower.style.left = x + 'px';
          cursorFollower.style.top = y + 'px';
        }, 100);
      }
    };

    const handleMouseEnter = () => {
      setIsHovering(true);
    };

    const handleMouseLeave = () => {
      setIsHovering(false);
    };

    document.addEventListener('mousemove', moveCursor);

    const interactiveElements = document.querySelectorAll('a, button, input, textarea, select, [role="button"]');
    interactiveElements.forEach((el) => {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    });

    return () => {
      document.removeEventListener('mousemove', moveCursor);
      interactiveElements.forEach((el) => {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      });
    };
  }, []);

  return (
    <>
      <motion.div
        ref={cursorRef}
        className={`fixed pointer-events-none z-[9999] transition-all duration-200 ${
          isHovering ? 'scale-150' : 'scale-100'
        }`}
        style={{ 
          left: 0, 
          top: 0,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-6 h-6 flex items-center justify-center">
          <div className={`w-4 h-4 bg-cosmic-purple rounded-full transition-all duration-200 ${
            isHovering ? 'scale-75' : 'scale-100'
          }`} />
        </div>
      </motion.div>
      <motion.div
        ref={cursorFollowerRef}
        className={`fixed pointer-events-none z-[9998] transition-all duration-500 ${
          isHovering ? 'scale-150 opacity-50' : 'scale-100 opacity-100'
        }`}
        style={{ 
          left: 0, 
          top: 0,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div className="w-10 h-10 border-2 border-cosmic-purple/40 rounded-full" />
      </motion.div>
    </>
  );
};

export default Cursor;

