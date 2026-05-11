import React from 'react';

export type PenCursorState = 'idle' | 'writing' | 'lifting';

interface PenCursorProps {
  x: number;
  y: number;
  state: PenCursorState;
  transitionMs?: number;
  idleDurationMs?: number;
  disableIdleFloat?: boolean;
}

export const PenCursor: React.FC<PenCursorProps> = ({
  x,
  y,
  state,
  transitionMs = 90,
  idleDurationMs = 2400,
  disableIdleFloat = false,
}) => (
  <div
    className={`pen-cursor pen-cursor-${state} ${disableIdleFloat ? 'pen-cursor-no-float' : ''}`}
    style={{
      transform: `translate3d(${x}px, ${y}px, 0)`,
      transition: `transform ${transitionMs}ms ease-out, opacity 160ms ease-out`,
    }}
    aria-hidden="true"
  >
    <div className="pen-cursor-body" style={{ animationDuration: `${idleDurationMs}ms` }}>
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <g transform="rotate(-45 14 14)">
          <path
            d="M8 6.8C8 5.806 8.806 5 9.8 5H18.8C19.794 5 20.6 5.806 20.6 6.8V18.6H8V6.8Z"
            fill="#4B3428"
          />
          <path
            d="M10 4.6H18.6C19.9255 4.6 21 5.67452 21 7V9H7.6V7C7.6 5.67452 8.67452 4.6 10 4.6Z"
            fill="#5B4030"
          />
          <path
            d="M8 18.6H20.6L16.2 23.4C15.0617 24.641 13.1383 24.641 12 23.4L8 18.6Z"
            fill="#B7BCC3"
          />
          <path
            d="M11 18.6H17.4L14.2 24.1L11 18.6Z"
            fill="#DDE2E8"
          />
          <path
            d="M13.4 22.4L14.2 24.1L15 22.4H13.4Z"
            fill="#5C6168"
          />
        </g>
      </svg>
    </div>
  </div>
);
