const Color = {
  info: 'color: #fff',
  debug: 'color: #0af4f4',
  warn: 'color: #f4f40a',
  error: 'color: red',
} as const;
type IType = keyof (typeof Color);

export const log = (label: string | number, data?: any, type: IType = 'debug' ) => {
  if (data === undefined) {
    console.debug(`\n%c${label}`, Color[type]);
    return;
  }
  try {
    const msg = ['undefined', 'object'].includes(typeof data) ? JSON.stringify(data, null, 2) : data;
    if (typeof msg === 'string') {
      console.debug(`\n%c${label}:\n%s`, Color[type], msg)
    } else {
      console.debug(`\n%c${label}:\n`, Color[type], data);
    }
  } catch(_) {
    console.debug(`\n%c${label}:\n`, Color[type], data);
  }
};

const Color2 = {
  info: '🚀',
  debug: '🔥',
  warn: '⚠️',
  error: '❌',
  success: '✅',
} as const;
type IType2 = keyof (typeof Color2);

export const logIcon = (label: string, data?: any, type: IType2 = 'debug' ) => {
  if (data === undefined) {
    console.log(`\n${Color2[type]} ${label}`);
    return;
  }
  try {
    const msg = ['undefined', 'object'].includes(typeof data) ? JSON.stringify(data, null, 2) : data;
    if (typeof msg === 'string') {
      console.log(`\n${Color2[type]} ${label}:\n%s`, msg);
    } else {
      console.log(`\n${Color2[type]} ${label}:\n`, data);
    }
  } catch (_) {
    console.log(`\n${Color2[type]} ${label}:\n`, data);
  }
};
