/*
 * Copyright 2026 UCP Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type React from "react";
import { useState } from "react";
import type { PaymentMethod } from "../types";

interface PaymentMethodSelectorProps {
  paymentMethods: PaymentMethod[];
  onSelect: (selectedMethod: string) => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethods,
  onSelect,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedSubMethod, setSelectedSubMethod] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedMethod === "instr_itau" && !selectedSubMethod) {
      alert("Por favor, selecione a bandeira do cartão.");
      return;
    }
    onSelect(selectedSubMethod || selectedMethod || "");
  };

  return (
    <div className="max-w-md bg-white rounded-lg shadow-lg p-4 border border-gray-200">
      <h3 className="text-lg font-bold text-gray-800 mb-3">
        Select a Payment Method
      </h3>
      <div className="space-y-2 mb-4">
        {paymentMethods.map((method) => (
          <div key={method.id} className="border rounded-md p-2">
            <label
              className="flex items-center cursor-pointer"
            >
              <input
                type="radio"
                name="paymentMethod"
                value={method.id}
                checked={selectedMethod === method.id}
                onChange={() => setSelectedMethod(method.id)}
                className="form-radio h-4 w-4 text-[#EC7000]"
              />
              <span className="ml-3 text-gray-700 flex items-center gap-2 flex-1">
                {method.brand === "itau" && (
                  <img src="https://www.itau.com.br/media/dam/m/3728062fc365b51b/original/Section-4_Image-with-text.png" alt="Itaú" className="w-6 h-6 object-contain" />
                )}
                {method.brand === "pix" && (
                  <img src="https://img.icons8.com/color/512/pix.png" alt="Pix" className="w-6 h-6" />
                )}
                {method.brand === "itau" ? "Itaú" :
                 method.brand === "pix" ? "Pix" :
                 `${method.brand.toUpperCase()} ending in ${method.last_digits}`}
              </span>
            </label>
            
            {method.brand === "itau" && selectedMethod === method.id && (
              <div className="ml-6 mt-2 space-y-2 border-t pt-2">
                <p className="text-xs text-gray-500 mb-1">Selecione a bandeira:</p>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="subMethod"
                    value="itau_visa"
                    checked={selectedSubMethod === "itau_visa"}
                    onChange={() => setSelectedSubMethod("itau_visa")}
                    className="form-radio h-3 w-3 text-[#EC7000]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Visa final 4321</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="subMethod"
                    value="itau_mastercard"
                    checked={selectedSubMethod === "itau_mastercard"}
                    onChange={() => setSelectedSubMethod("itau_mastercard")}
                    className="form-radio h-3 w-3 text-[#EC7000]"
                  />
                  <span className="ml-2 text-sm text-gray-700">Mastercard final 8765</span>
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleContinue}
        disabled={!selectedMethod || (selectedMethod === "instr_itau" && !selectedSubMethod)}
        className="block w-full text-center bg-[#EC7000] text-white py-2 rounded-md hover:bg-[#D46000] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
      >
        Continuar
      </button>
    </div>
  );
};

export default PaymentMethodSelector;
