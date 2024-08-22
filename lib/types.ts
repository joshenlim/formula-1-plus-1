export type OpMistakes = {
  add: number;
  subtract: number;
  multiply: number;
  divide: number;
};

export type GameResults = {
  correct: number;
  wrong: number;
  times: number[];
  mistakes: OpMistakes;
};

export type Question = {
  number1: number,
  number2: number,
  operator: string
}