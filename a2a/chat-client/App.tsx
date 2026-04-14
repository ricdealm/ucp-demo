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
import { useEffect, useRef, useState } from "react";
import ChatInput from "./components/ChatInput";
import ChatMessageComponent from "./components/ChatMessage";
import Header from "./components/Header";
import { appConfig } from "./config";
import { CredentialProviderProxy } from "./mocks/credentialProviderProxy";

import {
  type ChatMessage,
  type PaymentInstrument,
  type Product,
  Sender,
  type Checkout,
  type PaymentHandler,
} from "./types";

type RequestPart =
  | { type: "text"; text: string }
  | { type: "data"; data: Record<string, unknown> };

const themeData = {
  itau: {
    name: "Itaú Shop",
    logoUrl: "/images/itau.png",
  },
  gemini: {
    name: "Gemini",
    logoUrl: "/images/gemini.png",
  },
  mel: {
    name: "Mel Shop",
    logoUrl: "/images/mel_shop.png",
  },
};

function createChatMessage(
  sender: Sender,
  text: string,
  props: Partial<ChatMessage> = {}
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    sender,
    text,
    ...props,
  };
}

const initialMessage: ChatMessage = createChatMessage(
  Sender.MODEL,
  appConfig.defaultMessage,
  { id: "initial" }
);

/**
 * An example A2A chat client that demonstrates consuming a business's A2A Agent with UCP Extension.
 * Only for demo purposes, not intended for production use.
 */
