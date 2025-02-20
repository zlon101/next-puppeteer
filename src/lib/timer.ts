export function setInterval2(cb: () => any, t: number) {
  let timeId: ReturnType<typeof setTimeout>
  let run = true

  const repeat = () => {
    timeId = setTimeout(() => {
      cb()
      run && repeat()
    }, t)
  }

  repeat();
  return () => {
    run = false;
    clearTimeout(timeId);
  }
}
