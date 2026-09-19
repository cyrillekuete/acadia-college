'use client';

import Link from 'next/link';
import { ArrowLeft, Check } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Stepper,
  StepperContent,
  StepperDescription,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from '@/components/ui/stepper';

export type RegistryWizardStep = {
  id: number;
  title: string;
  description: string;
  panelTitle: string;
  panelDescription: string;
};

export type RegistryCreateWizardShellProps = {
  steps: RegistryWizardStep[];
  activeStep: number;
  maxStepReached: number;
  onStepChange: (step: number) => void;
  backHref: string;
  backToListLabel: string;
  stepBackLabel: string;
  cancelLabel: string;
  continueLabel: string;
  submitLabel: string;
  onBack: () => void;
  onContinue: () => void;
  onCancel: () => void;
  isLastStep: boolean;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  children: React.ReactNode;
};

export function RegistryCreateWizardShell({
  steps,
  activeStep,
  maxStepReached,
  onStepChange,
  backHref,
  backToListLabel,
  stepBackLabel,
  cancelLabel,
  continueLabel,
  submitLabel,
  onBack,
  onContinue,
  onCancel,
  isLastStep,
  isSubmitting = false,
  submitDisabled = false,
  children,
}: RegistryCreateWizardShellProps) {
  const current = steps.find((s) => s.id === activeStep) ?? steps[0];

  function handleStepClick(step: number) {
    if (step <= maxStepReached) {
      onStepChange(step);
    }
  }

  return (
    <div className="relative min-h-[calc(100vh-12rem)] rounded-xl bg-muted/30 py-6 lg:py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 bg-[radial-gradient(circle,oklch(1_0_0/0.35)_1px,transparent_1px)] [background-size:12px_12px] opacity-60"
      />

      <div className="relative mb-6">
        <Button asChild variant="ghost" size="sm" className="-ml-2 gap-1.5 text-muted-foreground">
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            {backToListLabel}
          </Link>
        </Button>
      </div>

      <Stepper
        value={activeStep}
        onValueChange={handleStepClick}
        orientation="vertical"
        className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-12"
      >
        <StepperNav className="w-full shrink-0 lg:max-w-[16rem] lg:pt-2">
          {steps.map((step, index) => {
            const isFuture = step.id > maxStepReached;
            return (
              <StepperItem key={step.id} step={step.id} className="not-last:flex-none items-stretch justify-start">
                <StepperTrigger
                  disabled={isFuture}
                  className={cn(
                    'w-full items-start gap-3 rounded-lg px-2 py-3 text-start transition-colors',
                    activeStep === step.id && 'bg-background/80 shadow-sm',
                    isFuture && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <StepperIndicator className="size-8 text-sm font-medium">
                    {step.id < activeStep ? <Check className="size-4" /> : step.id}
                  </StepperIndicator>
                  <div className="flex min-w-0 flex-col gap-1 pt-0.5">
                    <StepperTitle
                      className={cn(
                        'text-sm',
                        activeStep === step.id ? 'font-semibold text-foreground' : 'font-medium',
                      )}
                    >
                      {step.title}
                    </StepperTitle>
                    <StepperDescription className="text-xs leading-snug">{step.description}</StepperDescription>
                  </div>
                </StepperTrigger>
                {index < steps.length - 1 ? (
                  <StepperSeparator className="ms-4 h-6 w-px bg-border group-data-[orientation=vertical]/stepper-nav:ms-4" />
                ) : null}
              </StepperItem>
            );
          })}
        </StepperNav>

        <StepperPanel className="min-w-0 flex-1">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="space-y-1.5 pb-4">
              <CardTitle className="text-xl">{current?.panelTitle}</CardTitle>
              <CardDescription>{current?.panelDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">{children}</CardContent>
            <CardFooter className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
                {cancelLabel}
              </Button>
              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                {activeStep > 1 ? (
                  <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                    {stepBackLabel}
                  </Button>
                ) : null}
                {isLastStep ? (
                  <Button
                    type="submit"
                    className="w-full sm:w-auto active:scale-[0.96] transition-transform"
                    disabled={isSubmitting || submitDisabled}
                  >
                    {submitLabel}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="w-full sm:min-w-[8rem] active:scale-[0.96] transition-transform"
                    onClick={onContinue}
                    disabled={isSubmitting}
                  >
                    {continueLabel}
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </StepperPanel>
      </Stepper>
    </div>
  );
}

export { StepperContent };
