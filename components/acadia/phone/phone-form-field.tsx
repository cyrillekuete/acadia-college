'use client';

import type { Control, FieldPath, FieldValues } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { PhoneFieldGroup } from '@/components/acadia/phone/phone-field-group';

type PhoneFormFieldsProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  countryName: FieldPath<TFieldValues>;
  phoneName: FieldPath<TFieldValues>;
  required?: boolean;
  countryLabel?: string;
  phoneLabel?: string;
  disabled?: boolean;
  className?: string;
};

export function PhoneFormFields<TFieldValues extends FieldValues>({
  control,
  countryName,
  phoneName,
  required = false,
  countryLabel,
  phoneLabel,
  disabled,
  className,
}: PhoneFormFieldsProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={countryName}
      render={({ field: countryField }) => (
        <FormField
          control={control}
          name={phoneName}
          render={({ field: phoneField }) => (
            <FormItem className={className}>
              <FormControl>
                <PhoneFieldGroup
                  country={countryField.value ?? ''}
                  onCountryChange={countryField.onChange}
                  phone={phoneField.value ?? ''}
                  onPhoneChange={phoneField.onChange}
                  required={required}
                  disabled={disabled}
                  countryLabel={countryLabel}
                  phoneLabel={phoneLabel}
                  countryId={countryField.name}
                  phoneId={phoneField.name}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    />
  );
}
