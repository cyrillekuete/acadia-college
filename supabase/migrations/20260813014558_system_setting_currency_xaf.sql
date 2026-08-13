-- Default SystemSetting currency to XAF (Cameroon CFA franc).

ALTER TABLE public."SystemSetting"
  ALTER COLUMN currency SET DEFAULT 'XAF';

ALTER TABLE public."SystemSetting"
  ALTER COLUMN "currencyFormat" SET DEFAULT '{value} FCFA';

UPDATE public."SystemSetting"
SET
  currency = 'XAF',
  "currencyFormat" = '{value} FCFA'
WHERE currency IN ('USD', 'XOF')
   OR "currencyFormat" LIKE '$%';