function App() {
  const [user_email, _setUserEmail] = useState<string | null>(
    "foo@example.com"
  );
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [contextId, setContextId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [theme, setTheme] = useState<"itau" | "gemini" | "mel">("itau");
  const credentialProvider = useRef(new CredentialProviderProxy());
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to the bottom when new messages are added
  // biome-ignore lint/correctness/useExhaustiveDependencies: Scroll when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleAddToCheckout = (productToAdd: Product) => {
    const actionPayload = JSON.stringify({
      action: "add_to_checkout",
      product_id: productToAdd.productID,
      quantity: 1,
    });
    handleSendMessage(actionPayload, { isUserAction: true });
  };

  const handleStartPayment = () => {
    const actionPayload = JSON.stringify({ action: "start_payment" });
    handleSendMessage(actionPayload, {
      isUserAction: true,
    });
  };

  const handlePaymentMethodSelection = async (checkout: Checkout) => {
    if (!checkout || !checkout.payment || !checkout.payment.handlers) {
      const errorMessage = createChatMessage(
        Sender.MODEL,
        "Sorry, I couldn't retrieve payment methods."
      );
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    //find the handler with id "example_payment_provider"
    const handler = checkout.payment.handlers.find(
      (handler: PaymentHandler) => handler.id === "itau_payment_provider"
    );
    if (!handler) {
      const errorMessage = createChatMessage(
        Sender.MODEL,
        "Sorry, I couldn't find the supported payment handler."
      );
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    try {
      const paymentResponse =
        await credentialProvider.current.getSupportedPaymentMethods(
          user_email,
          handler.config
        );
      const paymentMethods = paymentResponse.payment_method_aliases;

      const paymentSelectorMessage = createChatMessage(Sender.MODEL, "", {
        paymentMethods,
      });
      setMessages((prev) => [...prev, paymentSelectorMessage]);
    } catch (error) {
      console.error("Failed to resolve mandate:", error);
      const errorMessage = createChatMessage(
        Sender.MODEL,
        "Sorry, I couldn't retrieve payment methods."
      );
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handlePaymentMethodSelected = async (selectedMethod: string) => {
    // Hide the payment selector by removing it from the messages
    setMessages((prev) => prev.filter((msg) => !msg.paymentMethods));

    // Add a temporary user message
    const userActionMessage = createChatMessage(
      Sender.USER,
      `User selected payment method: ${selectedMethod}`,
      { isUserAction: true }
    );
    setMessages((prev) => [...prev, userActionMessage]);

    try {
      if (!user_email) {
        throw new Error("User email is not set.");
      }

      if (selectedMethod === "instr_pix") {
        const pixCode = "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-4266554400005204000053039865802BR5925Ricardo Almeida6009Sao Paulo62070503***6304EB3C";
        const pixMessage = createChatMessage(
          Sender.MODEL,
          `Aqui está o seu código Pix para pagamento:\n\n\`\`\`\n${pixCode}\n\`\`\`\n\n> [!IMPORTANT]\n> O Itaú enviará uma notificação no seu **WhatsApp** para confirmação instantânea. Assim que você aprovar, finalizaremos o seu pedido por aqui automaticamente!`
        );
        setMessages((prev) => [...prev, pixMessage]);
      }

      const paymentInstrument =
        await credentialProvider.current.getPaymentToken(
          user_email,
          selectedMethod
        );

      if (!paymentInstrument || !paymentInstrument.credential) {
        throw new Error("Failed to retrieve payment credential");
      }

      const paymentInstrumentMessage = createChatMessage(Sender.MODEL, "", {
        paymentInstrument,
      });
      setMessages((prev) => [...prev, paymentInstrumentMessage]);
    } catch (error) {
      console.error("Failed to process payment mandate:", error);
      const errorMessage = createChatMessage(
        Sender.MODEL,
        "Sorry, I couldn't process the payment. Please try again."
      );
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleConfirmPayment = async (paymentInstrument: PaymentInstrument) => {
    // Hide the payment confirmation component
    const userActionMessage = createChatMessage(
      Sender.USER,
      `User confirmed payment.`,
      { 
        isUserAction: true,
        auditPayload: {
          action: "complete_checkout",
          source: "UCP Platform",
          destination: "AP2 Agent (Payment Processor)",
          payload: {
            checkout_data: "Active checkout session",
            payment_data: paymentInstrument,
          },
          timestamp: new Date().toISOString()
        }
      }
    );
    // Let handleSendMessage manage the loading indicator
    setMessages((prev) => [
      ...prev.filter((msg) => !msg.paymentInstrument),
      userActionMessage,
    ]);

    try {
      const parts: RequestPart[] = [
        { type: "data", data: { action: "complete_checkout" } },
        {
          type: "data",
          data: {
            "a2a.ucp.checkout.payment_data": paymentInstrument,
            "a2a.ucp.checkout.risk_signals": { data: "some risk data" },
          },
        },
      ];

      await handleSendMessage(parts, {
        isUserAction: true,
      });
    } catch (error) {
      console.error("Error confirming payment:", error);
      const errorMessage = createChatMessage(
        Sender.MODEL,
        "Sorry, there was an issue confirming your payment."
      );
      // If handleSendMessage wasn't called, we might need to manually update state
      // In this case, we remove the loading indicator that handleSendMessage would have added
      setMessages((prev) => [...prev.slice(0, -1), errorMessage]); // This assumes handleSendMessage added a loader
      setIsLoading(false); // Ensure loading is stopped on authorization error
    }
  };

  const handleSendMessage = async (
    messageContent: string | RequestPart[],
    options?: { isUserAction?: boolean; headers?: Record<string, string> }
  ) => {
    if (isLoading) return;

    const userMessage = createChatMessage(
      Sender.USER,
      options?.isUserAction
        ? "<User Action>"
        : typeof messageContent === "string"
          ? messageContent
          : "Sent complex data"
    );
    if (userMessage.text) {
      // Only add if there's text
      setMessages((prev) => [...prev, userMessage]);
    }
    setMessages((prev) => [
      ...prev,
      createChatMessage(Sender.MODEL, "", { isLoading: true }),
    ]);
    setIsLoading(true);

    try {
      const requestParts =
        typeof messageContent === "string"
          ? [{ type: "text", text: messageContent }]
          : messageContent;

      const requestParams: {
        message: {
          role: string;
          parts: RequestPart[];
          messageId: string;
          kind: string;
          contextId?: string;
          taskId?: string;
        };
        configuration: {
          historyLength: number;
        };
      } = {
        message: {
          role: "user",
          parts: requestParts,
          messageId: crypto.randomUUID(),
          kind: "message",
        },
        configuration: {
          historyLength: 0,
        },
      };

      if (contextId) {
        requestParams.message.contextId = contextId;
      }
      if (taskId) {
        requestParams.message.taskId = taskId;
      }

      const defaultHeaders = {
        "Content-Type": "application/json",
        "X-A2A-Extensions":
          "https://ucp.dev/specification/reference?v=2026-01-11",
        "UCP-Agent":
          'profile="http://localhost:3000/profile/agent_profile.json"',
      };

      const response = await fetch("/api", {
        method: "POST",
        headers: { ...defaultHeaders, ...options?.headers },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: crypto.randomUUID(),
          method: "message/send",
          params: requestParams,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data = await response.json();

      // Update context and task IDs from the response for subsequent requests
      if (data.result?.contextId) {
        setContextId(data.result.contextId);
      }
      //if there is a task and it's in one of the active states
      if (
        data.result?.id &&
        data.result?.status?.state in ["working", "submitted", "input-required"]
      ) {
        setTaskId(data.result.id);
      } else {
        //if not reset taskId
        setTaskId(undefined);
      }

      const combinedBotMessage = createChatMessage(Sender.MODEL, "");

      const responseParts =
        data.result?.parts || data.result?.status?.message?.parts || [];

      for (const part of responseParts) {
        if (part.data) {
          if (part.data["a2a.ucp.checkout"]) {
            const checkout = part.data["a2a.ucp.checkout"];
            checkout.ap2 = {
              merchant_authorization: "eyJhbGciOiJFUzI1NiIsImtpZCI6ImtleS0xIn0..U0lHTkFUVVJF",
            };
            
            // Inject CartMandate matching the documentation sample
            combinedBotMessage.cartMandate = {
              contents: {
                id: checkout.id || "cart_shoes_123",
                user_signature_required: false,
                payment_request: {
                  method_data: [
                    {
                      supported_methods: "CARD",
                      data: {
                        payment_processor_url: "http://example.com/pay"
                      }
                    }
                  ],
                  details: {
                    id: checkout.order_id || "order_shoes_123",
                    displayItems: checkout.line_items?.map((item: any) => ({
                      label: `${item.quantity > 1 ? item.quantity + "x " : ""}${item.item?.title || "Item"}`,
                      amount: {
                        currency: checkout.currency || "USD",
                        value: (item.item?.price || 0) * (item.quantity || 1)
                      }
                    })) || [],
                    shipping_options: null,
                    modifiers: null,
                    total: {
                      label: "Total",
                      amount: {
                        currency: checkout.currency || "USD",
                        value: checkout.totals?.find((t: any) => t.type === "grand_total" || t.type === "total")?.amount || 
                               checkout.line_items?.reduce((sum: number, item: any) => sum + (item.item?.price || 0) * (item.quantity || 1), 0) || 0
                      }
                    }
                  },
                  options: {
                    requestPayerName: false,
                    requestPayerEmail: false,
                    requestPayerPhone: false,
                    requestShipping: true,
                    shippingType: null
                  }
                }
              },
              merchant_signature: "sig_merchant_shoes_abc1",
              timestamp: new Date().toISOString()
            };

            if (checkout.status === "completed" || checkout.status === "success") {
              combinedBotMessage.ap2Authorization = {
                status: "authorized",
                transaction_id: `ap2_tx_${Math.random().toString(36).substring(7)}`,
                amount: checkout.totals?.find((t: any) => t.type === "grand_total")?.amount || 0,
                currency: checkout.currency || "USD",
                timestamp: new Date().toISOString(),
              };
            }
          }
          combinedBotMessage.ucpData = {
            ...(combinedBotMessage.ucpData || {}),
            ...part.data,
          };
        }
        if (part.text) {
          // Simple text
          combinedBotMessage.text +=
            (combinedBotMessage.text ? "\n" : "") + part.text;
        } else if (part.data?.["a2a.product_results"]) {
          // Product results
          combinedBotMessage.text +=
            (combinedBotMessage.text ? "\n" : "") +
            (part.data["a2a.product_results"].content || "");
          combinedBotMessage.products =
            part.data["a2a.product_results"].results;
        } else if (part.data?.["a2a.ucp.checkout"]) {
          // Checkout
          combinedBotMessage.checkout = part.data["a2a.ucp.checkout"];
        }
      }

      const newMessages: ChatMessage[] = [];
      const hasContent =
        combinedBotMessage.text ||
        combinedBotMessage.products ||
        combinedBotMessage.checkout;
      if (hasContent) {
        newMessages.push(combinedBotMessage);
      }

      if (newMessages.length > 0) {
        setMessages((prev) => [...prev.slice(0, -1), ...newMessages]);
      } else {
        const fallbackResponse =
          "Sorry, I received a response I couldn't understand.";
        setMessages((prev) => [
          ...prev.slice(0, -1),
          createChatMessage(Sender.MODEL, fallbackResponse),
        ]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = createChatMessage(
        Sender.MODEL,
        "Sorry, something went wrong. Please try again."
      );
      // Replace the placeholder with the error message
      setMessages((prev) => [...prev.slice(0, -1), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const lastCheckoutIndex = messages.map((m) => !!m.checkout).lastIndexOf(true);

  return (
    <div className="flex h-screen max-h-screen bg-gray-100 font-sans p-4 gap-4">
      {/* Left Column: Phone Simulator Wrapper */}
      <div className="w-[40%] flex flex-col justify-center items-center p-4 gap-6">
        {/* Theme Selector Buttons */}
        <div className="flex gap-4 mb-2">
          <button 
            onClick={() => setTheme('itau')} 
            className={`w-12 h-12 rounded-full overflow-hidden border-2 ${theme === 'itau' ? 'border-orange-500' : 'border-transparent'} hover:border-orange-500 transition-all`}
            title="Itaú"
          >
            <img src="/images/itau.png" alt="Itaú" className="w-full h-full object-cover" />
          </button>
          <button 
            onClick={() => setTheme('gemini')} 
            className={`w-12 h-12 rounded-full overflow-hidden border-2 ${theme === 'gemini' ? 'border-blue-500' : 'border-transparent'} hover:border-blue-500 transition-all`}
            title="Gemini"
          >
            <img src="/images/gemini.png" alt="Gemini" className="w-full h-full object-cover" />
          </button>
          <button 
            onClick={() => setTheme('mel')} 
            className={`w-12 h-12 rounded-full overflow-hidden border-2 ${theme === 'mel' ? 'border-yellow-500' : 'border-transparent'} hover:border-yellow-500 transition-all`}
            title="Mel Shop"
          >
            <img src="/images/mel_shop.png" alt="Mel Shop" className="w-full h-full object-cover" />
          </button>
        </div>

        {/* Phone Simulator */}
        <div 
          className={`flex-shrink-0 w-[375px] h-[812px] ${theme === 'gemini' ? 'bg-[#131314]' : 'bg-white'} rounded-[40px] shadow-2xl border-[14px] border-black overflow-hidden relative flex flex-col font-['Manrope']`}
          style={{
            '--primary-color': theme === 'itau' ? '#ff6f00' : theme === 'gemini' ? '#1a73e8' : '#fbc02d',
            '--primary-hover': theme === 'itau' ? '#e66200' : theme === 'gemini' ? '#1557b0' : '#f57f17',
            '--bg-light': theme === 'itau' ? '#ffedd5' : theme === 'gemini' ? '#dbeafe' : '#fef08a',
            '--text-dark': theme === 'itau' ? '#c2410c' : theme === 'gemini' ? '#1d4ed8' : '#a16207',
          } as React.CSSProperties}
        >
          {/* Speaker/Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-black rounded-b-3xl z-20"></div>
          
          {/* Phone Content */}
          <div className={`flex flex-col h-full pt-6 ${theme === 'gemini' ? 'bg-[#131314]' : ''}`}>
            {theme === 'gemini' ? (
              <div className="p-4 flex justify-between items-center bg-[#131314] border-b border-gray-800 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <img src="/images/gemini.png" alt="Gemini" className="w-6 h-6" />
                  <span className="font-bold text-white">Gemini <span className="text-gray-400 text-sm font-normal">3 Pro</span></span>
                  <span className="material-symbols-outlined text-gray-400 text-sm">expand_more</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-gray-400">work</span>
                  <span className="bg-[#2f3032] text-white text-xs px-2 py-1 rounded-md font-bold">PRO</span>
                  <div className="w-8 h-8 rounded-full bg-gray-600 overflow-hidden flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-2xl">account_circle</span>
                  </div>
                </div>
              </div>
            ) : (
              <Header logoUrl={themeData[theme].logoUrl} title={themeData[theme].name} />
            )}
            
            <main
              ref={chatContainerRef}
              className="flex-grow overflow-y-auto p-4 space-y-2"
            >
              {messages.map((msg, index) => (
                <ChatMessageComponent
                  key={msg.id}
                  message={msg}
                  onAddToCart={handleAddToCheckout}
                  onCheckout={
                    msg.checkout?.status !== "ready_for_complete"
                      ? handleStartPayment
                      : undefined
                  }
                  onSelectPaymentMethod={handlePaymentMethodSelected}
                  onConfirmPayment={handleConfirmPayment}
                  onCompletePayment={
                    msg.checkout?.status === "ready_for_complete"
                      ? handlePaymentMethodSelection
                      : undefined
                  }
                  isLastCheckout={index === lastCheckoutIndex}
                  agentName={themeData[theme].name}
                  agentLogoUrl={themeData[theme].logoUrl}
                  theme={theme}
                ></ChatMessageComponent>
              ))}
            </main>
            
            <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} theme={theme} />
            
            {/* Bottom Navigation */}
            {theme !== 'gemini' && (
              <nav className="w-full flex justify-around items-center px-4 py-3 border-t border-neutral-100 bg-white flex-shrink-0">
                <a className="flex flex-col items-center justify-center bg-[var(--bg-light)] text-[var(--text-dark)] rounded-2xl px-3 py-1" href="#">
                  <span className="material-symbols-outlined">chat_bubble</span>
                  <span className="text-[10px] font-bold tracking-widest uppercase mt-1">Chat</span>
                </a>
                <a className="flex flex-col items-center justify-center text-neutral-500 px-3 py-1 hover:text-[var(--primary-color)] transition-all" href="#">
                  <span className="material-symbols-outlined">search</span>
                  <span className="text-[10px] font-bold tracking-widest uppercase mt-1">Explore</span>
                </a>
                <a className="flex flex-col items-center justify-center text-neutral-500 px-3 py-1 hover:text-[var(--primary-color)] transition-all" href="#">
                  <span className="material-symbols-outlined">local_mall</span>
                  <span className="text-[10px] font-bold tracking-widest uppercase mt-1">Orders</span>
                </a>
                <a className="flex flex-col items-center justify-center text-neutral-500 px-3 py-1 hover:text-[var(--primary-color)] transition-all" href="#">
                  <span className="material-symbols-outlined">person</span>
                  <span className="text-[10px] font-bold tracking-widest uppercase mt-1">Profile</span>
                </a>
              </nav>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Details Panel */}
      <div className="w-[60%] bg-white rounded-xl shadow-lg p-6 overflow-y-auto hidden lg:block">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Behind-the-Scenes Pipeline & Execution Logs</h2>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className="border rounded-lg p-4 bg-gray-50 shadow-sm">
              {msg.sender === Sender.USER ? (
                <div>
                  <div className="font-semibold text-xs text-gray-500 uppercase tracking-wider">
                    CLIENT INPUT RECEIVED
                  </div>
                  <div className="mt-1 text-sm text-gray-800">
                    {msg.text}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="font-semibold text-xs text-gray-500 uppercase tracking-wider">
                    BACKEND EXECUTION
                  </div>
                  <div className="mt-1 text-sm text-gray-800">
                    {msg.text || "<Action without text>"}
                  </div>
                  {msg.ucpData && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-800 uppercase tracking-wider">
                        VIEW UCP PAYLOAD
                      </summary>
                      <pre className="bg-white p-2 border rounded mt-1 overflow-x-auto max-h-60 font-mono text-gray-700">
                        {JSON.stringify(msg.ucpData, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
