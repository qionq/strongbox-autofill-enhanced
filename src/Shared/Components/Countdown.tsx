import { CircularProgress } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import { Utils } from '../../Utils';

interface CountdownProps {
  seconds: number;
  onLoop: () => void;
}

const Countdown = (props: CountdownProps) => {
  const { seconds, onLoop } = props;
  const getCycle = () => Math.floor(Date.now() / 1000 / seconds);
  const getRemainingSeconds = () => seconds - ((Date.now() / 1000) % seconds);
  const [count, setCount] = useState(getRemainingSeconds);
  const cycle = useRef(getCycle());
  const onLoopRef = useRef(onLoop);

  useEffect(() => {
    onLoopRef.current = onLoop;
  }, [onLoop]);

  useEffect(() => {
    cycle.current = getCycle();

    const update = () => {
      const nextCycle = getCycle();
      setCount(getRemainingSeconds());

      if (nextCycle !== cycle.current) {
        cycle.current = nextCycle;
        onLoopRef.current();
      }
    };

    update();
    const timerId = setInterval(() => {
      update();
    }, 250);

    return () => clearInterval(timerId);
  }, [seconds]);

  const percentage = Math.max(0, Math.min(100, (count / seconds) * 100));

  return <CircularProgress aria-label="TOTP" size={18} thickness={5} style={{ color: Utils.getEntropyColor(percentage) }} variant="determinate" value={percentage} />;
};

export default Countdown;
