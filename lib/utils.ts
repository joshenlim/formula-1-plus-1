import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { OPERATORS } from "./constants";
import { Operator } from "./store";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getOpSymbol = (op: string) => {
  if (op === "add") return OPERATORS[0];
  else if (op === "subtract") return OPERATORS[1];
  else if (op === "multiply") return OPERATORS[2];
  else return OPERATORS[3];
};

export const uuidv4 = () => {
  const uuid = new Array(36);
  for (let i = 0; i < 36; i++) {
    uuid[i] = Math.floor(Math.random() * 16);
  }
  uuid[14] = 4; // set bits 12-15 of time-high-and-version to 0100
  uuid[19] = uuid[19] &= ~(1 << 2); // set bit 6 of clock-seq-and-reserved to zero
  uuid[19] = uuid[19] |= (1 << 3); // set bit 7 of clock-seq-and-reserved to one
  uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
  return uuid.map((x) => x.toString(16)).join('');
}

export const generateRandomNumber = (digits: number) => {
  const floor = digits === 3 ? 100 : digits === 2 ? 10 : 1;
  const ceiling = digits === 3 ? 900 : digits === 2 ? 90 : 9;
  return Math.floor(Math.random() * ceiling + floor);
};

export const generateRandomOperator = (operators: Operator[]) => {
  const idx = Math.floor(Math.random() * operators.length);
  return operators[idx]
}

export const generateQuestionSet = ({ qty, digits, operators }: { qty: number, digits: number, operators: Operator[] }) => {
  return new Array(qty).fill(0).map(() => {
    return { 
      number1: generateRandomNumber(digits), 
      number2: generateRandomNumber(digits), 
      operator: generateRandomOperator(operators)
    }
  })
}

export const randomInRange = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
}