/** SG002 music grid (reference track, measured): beat 0 = the first bass hit after the intro */
export const BEAT = 0.6338;
export const DROP = 5.54;
export const beat = (k: number) => DROP + k * BEAT;
