import { roundMoney } from '../../domain/money';

export const DEFAULT_BASE_FEE = 3500.0;
export const DEFAULT_DELIVERY_FEE = 10000.0;
export const DEFAULT_CURRENCY = 'COP';

export const FEES_CONFIG = Symbol('FEES_CONFIG');

export type FeesConfig = {
  baseFee: number;
  deliveryFee: number;
  currency: string;
};

export function resolveFeesConfig(
  env: NodeJS.ProcessEnv = process.env,
): FeesConfig {
  const baseFee = roundMoney(Number(env.BASE_FEE ?? DEFAULT_BASE_FEE));
  const deliveryFee = roundMoney(
    Number(env.DELIVERY_FEE ?? DEFAULT_DELIVERY_FEE),
  );
  const currency = env.CURRENCY?.trim() || DEFAULT_CURRENCY;

  if (Number.isNaN(baseFee) || baseFee < 0) {
    throw new Error('BASE_FEE must be a non-negative number');
  }
  if (Number.isNaN(deliveryFee) || deliveryFee < 0) {
    throw new Error('DELIVERY_FEE must be a non-negative number');
  }

  return { baseFee, deliveryFee, currency };
}

export function feesConfigProvider() {
  return {
    provide: FEES_CONFIG,
    useFactory: (): FeesConfig => resolveFeesConfig(),
  };
}
