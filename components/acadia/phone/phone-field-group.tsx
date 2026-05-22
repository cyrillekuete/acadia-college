'use client';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountryCombobox } from '@/components/acadia/location/country-combobox';
import { DEFAULT_COUNTRY_NAME } from '@/lib/acadia/countries';
import {
  getDialCodeForCountryName,
  getPhonePlaceholder,
} from '@/lib/acadia/phone';

type PhoneFieldGroupProps = {
  country: string;
  onCountryChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  disabled?: boolean;
  countryLabel?: string;
  phoneLabel?: string;
  required?: boolean;
  className?: string;
  countryId?: string;
  phoneId?: string;
  hideCountry?: boolean;
};

function stripToNationalDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function PhoneFieldGroup({
  country,
  onCountryChange,
  phone,
  onPhoneChange,
  disabled,
  countryLabel = 'Country',
  phoneLabel = 'Phone',
  required = false,
  className,
  countryId,
  phoneId,
  hideCountry = false,
}: PhoneFieldGroupProps) {
  const resolvedCountry = country.trim() || DEFAULT_COUNTRY_NAME;
  const dialCode = getDialCodeForCountryName(resolvedCountry);
  const placeholder = getPhonePlaceholder(resolvedCountry);

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {!hideCountry ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={countryId}>
            {countryLabel}
            {required ? <span className="text-destructive"> *</span> : null}
          </Label>
          <CountryCombobox
            value={resolvedCountry}
            onValueChange={onCountryChange}
            disabled={disabled}
            className="w-full"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor={phoneId}>
          {phoneLabel}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
        <div className="flex w-full items-center gap-2">
          <span className="inline-flex h-10 shrink-0 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
            {dialCode}
          </span>
          <Input
            id={phoneId}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            className="min-w-0 flex-1"
            placeholder={placeholder}
            disabled={disabled}
            value={phone}
            onChange={(event) => {
              onPhoneChange(stripToNationalDigits(event.target.value));
            }}
          />
        </div>
      </div>
    </div>
  );
}
