import { create } from 'zustand'

interface IState {
  bears: number
  // increase: (by: number) => void
}

const useBearStore = create<IState>((set) => ({
  bears: 0,
  // increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  // removeAllBears: () => set({ bears: 0 }),
}))
