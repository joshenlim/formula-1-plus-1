import { proxy, snapshot, useSnapshot } from "valtio";

export type Operator = 'add' | 'subtract' | 'multiply' | 'divide'
export const store = proxy({
  status: 'idle' as 'idle' | 'start' | 'end',
  duration: 30000,
  digits: 2 as number,
  operators: ['add'] as Operator[],

  setStatus: (value: 'idle' | 'start' | 'end') => store.status = value,
  setDigits: (value: number) => store.digits = value,
  setOperators: (values: Operator[]) => store.operators = values,

  get difficulty() {
    const hasMultiply = this.operators.includes('multiply')
    const hasDivision = this.operators.includes('divide')
    const maxScore = 18
    const weight = (this.digits * 2) + this.operators.length + (hasMultiply ? 3 : 0) + (hasDivision ? 5 : 0)
    return weight / maxScore
  }
})

export const getStoreSnapshot = () => snapshot(store)
export const useStoreSnapshot = (options?: Parameters<typeof useSnapshot>[1]) =>
  useSnapshot(store, options)