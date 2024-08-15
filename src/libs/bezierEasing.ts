const NEWTON_ITERATIONS: number = 4;
const NEWTON_MIN_SLOPE: number = 0.001;
const SUBDIVISION_PRECISION: number = 0.0000001;
const SUBDIVISION_MAX_ITERATIONS: number = 10;

const kSplineTableSize: number = 11;
const kSampleStepSize: number = 1.0 / (kSplineTableSize - 1.0);

const float32ArraySupported: boolean = typeof Float32Array === 'function';

const A = (aA1: number, aA2: number): number => 1.0 - 3.0 * aA2 + 3.0 * aA1;
const B = (aA1: number, aA2: number): number => 3.0 * aA2 - 6.0 * aA1;
const C = (aA1: number): number => 3.0 * aA1;

const calcBezier = (aT: number, aA1: number, aA2: number): number => ((A(aA1, aA2) * aT + B(aA1, aA2)) * aT + C(aA1)) * aT;
const getSlope = (aT: number, aA1: number, aA2: number): number => 3.0 * A(aA1, aA2) * aT * aT + 2.0 * B(aA1, aA2) * aT + C(aA1);

const binarySubdivide = (aX: number, aA: number, aB: number, mX1: number, mX2: number): number => {
  let currentX, currentT, i = 0;
  do {
    currentT = aA + (aB - aA) / 2.0;
    currentX = calcBezier(currentT, mX1, mX2) - aX;
    if (currentX > 0.0) {
      aB = currentT;
    } else {
      aA = currentT;
    }
  } while (Math.abs(currentX) > SUBDIVISION_PRECISION && ++i < SUBDIVISION_MAX_ITERATIONS);
  return currentT;
};

const newtonRaphsonIterate = (aX: number, aGuessT: number, mX1: number, mX2: number): number => {
  for (let i = 0; i < NEWTON_ITERATIONS; ++i) {
    let currentSlope = getSlope(aGuessT, mX1, mX2);
    if (currentSlope === 0.0) {
      return aGuessT;
    }
    let currentX = calcBezier(aGuessT, mX1, mX2) - aX;
    aGuessT -= currentX / currentSlope;
  }
  return aGuessT;
};

const LinearEasing = (x: number): number => x;

export const bezier = (mX1: number, mY1: number, mX2: number, mY2: number): ((x: number) => number) => {
  if (!(0 <= mX1 && mX1 <= 1 && 0 <= mX2 && mX2 <= 1)) {
    throw new Error('bezier x values must be in [0, 1] range');
  }

  if (mX1 === mY1 && mX2 === mY2) {
    return LinearEasing;
  }

  // Precompute samples table
  const sampleValues = float32ArraySupported ? new Float32Array(kSplineTableSize) : new Array<number>(kSplineTableSize);
  for (let i = 0; i < kSplineTableSize; ++i) {
    sampleValues[i] = calcBezier(i * kSampleStepSize, mX1, mX2);
  }

  const getTForX = (aX: number): number => {
    let currentSample = 1;

    while (currentSample !== kSplineTableSize - 1 && sampleValues[currentSample] <= aX) {
      currentSample++;
    }
    currentSample--;

    // Interpolate to provide an initial guess for t
    let dist = (aX - sampleValues[currentSample]) / (sampleValues[currentSample + 1] - sampleValues[currentSample]);
    let guessForT = currentSample * kSampleStepSize + dist * kSampleStepSize;

    let initialSlope = getSlope(guessForT, mX1, mX2);
    if (initialSlope >= NEWTON_MIN_SLOPE) {
      return newtonRaphsonIterate(aX, guessForT, mX1, mX2);
    } else if (initialSlope === 0.0) {
      return guessForT;
    } else {
      return binarySubdivide(aX, currentSample * kSampleStepSize, (currentSample + 1) * kSampleStepSize, mX1, mX2);
    }
  };

  return (x: number): number => {
    // Because JavaScript numbers are imprecise, we should guarantee the extremes are right.
    if (x === 0 || x === 1) {
      return x;
    }
    return calcBezier(getTForX(x), mY1, mY2);
  };
};
