"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const maskPhone = (value: string) => {
  if (!value) return "";
  value = value.replace(/\D/g,'');
  value = value.replace(/(\d{2})(\d)/,"($1) $2");
  value = value.replace(/(\d)(\d{4})$/,"$1-$2");
  return value;
};

const unmaskPhone = (value: string) => {
  return value.replace(/\D/g, '');
};

interface MaskedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ className, type, onChange, ...props }, ref) => {
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.target.value = maskPhone(e.target.value);
      if (onChange) {
        onChange(e);
      }
    };
    
    return (
      <Input
        type="tel"
        className={cn(className)}
        onChange={handleInputChange}
        maxLength={15}
        {...props}
        ref={ref}
      />
    );
  }
);
MaskedInput.displayName = "MaskedInput";

export { MaskedInput, unmaskPhone, maskPhone };
